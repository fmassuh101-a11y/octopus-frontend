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
  results.push(await tryKey("WHOP_API_KEY (pagos)", process.env.WHOP_API_KEY || ""));
  results.push(await tryKey("key de la App (client secret)", (process.env.WHOP_OAUTH_CLIENT_SECRET || "").trim()));

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
