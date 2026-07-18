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

  // PLAN B: support chat empresa↔creador (company-scoped por diseño)
  // ?support=1 → crea el canal de soporte (compañía del creador + user de la
  // empresa) y prueba mandar un mensaje con el token minteado del creador.
  if (request.nextUrl.searchParams.get("support")) {
    const out: any = {};
    const CREATOR_CO = "biz_Jjlf9sjoapzaSk"; // compañía del creador fmassuh122
    const CREATOR_USER = "user_1HfLh48caSJhM";
    const EMPRESA_USER = "user_seGlwPi2BZY2v"; // empresa de prueba A
    const pay = new Whop({ apiKey: PAY_KEY, baseURL: "https://api.whop.com/api/v1" });
    try {
      const ch: any = await (pay as any).supportChannels.create({ company_id: CREATOR_CO, user_id: EMPRESA_USER });
      out.channel = { id: ch?.id, name: ch?.name };
      // token del CREADOR (scoped a SU company) → ¿puede mandar en su support chat?
      const t: any = await (pay as any).accessTokens.create({
        company_id: CREATOR_CO, user_id: CREATOR_USER, scoped_actions: CHAT_SCOPES,
      });
      const asCreator = new Whop({ apiKey: t.token, baseURL: "https://api.whop.com/api/v1" });
      try {
        const m: any = await (asCreator as any).messages.create({ channel_id: ch.id, content: "Hola! (prueba soporte creador)" });
        out.creatorSend = { ok: true, id: m?.id };
      } catch (e: any) { out.creatorSend = { ok: false, error: (e?.message || "").slice(0, 140) }; }
      // token de la EMPRESA scoped a la company del CREADOR (es el "customer" del support chat)
      const t2: any = await (pay as any).accessTokens.create({
        company_id: CREATOR_CO, user_id: EMPRESA_USER, scoped_actions: CHAT_SCOPES,
      });
      const asEmpresa = new Whop({ apiKey: t2.token, baseURL: "https://api.whop.com/api/v1" });
      try {
        const m2: any = await (asEmpresa as any).messages.create({ channel_id: ch.id, content: "Hola! (prueba soporte empresa)" });
        out.empresaSend = { ok: true, id: m2?.id };
      } catch (e: any) { out.empresaSend = { ok: false, error: (e?.message || "").slice(0, 140) }; }
      // CLAVE para un solo token por sesión: ¿la empresa puede mandar al canal
      // del creador con un token scoped a SU PROPIA company? (membresía manda)
      const EMPRESA_CO = "biz_jPUCZocRVQnj85";
      const t3: any = await (pay as any).accessTokens.create({
        company_id: EMPRESA_CO, user_id: EMPRESA_USER, scoped_actions: CHAT_SCOPES,
      });
      const asEmpresaOwn = new Whop({ apiKey: t3.token, baseURL: "https://api.whop.com/api/v1" });
      try {
        const m3: any = await (asEmpresaOwn as any).messages.create({ channel_id: ch.id, content: "Hola! (empresa con token propio)" });
        out.empresaSendOwnCo = { ok: true, id: m3?.id };
      } catch (e: any) { out.empresaSendOwnCo = { ok: false, error: (e?.message || "").slice(0, 140) }; }
    } catch (e: any) {
      out.createError = (e?.message || "").slice(0, 200);
    }
    return NextResponse.json(out);
  }

  // prueba del flujo de ARCHIVOS (adjuntos): ?file=1
  if (request.nextUrl.searchParams.get("file")) {
    const out: any = {};
    try {
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      );
      const c = new Whop({ apiKey: PAY_KEY, baseURL: "https://api.whop.com/api/v1" });
      const created: any = await (c as any).files.create({ filename: "test.png" });
      out.create = { id: created?.id, hasUrl: !!created?.upload_url, headers: Object.keys(created?.upload_headers || {}) };
      if (created?.upload_url) {
        const up = await fetch(created.upload_url, {
          method: "PUT",
          headers: { "Content-Type": "image/png", ...(created.upload_headers || {}) },
          body: new Uint8Array(png),
        });
        out.put = { status: up.status, body: up.ok ? "ok" : (await up.text()).slice(0, 150) };
        for (let i = 0; i < 6; i++) {
          const f: any = await (c as any).files.retrieve(created.id);
          out.status = f?.upload_status;
          if (f?.upload_status === "ready" || f?.upload_status === "failed") break;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    } catch (e: any) { out.error = (e?.message || "").slice(0, 200); }
    return NextResponse.json(out);
  }

  // inspección de un canal: ¿quiénes son los miembros reales?
  const inspect = request.nextUrl.searchParams.get("inspect") || "";
  if (inspect) {
    const c = new Whop({ apiKey: APP_KEY || PAY_KEY, baseURL: "https://api.whop.com/api/v1" });
    try {
      const ch: any = await (c as any).dmChannels.retrieve(inspect);
      const out: any = { channel: JSON.parse(JSON.stringify(ch)) };
      try {
        const members: any[] = [];
        for await (const m of (c as any).dmMembers.list({ channel_id: inspect })) { members.push(m); if (members.length > 10) break; }
        out.members = members;
      } catch (e: any) { out.membersError = (e?.message || "").slice(0, 150); }
      return NextResponse.json(out);
    } catch (e: any) {
      return NextResponse.json({ error: (e?.message || "").slice(0, 200) });
    }
  }

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
