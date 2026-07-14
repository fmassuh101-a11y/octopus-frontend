import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { ensureWhopIdentity, CHAT_SCOPES } from "@/lib/whopIdentity";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

/**
 * GET /api/whop/chat-token[?channel=feed_...] — token del chat embebido.
 * Los tokens de Whop son ESTRICTOS por compañía: para abrir una conversación
 * (support channel, que vive en la compañía del creador) el token debe ir
 * scoped a ESA compañía. Con ?channel= verificamos que el usuario sea parte
 * de la conversación y minteamos scoped al host. Sin ?channel=, va scoped a
 * la compañía propia (sirve para el creador y como healthcheck).
 * Verificado E2E: ambos lados envían y leen. Sin OAuth, sin salir de la app.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 60 });
  if (blocked) return blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { companyId, whopUserId } = await ensureWhopIdentity(user);

    // ¿scoped a una conversación específica?
    let scopeCompany = companyId;
    const channelId = request.nextUrl.searchParams.get("channel") || "";
    if (channelId) {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
      const rows: any[] = await (
        await fetch(
          `${SUPABASE_URL}/rest/v1/chat_channels?channel_id=eq.${encodeURIComponent(channelId)}&select=host_company,creator_user,company_user&limit=1`,
          { headers: { Authorization: `Bearer ${key}`, apikey: key } }
        )
      ).json();
      const row = rows?.[0];
      if (!row) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
      if (row.creator_user !== user.id && row.company_user !== user.id) {
        return NextResponse.json({ error: "No es tu conversación" }, { status: 403 });
      }
      scopeCompany = row.host_company;
    }

    const res: any = await (whopClient as any).accessTokens.create({
      company_id: scopeCompany,
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
