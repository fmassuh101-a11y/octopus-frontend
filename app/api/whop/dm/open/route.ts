import { NextRequest, NextResponse } from "next/server";
import { Whop } from "@whop/sdk";
import { whopClient } from "@/lib/whop";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { ensureWhopIdentity, CHAT_SCOPES } from "@/lib/whopIdentity";
import { shieldAsync } from "@/lib/shield";

/**
 * POST /api/whop/dm/open { userId } — abre (o encuentra) el DM de Whop entre
 * el usuario autenticado y otro usuario de Octopus (ej: empresa → creador).
 * Devuelve el channelId para abrirlo en el chat embebido. Todo dentro de la app.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  try {
    const me = await getAuthenticatedUser(request);
    if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const targetId = String(body.userId || "").trim();
    if (!targetId) return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });
    if (targetId === me.id) return NextResponse.json({ error: "No podés chatear con vos mismo" }, { status: 400 });

    // identidad Whop de ambos (se crean solas si no existen)
    const mine = await ensureWhopIdentity(me);
    // el destinatario: buscamos su email en auth vía su perfil (el helper lo necesita si hay que crearlo)
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("@/lib/config/supabase");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${targetId}&select=user_id,email`,
      { headers: { Authorization: `Bearer ${key}`, apikey: key } }
    );
    const target = ((tRes.ok ? await tRes.json() : [])[0]) || { user_id: targetId };
    const theirs = await ensureWhopIdentity({ id: targetId, email: target.email });

    // El canal lo crea la KEY DE LA APP (tiene los permisos dms:channel:manage
    // que Felipe le aprobó): un DM entre los dos usuarios, verificado E2E.
    // (Los tokens minteados no sirven acá: el endpoint rechaza company-scoped.)
    const appKey = (process.env.WHOP_CHAT_API_KEY || process.env.WHOP_OAUTH_CLIENT_SECRET || "").trim();
    if (!appKey) return NextResponse.json({ error: "Falta la key de mensajes (WHOP_OAUTH_CLIENT_SECRET)" }, { status: 500 });
    const asApp = new Whop({ apiKey: appKey, baseURL: "https://api.whop.com/api/v1" });
    const channel: any = await (asApp as any).dmChannels.create({
      with_user_ids: [mine.whopUserId, theirs.whopUserId],
    });
    const channelId = channel?.id || null;
    if (!channelId) return NextResponse.json({ error: "No se pudo abrir el chat" }, { status: 502 });

    return NextResponse.json({ ok: true, channelId });
  } catch (e: any) {
    console.error("[DmOpen] error:", e?.message || e);
    return NextResponse.json({ error: `No se pudo abrir el chat: ${e?.message || "error"}` }, { status: 500 });
  }
}
