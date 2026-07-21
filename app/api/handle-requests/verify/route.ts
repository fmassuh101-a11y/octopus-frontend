import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// El creador NO se re-autentica con cada contrato — conecta cada red UNA
// vez en su perfil (OAuth), y acá solo se compara el handle que escribió
// para ESTE contrato contra la cuenta que tiene conectada de verdad. Así
// evitamos pedirle que inicie sesión en TikTok/IG/YT una y otra vez, y de
// paso queda una señal de fraude gratis: si alguien escribe un handle que
// no es el de su cuenta conectada, se marca "mismatch" en vez de "verified".
const norm = (h: string) => String(h || "").trim().toLowerCase().replace(/^@/, "");

function connectedUsername(bio: any, platform: string): string | null {
  if (platform === "tiktok") return bio?.tiktokAccounts?.[0]?.username || null;
  if (platform === "instagram") return bio?.instagramAccounts?.[0]?.username || null;
  if (platform === "youtube") return bio?.youtubeAccounts?.[0]?.username || null;
  return null;
}

/**
 * POST /api/handle-requests/verify { applicationId }
 * Solo corre si la empresa ya aprobó los handles (company_approved_at). Para
 * cada plataforma que el creador escribió, compara contra su cuenta
 * conectada: verified (coincide), mismatch (no coincide) o not_connected
 * (todavía no conectó esa red en su perfil).
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  const { applicationId } = await request.json().catch(() => ({}));
  if (!applicationId) return NextResponse.json({ error: "Falta applicationId" }, { status: 400 });

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };

  const hrRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?application_id=eq.${applicationId}&select=*`, { headers: H });
  const handleRequest = (hrRes.ok ? await hrRes.json() : [])[0];
  if (!handleRequest) return NextResponse.json({ error: "No hay handles enviados para este contrato" }, { status: 404 });

  // dueño real de la solicitud (para que nadie verifique handles ajenos)
  const appRes = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}&select=creator_id`, { headers: H });
  const application = (appRes.ok ? await appRes.json() : [])[0];
  if (!application || application.creator_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!handleRequest.company_approved_at) {
    return NextResponse.json({ error: "La empresa todavía no aprobó estos handles" }, { status: 409 });
  }

  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=bio`, { headers: H });
  const profile = (profRes.ok ? await profRes.json() : [])[0];
  let bio = profile?.bio;
  if (typeof bio === "string") { try { bio = JSON.parse(bio); } catch { bio = {}; } }

  const now = new Date().toISOString();
  const results: Array<{ platform: string; handle: string; result: "verified" | "mismatch" | "not_connected" }> = [];

  const updatedHandles = (Array.isArray(handleRequest.handles) ? handleRequest.handles : []).map((h: any) => {
    const connected = connectedUsername(bio, h.platform);
    if (!connected) {
      results.push({ platform: h.platform, handle: h.handle, result: "not_connected" });
      return h;
    }
    const matches = norm(connected) === norm(h.handle);
    results.push({ platform: h.platform, handle: h.handle, result: matches ? "verified" : "mismatch" });
    return matches
      ? { ...h, verified: true, verified_at: now, connected_username: connected }
      : { ...h, verified: false, connected_username: connected };
  });

  const allVerified = updatedHandles.length > 0 && updatedHandles.every((h: any) => h.verified);

  await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${handleRequest.id}`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({
      handles: updatedHandles,
      status: allVerified ? "verified" : handleRequest.status,
      verified_at: allVerified ? now : handleRequest.verified_at,
    }),
  });

  return NextResponse.json({ ok: true, allVerified, results });
}
