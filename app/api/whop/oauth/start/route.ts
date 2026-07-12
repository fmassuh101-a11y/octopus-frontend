import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";

// PARTE 4 (mensajes) — inicio del OAuth de Whop.
// Redirige al usuario a la pantalla de autorización de Whop para habilitar el chat
// embebido (dms). Requiere la App de Whop de Felipe: WHOP_APP_ID + WHOP_OAUTH_CLIENT_ID.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`);

  const clientId = process.env.WHOP_OAUTH_CLIENT_ID || process.env.WHOP_APP_ID || "";
  if (!clientId) {
    return NextResponse.json(
      { error: "Falta crear la App de Whop (WHOP_APP_ID / WHOP_OAUTH_CLIENT_ID en Vercel)." },
      { status: 503 }
    );
  }

  // a dónde volver dentro de Octopus después de autorizar
  const next = request.nextUrl.searchParams.get("next") || "/creator/messages";
  const redirectUri = `${APP_URL}/api/whop/oauth/callback`;
  const scopes = ["openid", "profile", "email", "dms:read", "dms:message:manage"].join(" ");
  // state firmado simple: user + destino (se valida en el callback)
  const state = Buffer.from(JSON.stringify({ u: user.id, n: next })).toString("base64url");

  const url = new URL("https://api.whop.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
