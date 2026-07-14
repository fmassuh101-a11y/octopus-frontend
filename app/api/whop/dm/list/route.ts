import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

/**
 * GET /api/whop/dm/list — conversaciones del usuario (para la lista lateral
 * con NUESTRO diseño: nombre y foto del otro lado). Los mensajes viven en Whop.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    const H = { Authorization: `Bearer ${key}`, apikey: key };

    const rows: any[] = await (
      await fetch(
        `${SUPABASE_URL}/rest/v1/chat_channels?or=(creator_user.eq.${user.id},company_user.eq.${user.id})&select=channel_id,creator_user,company_user,last_opened_at&order=last_opened_at.desc&limit=50`,
        { headers: H }
      )
    ).json();
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ ok: true, conversations: [] });

    // datos del OTRO lado de cada conversación
    const otherIds = Array.from(new Set(rows.map((r) => (r.creator_user === user.id ? r.company_user : r.creator_user))));
    const profiles: any[] = await (
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${otherIds.join(",")})&select=user_id,full_name,company_name,profile_photo_url,avatar_url,user_type`,
        { headers: H }
      )
    ).json();
    const byId = new Map((Array.isArray(profiles) ? profiles : []).map((p) => [p.user_id, p]));

    const conversations = rows.map((r) => {
      const otherId = r.creator_user === user.id ? r.company_user : r.creator_user;
      const p: any = byId.get(otherId) || {};
      // VELOCIDAD: las fotos guardadas como base64 pesan MB — no viajan en la
      // lista (inicial en su lugar). Las URLs http/https sí pasan.
      const rawPhoto = p.profile_photo_url || p.avatar_url || null;
      const photo = rawPhoto && !String(rawPhoto).startsWith("data:") ? rawPhoto : null;
      return {
        channelId: r.channel_id,
        userId: otherId,
        name: p.company_name || p.full_name || "Usuario",
        photo,
        type: p.user_type || null,
        lastOpenedAt: r.last_opened_at,
      };
    });

    return NextResponse.json({ ok: true, conversations });
  } catch (e: any) {
    console.error("[DmList] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo cargar la lista" }, { status: 500 });
  }
}
