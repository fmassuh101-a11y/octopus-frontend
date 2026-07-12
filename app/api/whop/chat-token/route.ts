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

    const res: any = await (whopClient as any).accessTokens.create({
      company_id: companyId,
      user_id: whopUserId,
      scoped_actions: CHAT_SCOPES,
    });
    const token = res?.token || null;
    if (!token) return NextResponse.json({ error: "No se pudo crear el token de chat" }, { status: 502 });

    return NextResponse.json({ ok: true, token, whopUserId });
  } catch (e: any) {
    console.error("[ChatToken] error:", e?.message || e);
    return NextResponse.json({ error: `No se pudo iniciar el chat: ${e?.message || "error"}` }, { status: 500 });
  }
}
