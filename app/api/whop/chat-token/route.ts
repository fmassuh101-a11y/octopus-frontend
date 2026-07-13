import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { ensureWhopIdentity, CHAT_SCOPES } from "@/lib/whopIdentity";
import { shieldAsync } from "@/lib/shield";

/**
 * GET /api/whop/chat-token — token del chat embebido (DMs + grupos) DENTRO de Octopus.
 * SIN OAuth y SIN login de Whop: enrolamos al usuario como connected account con
 * nuestra API key y minteamos un access token con los scopes de chat (guía oficial
 * docs.whop.com/developer/guides/chat/quickstart). El usuario nunca sale de la app.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { companyId, whopUserId } = await ensureWhopIdentity(user);

    // Preferir la KEY DE LA APP (dueña del chat): sus tokens no son "company-scoped"
    // y pueden operar DMs/mensajes. Requiere que la key tenga los permisos de chat
    // marcados (checkboxes de la key, aparte de los permisos de la App). Si aún no
    // los tiene, caemos a la key de pagos (la lista carga, enviar queda pendiente).
    const { OCTOPUS_COMPANY_ID } = await import("@/lib/whop");
    const appKey = (process.env.WHOP_CHAT_API_KEY || process.env.WHOP_OAUTH_CLIENT_SECRET || "").trim();
    let token: string | null = null;
    if (appKey) {
      try {
        const { Whop } = await import("@whop/sdk");
        const asApp = new Whop({ apiKey: appKey, baseURL: "https://api.whop.com/api/v1" });
        const r: any = await (asApp as any).accessTokens.create({
          company_id: OCTOPUS_COMPANY_ID,
          user_id: whopUserId,
          scoped_actions: CHAT_SCOPES,
        });
        token = r?.token || null;
      } catch (e: any) {
        console.error("[ChatToken] app key aún sin permisos de chat:", e?.message?.slice(0, 120));
      }
    }
    if (!token) {
      const res: any = await (whopClient as any).accessTokens.create({
        company_id: companyId,
        user_id: whopUserId,
        scoped_actions: CHAT_SCOPES,
      });
      token = res?.token || null;
    }
    if (!token) return NextResponse.json({ error: "No se pudo crear el token de chat" }, { status: 502 });

    return NextResponse.json({ ok: true, token, whopUserId });
  } catch (e: any) {
    console.error("[ChatToken] error:", e?.message || e);
    return NextResponse.json({ error: `No se pudo iniciar el chat: ${e?.message || "error"}` }, { status: 500 });
  }
}
