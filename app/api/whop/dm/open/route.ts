import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { ensureWhopIdentity } from "@/lib/whopIdentity";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

/**
 * POST /api/whop/dm/open { userId } — abre (o encuentra) la conversación entre
 * el usuario autenticado y otro usuario de Octopus, DENTRO de la app.
 *
 * MECANISMO (verificado E2E): SUPPORT CHANNEL de Whop — la conversación vive en
 * la compañía del CREADOR con el usuario de la EMPRESA como cliente. Es
 * idempotente (siempre devuelve el mismo canal → la conversación se guarda), y
 * los tokens company-scoped SÍ pueden leer y escribir (los DMs personales no,
 * exigen OAuth). Sin login de Whop, sin salir de la app.
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
    if (targetId === me.id) return NextResponse.json({ error: "No puedes chatear contigo mismo" }, { status: 400 });

    // perfiles de ambos (tipo + email para crear identidades si faltan)
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    const H = { Authorization: `Bearer ${key}`, apikey: key };
    const rows: any[] = await (
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${me.id},${targetId})&select=user_id,user_type,email`,
        { headers: H }
      )
    ).json();
    const myProfile = rows.find((r) => r.user_id === me.id) || {};
    const targetProfile = rows.find((r) => r.user_id === targetId) || {};

    const mine = await ensureWhopIdentity({ id: me.id, email: me.email || myProfile.email });
    const theirs = await ensureWhopIdentity({ id: targetId, email: targetProfile.email });

    // la conversación vive en la compañía del CREADOR; el otro es el "cliente"
    const iAmCreator = myProfile.user_type === "creator" && targetProfile.user_type !== "creator";
    const hostCompany = iAmCreator ? mine.companyId : theirs.companyId;
    const guestUser = iAmCreator ? theirs.whopUserId : mine.whopUserId;

    const channel: any = await (whopClient as any).supportChannels.create({
      company_id: hostCompany,
      user_id: guestUser,
    });
    const channelId = channel?.id || null;
    if (!channelId) return NextResponse.json({ error: "No se pudo abrir el chat" }, { status: 502 });

    // registrar la conversación (para la lista lateral y el permiso del token)
    const creatorUser = iAmCreator ? me.id : targetId;
    const companyUser = iAmCreator ? targetId : me.id;
    await fetch(`${SUPABASE_URL}/rest/v1/chat_channels?on_conflict=channel_id`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        channel_id: channelId,
        host_company: hostCompany,
        creator_user: creatorUser,
        company_user: companyUser,
        last_opened_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, channelId });
  } catch (e: any) {
    console.error("[DmOpen] error:", e?.message || e);
    return NextResponse.json({ error: `No se pudo abrir el chat: ${e?.message || "error"}` }, { status: 500 });
  }
}
