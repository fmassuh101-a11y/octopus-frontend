import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// El creador NO se re-autentica con cada contrato — conecta cada cuenta UNA
// vez en su perfil (OAuth) y desde ahí queda disponible para cualquier
// contrato futuro. Un creador (o una agencia manejando varias cuentas)
// puede tener MÁS DE UNA cuenta conectada por plataforma — no todas van a
// ser su cuenta "personal", pueden ser cuentas armadas para una campaña
// puntual. Por eso NO exigimos que el handle coincida con una única cuenta
// "verdadera": alcanza con que esté entre TODAS las que tiene conectadas.
// Si todavía no conectó ESA cuenta en particular, no es una señal de fraude
// — simplemente le falta conectarla antes de poder cobrar por ese trabajo.
const norm = (h: string) => String(h || "").trim().toLowerCase().replace(/^@/, "");

function connectedUsernames(bio: any, platform: string): string[] {
  const key = platform === "tiktok" ? "tiktokAccounts" : platform === "instagram" ? "instagramAccounts" : platform === "youtube" ? "youtubeAccounts" : null;
  if (!key || !Array.isArray(bio?.[key])) return [];
  return bio[key].map((a: any) => a.username).filter(Boolean);
}

const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };

/**
 * POST /api/handle-requests/verify { applicationId? }
 * Solo procesa solicitudes que la empresa ya aprobó (company_approved_at).
 * Sin applicationId: verifica TODAS las solicitudes pendientes del creador
 * autenticado (se usa apenas conecta una cuenta nueva, para que se verifique
 * sola sin un paso manual aparte). Con applicationId: solo esa una.
 * Para cada plataforma que el creador escribió, revisa si ese handle está
 * entre TODAS sus cuentas conectadas: verified o not_connected (todavía no
 * conectó esa cuenta puntual — no implica que sea falsa).
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  const { applicationId } = await request.json().catch(() => ({}));

  // 1. Traer las solicitudes a procesar — todas las del creador con
  // company_approved_at ya seteado, o solo una si vino applicationId.
  const query = applicationId
    ? `handle_requests?application_id=eq.${applicationId}&select=*`
    : `handle_requests?company_approved_at=not.is.null&status=neq.verified&select=*`;
  const hrRes = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: H });
  let handleRequests = hrRes.ok ? await hrRes.json() : [];
  if (applicationId && handleRequests.length === 0) {
    return NextResponse.json({ error: "No hay handles enviados para este contrato" }, { status: 404 });
  }

  // 2. Cruzar con applications para quedarnos solo con las del creador
  // autenticado (nadie puede verificar handles ajenos) y saber a qué
  // empresa avisarle si se verifica.
  const appIds = Array.from(new Set(handleRequests.map((h: any) => h.application_id)));
  const appsRes = appIds.length
    ? await fetch(`${SUPABASE_URL}/rest/v1/applications?id=in.(${appIds.join(",")})&select=id,creator_id,company_id,gig_id`, { headers: H })
    : null;
  const apps = appsRes?.ok ? await appsRes.json() : [];
  const appById = new Map<string, any>(apps.map((a: any) => [a.id, a]));

  handleRequests = handleRequests.filter((hr: any) => appById.get(hr.application_id)?.creator_id === user.id);
  if (applicationId && handleRequests.length === 0) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (applicationId && !handleRequests[0].company_approved_at) {
    return NextResponse.json({ error: "La empresa todavía no aprobó estos handles" }, { status: 409 });
  }

  // 3. Bio del creador — UNA sola vez, se usa para todas las solicitudes.
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=bio`, { headers: H });
  const profile = (profRes.ok ? await profRes.json() : [])[0];
  let bio = profile?.bio;
  if (typeof bio === "string") { try { bio = JSON.parse(bio); } catch { bio = {}; } }

  const now = new Date().toISOString();
  const allResults: Array<{ applicationId: string; platform: string; handle: string; result: "verified" | "not_connected" }> = [];
  const newlyVerifiedApps: string[] = [];

  for (const hr of handleRequests) {
    const updatedHandles = (Array.isArray(hr.handles) ? hr.handles : []).map((h: any) => {
      const usernames = connectedUsernames(bio, h.platform);
      const match = usernames.find((u) => norm(u) === norm(h.handle));
      allResults.push({ applicationId: hr.application_id, platform: h.platform, handle: h.handle, result: match ? "verified" : "not_connected" });
      return match
        ? { ...h, verified: true, verified_at: now, connected_username: match }
        : { ...h, verified: false, connected_username: null };
    });

    const wasVerified = hr.status === "verified";
    const allVerified = updatedHandles.length > 0 && updatedHandles.every((h: any) => h.verified);

    await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${hr.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({
        handles: updatedHandles,
        status: allVerified ? "verified" : hr.status,
        verified_at: allVerified ? now : hr.verified_at,
      }),
    });

    if (allVerified && !wasVerified) newlyVerifiedApps.push(hr.application_id);
  }

  // 4. Avisar por chat a cada empresa cuyo contrato recién quedó verificado.
  const authHeader = request.headers.get("authorization") || "";
  for (const appId of newlyVerifiedApps) {
    const app = appById.get(appId);
    if (!app) continue;
    fetch(`${request.nextUrl.origin}/api/whop/dm/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ userId: app.company_id, content: "El creador ya verificó sus cuentas para este contrato." }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, results: allResults, newlyVerifiedApps });
}
