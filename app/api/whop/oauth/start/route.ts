import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { WHOP_APP_ID, WHOP_OAUTH_SCOPES } from "@/lib/whopApp";

// PARTE 4 (mensajes) — inicio del OAuth de Whop.
// Redirige al usuario a la pantalla de autorización de Whop para habilitar el chat
// embebido (dms). Requiere la App de Whop de Felipe: WHOP_APP_ID + WHOP_OAUTH_CLIENT_ID.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`);

  // a dónde volver dentro de Octopus después de autorizar
  const next = request.nextUrl.searchParams.get("next") || "/creator/chat";
  const redirectUri = `${APP_URL}/api/whop/oauth/callback`;
  // state firmado simple: user + destino (se valida en el callback)
  const state = Buffer.from(JSON.stringify({ u: user.id, n: next })).toString("base64url");

  const url = new URL("https://api.whop.com/oauth/authorize");
  url.searchParams.set("client_id", WHOP_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", WHOP_OAUTH_SCOPES);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
