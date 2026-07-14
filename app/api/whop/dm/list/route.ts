import { NextRequest, NextResponse } from "next/server";
import { Whop } from "@whop/sdk";
import { whopClient } from "@/lib/whop";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { ensureWhopIdentity, CHAT_SCOPES } from "@/lib/whopIdentity";
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
        `${SUPABASE_URL}/rest/v1/chat_channels?or=(creator_user.eq.${user.id},company_user.eq.${user.id})&select=channel_id,creator_user,company_user,host_company,last_opened_at&order=last_opened_at.desc&limit=50`,
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

    // último mensaje de cada canal (VISTO/NO VISTO). La API key no puede leer
    // support channels, pero el TOKEN DE CHAT sí (igual que el embed): minteamos
    // un token por host y leemos con él. Tolerante a fallas.
    const lastMap = new Map<string, string | null>();
    try {
      const { whopUserId } = await ensureWhopIdentity(user);
      const hosts = Array.from(new Set(rows.slice(0, 20).map((r) => r.host_company).filter(Boolean))).slice(0, 10);
      const clients = new Map<string, any>();
      await Promise.all(hosts.map(async (host) => {
        try {
          const t: any = await (whopClient as any).accessTokens.create({
            company_id: host, user_id: whopUserId, scoped_actions: CHAT_SCOPES,
          });
          if (t?.token) clients.set(host, new Whop({ apiKey: t.token, baseURL: "https://api.whop.com/api/v1" }));
        } catch {}
      }));
      await Promise.all(
        rows.slice(0, 20).map(async (r) => {
          const c = clients.get(r.host_company);
          if (!c) return;
          try {
            // el último mensaje real (misma vía que usa el embed)
            for await (const m of (c as any).messages.list({ channel_id: r.channel_id })) {
              if (m?.created_at) {
                const t = typeof m.created_at === "string" && /^\d+$/.test(m.created_at) ? Number(m.created_at) : m.created_at;
                lastMap.set(r.channel_id, new Date(t).toISOString());
              }
              break; // solo el primero (más reciente)
            }
          } catch {}
        })
      );
    } catch {}

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
        lastMessageAt: lastMap.get(r.channel_id) || null,
      };
    });

    return NextResponse.json({ ok: true, conversations });
  } catch (e: any) {
    console.error("[DmList] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo cargar la lista" }, { status: 500 });
  }
}
