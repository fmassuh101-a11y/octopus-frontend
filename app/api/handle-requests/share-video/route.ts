import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };

// El creador comparte el link de UN video puntual para UN contrato. La
// empresa SOLO va a poder ver los videos que pasen por acá — nunca un link
// que arme por su cuenta copiándolo del perfil público del creador (ver
// ADD_CONTRACT_VIDEO_SHARES_2026-07-22.sql).
//
// Verificación real, no de confianza: se le pide el video a TikTok con el
// access token de la cuenta CONECTADA (verificada por OAuth) del creador —
// la propia API de TikTok confirma que el video le pertenece a esa cuenta
// (docs: "verifies that the videos belong to the user"). Si no es de
// ninguna de sus cuentas conectadas, TikTok no devuelve el video y se
// rechaza el pedido — no hace falta ninguna verificación propia más
// complicada.

function findVideoId(url: string): string | null {
  // TikTok también tiene posts de fotos/carrusel — usan /photo/ en vez de
  // /video/ en el link, mismo formato de ID atrás. Encontrado probando con
  // un link real de Felipe que resolvía justo a un post de fotos.
  const m = String(url || "").match(/\/(?:video|photo)\/(\d+)/);
  return m ? m[1] : null;
}

// TikTok tiene DOS formatos de link: el largo (tiktok.com/@usuario/video/123)
// que sí trae el número del video en la URL, y el corto que da el botón
// "Compartir" de la app (vt.tiktok.com/xxxx o tiktok.com/t/xxxx) — ese NO
// trae el número, hay que abrirlo primero para ver a qué video real
// termina apuntando. Es el que la mayoría de la gente copia sin darse
// cuenta, así que hay que aceptarlo igual, no solo el largo.
async function resolveVideoId(url: string): Promise<string | null> {
  const direct = findVideoId(url);
  if (direct) return direct;
  if (!/tiktok\.com/i.test(url)) return null;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return findVideoId(res.url);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 15 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  const { contractId, videoUrl } = await request.json().catch(() => ({}));
  if (!contractId || !videoUrl) {
    return NextResponse.json({ error: "Falta el contrato o el link" }, { status: 400 });
  }

  const videoId = await resolveVideoId(videoUrl);
  if (!videoId) {
    return NextResponse.json({ error: "Ese link no parece un video de TikTok. Copia el link desde el botón Compartir de la app." }, { status: 400 });
  }

  // El contrato tiene que ser del creador que pide esto.
  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}&select=id,creator_id,company_id,title`, { headers: H });
  const [contract] = cRes.ok ? await cRes.json() : [];
  if (!contract || contract.creator_id !== user.id) {
    return NextResponse.json({ error: "No autorizado para este contrato" }, { status: 403 });
  }

  // profiles.id ≠ user.id — el que coincide con auth.uid() es profiles.user_id.
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=bio`, { headers: H });
  const [profile] = profRes.ok ? await profRes.json() : [];
  let bio: any = profile?.bio;
  if (typeof bio === "string") { try { bio = JSON.parse(bio); } catch { bio = {}; } }
  const accounts: any[] = Array.isArray(bio?.tiktokAccounts) ? bio.tiktokAccounts : [];
  if (accounts.length === 0) {
    return NextResponse.json({ error: "No tienes ninguna cuenta de TikTok conectada" }, { status: 400 });
  }

  // Se prueba con cada cuenta conectada hasta que TikTok confirme que el
  // video le pertenece a esa cuenta.
  let videoData: any = null;
  let matchedUsername = "";
  for (const acc of accounts) {
    if (!acc?.accessToken) continue;
    try {
      const tikRes = await fetch(
        "https://open.tiktokapis.com/v2/video/query/?fields=id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${acc.accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ filters: { video_ids: [videoId] } }),
        }
      );
      const tikData = await tikRes.json().catch(() => null);
      const found = tikData?.data?.videos?.[0];
      if (found) {
        videoData = found;
        matchedUsername = acc.username;
        break;
      }
      // Se deja registrado el motivo real (sin exponerlo al creador) — para
      // no tener que adivinar si vuelve a fallar: puede ser que el video no
      // sea de esa cuenta, o un problema real de la API (permiso, formato).
      console.error("[share-video] TikTok no devolvió el video para", acc.username, "videoId:", videoId, JSON.stringify(tikData)?.slice(0, 300));
    } catch (e: any) {
      console.error("[share-video] error consultando TikTok:", e?.message);
    }
  }

  if (!videoData) {
    return NextResponse.json({
      error: "No pudimos confirmar ese video contra tus cuentas conectadas. Si es un video normal (no una foto/carrusel), prueba con otro. Si el problema sigue, avísale al equipo.",
    }, { status: 403 });
  }

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/contract_video_shares`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      contract_id: contractId,
      creator_id: user.id,
      platform: "tiktok",
      video_url: videoUrl,
      video_id: videoId,
      account_username: matchedUsername,
      stats: {
        title: videoData.title,
        thumbnail: videoData.cover_image_url,
        views: videoData.view_count || 0,
        likes: videoData.like_count || 0,
        comments: videoData.comment_count || 0,
        shares: videoData.share_count || 0,
      },
      stats_fetched_at: new Date().toISOString(),
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text().catch(() => "");
    console.error("[share-video] insert error:", insertRes.status, errText);
    return NextResponse.json({ error: "No se pudo guardar el video compartido" }, { status: 500 });
  }

  // Avisar a la empresa por chat — sin link a otra página, mismo criterio
  // que el resto de los avisos de contrato.
  const authHeader = request.headers.get("authorization") || "";
  fetch(`${request.nextUrl.origin}/api/whop/dm/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ userId: contract.company_id, content: `El creador compartió un video nuevo para "${contract.title}". Ya puedes verlo en Analytics.` }),
  }).catch(() => {});

  const [saved] = await insertRes.json();
  return NextResponse.json({ ok: true, share: saved });
}
