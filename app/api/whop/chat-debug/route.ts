import { NextRequest, NextResponse } from "next/server";
import { Whop } from "@whop/sdk";
import { CHAT_SCOPES } from "@/lib/whopIdentity";

// DIAGNÓSTICO TEMPORAL del chat (borrar cuando funcione): prueba con qué key
// se puede mintear el token de chat. Las keys viven en la env, nunca salen.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") || "";
  if (key !== (process.env.WAITLIST_PASSWORD || "octo2008")) {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }

  const companyId = "biz_of6bZGXulk6GYL"; // connected account real de prueba
  const userId = "user_arWH3cyD0BcAt";

  const tryKey = async (label: string, apiKey: string) => {
    if (!apiKey) return { label, ok: false, error: "key ausente" };
    try {
      const c = new Whop({ apiKey, baseURL: "https://api.whop.com/api/v1" });
      const t: any = await (c as any).accessTokens.create({
        company_id: companyId,
        user_id: userId,
        scoped_actions: CHAT_SCOPES,
      });
      return { label, ok: !!t?.token, tokenLen: t?.token?.length || 0 };
    } catch (e: any) {
      return { label, ok: false, status: e?.status, error: (e?.message || "").slice(0, 180) };
    }
  };

  const results: any[] = [];
  const PAY_KEY = process.env.WHOP_API_KEY || "";
  const APP_KEY = (process.env.WHOP_OAUTH_CLIENT_SECRET || "").trim();

  // escalera: ¿qué receta de mint produce un token que PUEDE mandar mensajes?
  const msgChannel = request.nextUrl.searchParams.get("msg") || "";
  if (msgChannel) {
    const DMS_ONLY = ["dms:read", "dms:message:manage", "dms:channel:manage"];
    const recipes: Array<{ label: string; key: string; body: Record<string, unknown> }> = [
      // los DMs usan dms:* (chat:* es para canales de comunidades) — la key de la
      // App YA tiene los dms:*: pedir solo esos scopes puede bastar
      { label: "appKey dms-only user+platform", key: APP_KEY, body: { company_id: "biz_RP3n8m53mpKsdU", user_id: userId, scoped_actions: DMS_ONLY } },
      { label: "appKey dms-only user+company", key: APP_KEY, body: { company_id: companyId, user_id: userId, scoped_actions: DMS_ONLY } },
      { label: "appKey sin scopes user+platform", key: APP_KEY, body: { company_id: "biz_RP3n8m53mpKsdU", user_id: userId } },
      { label: "payKey dms-only user+platform", key: PAY_KEY, body: { company_id: "biz_RP3n8m53mpKsdU", user_id: userId, scoped_actions: DMS_ONLY } },
      { label: "payKey user+company", key: PAY_KEY, body: { company_id: companyId, user_id: userId, scoped_actions: CHAT_SCOPES } },
    ];
    for (const r of recipes) {
      if (!r.key) { results.push({ label: r.label, ok: false, error: "key ausente" }); continue; }
      try {
        const minter = new Whop({ apiKey: r.key, baseURL: "https://api.whop.com/api/v1" });
        const t: any = await (minter as any).accessTokens.create(r.body);
        if (!t?.token) { results.push({ label: r.label, ok: false, error: "sin token" }); continue; }
        const asUser = new Whop({ apiKey: t.token, baseURL: "https://api.whop.com/api/v1" });
        const m: any = await (asUser as any).messages.create({ channel_id: msgChannel, content: `prueba ${r.label}` });
        results.push({ label: r.label, ok: true, messageId: m?.id });
        break; // encontramos la receta — no spamear el canal
      } catch (e: any) {
        results.push({ label: r.label, ok: false, error: (e?.message || "").slice(0, 140) });
      }
    }
    return NextResponse.json({ results });
  }

  results.push(await tryKey("WHOP_API_KEY (pagos)", PAY_KEY));
  results.push(await tryKey("key de la App (client secret)", APP_KEY));

  // prueba de crear DM con cada key DIRECTA: ?dm=user_A,user_B
  const dm = request.nextUrl.searchParams.get("dm") || "";
  if (dm) {
    const ids = dm.split(",").map((s) => s.trim()).filter(Boolean);
    for (const [label, apiKey] of [
      ["dm con WHOP_API_KEY", process.env.WHOP_API_KEY || ""],
      ["dm con key de la App", (process.env.WHOP_OAUTH_CLIENT_SECRET || "").trim()],
    ] as const) {
      if (!apiKey) { results.push({ label, ok: false, error: "key ausente" }); continue; }
      const c = new Whop({ apiKey, baseURL: "https://api.whop.com/api/v1" });
      try {
        const ch: any = await (c as any).dmChannels.create({ with_user_ids: ids });
        results.push({ label, ok: true, channelId: ch?.id, raw: JSON.stringify(ch).slice(0, 250) });
      } catch (e: any) {
        results.push({ label, ok: false, error: (e?.message || "").slice(0, 180) });
      }
    }
  }
  return NextResponse.json({ results });
}
