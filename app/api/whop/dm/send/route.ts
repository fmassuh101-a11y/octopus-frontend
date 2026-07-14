import { NextRequest, NextResponse } from "next/server";
import { Whop } from "@whop/sdk";
import { whopClient } from "@/lib/whop";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { ensureWhopIdentity, CHAT_SCOPES } from "@/lib/whopIdentity";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

/**
 * POST /api/whop/dm/send { userId, content, gigId? } — envía un mensaje POR WHOP
 * al chat con otro usuario de Octopus (crea la conversación si no existe).
 * Si viene gigId y es el PRIMER contacto, primero se envía la CITA del gig
 * (link con tarjeta, como SideShift) y después el texto.
 * Lo usan: aceptar aplicante, invitar a campaña, contratos, etc.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  try {
    const me = await getAuthenticatedUser(request);
    if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const targetId = String(body.userId || "").trim();
    const content = String(body.content || "").trim().slice(0, 4000);
    const gigId = String(body.gigId || "").trim();
    if (!targetId || !content) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    if (targetId === me.id) return NextResponse.json({ error: "No podés escribirte a vos mismo" }, { status: 400 });

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

    const iAmCreator = myProfile.user_type === "creator" && targetProfile.user_type !== "creator";
    const hostCompany = iAmCreator ? mine.companyId : theirs.companyId;
    const guestUser = iAmCreator ? theirs.whopUserId : mine.whopUserId;

    // canal (idempotente) + registro
    const channel: any = await (whopClient as any).supportChannels.create({
      company_id: hostCompany,
      user_id: guestUser,
    });
    const channelId = channel?.id;
    if (!channelId) return NextResponse.json({ error: "No se pudo abrir el chat" }, { status: 502 });

    await fetch(`${SUPABASE_URL}/rest/v1/chat_channels?on_conflict=channel_id`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        channel_id: channelId,
        host_company: hostCompany,
        creator_user: iAmCreator ? me.id : targetId,
        company_user: iAmCreator ? targetId : me.id,
        last_opened_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    // token del REMITENTE scoped al host → enviar como él (verificado E2E)
    const tok: any = await (whopClient as any).accessTokens.create({
      company_id: hostCompany,
      user_id: mine.whopUserId,
      scoped_actions: CHAT_SCOPES,
    });
    if (!tok?.token) return NextResponse.json({ error: "No se pudo crear el token" }, { status: 502 });
    const asMe = new Whop({ apiKey: tok.token, baseURL: "https://api.whop.com/api/v1" });

    // CITA DEL GIG (estilo SideShift): SIEMPRE que el mensaje venga de una
    // campaña, primero el link de la campaña (tarjeta clickeable) y después el texto
    if (gigId) {
      try {
        const gigs: any[] = await (
          await fetch(`${SUPABASE_URL}/rest/v1/gigs?id=eq.${encodeURIComponent(gigId)}&select=title&limit=1`, { headers: H })
        ).json();
        const title = gigs?.[0]?.title ? `**${gigs[0].title}**\n` : "";
        await (asMe as any).messages.create({
          channel_id: channelId,
          content: `${title}${APP_URL}/gigs/${gigId}`,
        });
      } catch {}
    }

    const msg: any = await (asMe as any).messages.create({ channel_id: channelId, content });
    if (!msg?.id) return NextResponse.json({ error: "No se pudo enviar" }, { status: 502 });

    return NextResponse.json({ ok: true, channelId, messageId: msg.id });
  } catch (e: any) {
    console.error("[DmSend] error:", e?.message || e);
    return NextResponse.json({ error: `No se pudo enviar: ${e?.message || "error"}` }, { status: 500 });
  }
}
