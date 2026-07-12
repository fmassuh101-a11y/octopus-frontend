import { NextRequest, NextResponse } from "next/server";

// PARTE 4 (mensajes) — callback del OAuth de Whop (con PKCE).
// Whop vuelve con ?code&state; validamos el state contra la cookie whop_pkce,
// canjeamos el code con el code_verifier (+ client_secret) y guardamos el access
// token en una cookie httpOnly para que el chat embebido (dms) lo use.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || "";
  const stateRaw = request.nextUrl.searchParams.get("state") || "";

  // cookie con el verifier/state/destino que dejó /oauth/start
  let pkce: { v?: string; s?: string; n?: string; u?: string } = {};
  try { pkce = JSON.parse(request.cookies.get("whop_pkce")?.value || "{}"); } catch {}
  const next = pkce.n || "/creator/chat";

  const fail = (reason: string) => {
    console.error("[Whop OAuth] fallo:", reason);
    return NextResponse.redirect(`${APP_URL}${next}?whop=error&why=${encodeURIComponent(reason)}`);
  };

  if (!code) return fail(request.nextUrl.searchParams.get("error") || "sin code");
  if (!pkce.v) return fail("cookie pkce ausente (reintentá)");
  if (pkce.s && stateRaw && pkce.s !== stateRaw) return fail("state no coincide");

  const clientId = process.env.WHOP_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID || "app_D74Fuxu632GOeK";

  try {
    // Canje SOLO con PKCE (así lo documenta Whop: grant_type, code, redirect_uri,
    // client_id y code_verifier — SIN client_secret; mandarlo daba 401).
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: `${APP_URL}/api/whop/oauth/callback`,
      client_id: clientId,
      code_verifier: pkce.v,
    };

    let res = await fetch("https://api.whop.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // fallback: algunos servidores OAuth solo aceptan form-encoded
    if (!res.ok && (res.status === 400 || res.status === 401 || res.status === 415)) {
      const firstStatus = res.status;
      const firstText = (await res.text()).slice(0, 200);
      res = await fetch("https://api.whop.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });
      if (!res.ok) console.error("[Whop OAuth] intento JSON:", firstStatus, firstText);
    }
    const text = await res.text();
    if (!res.ok) {
      console.error("[Whop OAuth] token exchange failed:", res.status, text.slice(0, 300));
      return fail(`canje ${res.status}`);
    }
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    const token = data?.access_token || "";
    if (!token) return fail("respuesta sin access_token");

    const redirect = NextResponse.redirect(`${APP_URL}${next}?whop=ok`);
    // token de chat en cookie httpOnly (solo el server la lee para /api/whop/chat-token)
    redirect.cookies.set("whop_chat_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Number(data?.expires_in) || 3600,
    });
    // guardar el refresh token si viene (para renovar sin re-autorizar)
    if (data?.refresh_token) {
      redirect.cookies.set("whop_chat_refresh", String(data.refresh_token), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    // limpiar la cookie pkce
    redirect.cookies.set("whop_pkce", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    return redirect;
  } catch (e: any) {
    return fail(e?.message || "error de red");
  }
}
