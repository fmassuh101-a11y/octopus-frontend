import { NextRequest, NextResponse } from "next/server";

// PARTE 4 (mensajes) — callback del OAuth de Whop.
// Whop vuelve con ?code; lo canjeamos por un access token y lo guardamos en una cookie
// httpOnly para que el chat embebido (dms) lo use. Requiere WHOP_OAUTH_CLIENT_ID/SECRET.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || "";
  const stateRaw = request.nextUrl.searchParams.get("state") || "";
  let next = "/creator/chat";
  try { next = JSON.parse(Buffer.from(stateRaw, "base64url").toString()).n || next; } catch {}

  if (!code) return NextResponse.redirect(`${APP_URL}${next}?whop=error`);

  const clientId = process.env.WHOP_OAUTH_CLIENT_ID || process.env.WHOP_APP_ID || "";
  const clientSecret = process.env.WHOP_OAUTH_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${APP_URL}${next}?whop=noapp`);
  }

  try {
    const res = await fetch("https://api.whop.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${APP_URL}/api/whop/oauth/callback`,
      }),
    });
    if (!res.ok) {
      console.error("[Whop OAuth] token exchange failed:", res.status, await res.text());
      return NextResponse.redirect(`${APP_URL}${next}?whop=error`);
    }
    const data = await res.json();
    const token = data?.access_token || "";
    if (!token) return NextResponse.redirect(`${APP_URL}${next}?whop=error`);

    const redirect = NextResponse.redirect(`${APP_URL}${next}?whop=ok`);
    // cookie httpOnly con el token de chat (solo lo lee el server para mintear la sesión)
    redirect.cookies.set("whop_chat_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Number(data?.expires_in) || 3600,
    });
    return redirect;
  } catch (e) {
    console.error("[Whop OAuth] callback error:", e);
    return NextResponse.redirect(`${APP_URL}${next}?whop=error`);
  }
}
