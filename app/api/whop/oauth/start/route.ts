import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { WHOP_APP_ID, WHOP_OAUTH_SCOPES } from "@/lib/whopApp";

// PARTE 4 (mensajes) — inicio del OAuth de Whop CON PKCE (obligatorio para Whop).
// No requiere sesión del server (la sesión vive en localStorage y el server no la ve):
// el cliente pasa ?u=<userId>&next=<ruta>. Acá generamos code_verifier + state,
// los guardamos en una cookie httpOnly de 10 min y redirigimos al authorize de Whop.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || "/creator/chat";
  const userId = request.nextUrl.searchParams.get("u") || "";

  // PKCE: verifier aleatorio → challenge = SHA256(verifier) en base64url
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(24));
  const nonce = b64url(crypto.randomBytes(16));

  const url = new URL("https://api.whop.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", WHOP_APP_ID);
  url.searchParams.set("redirect_uri", `${APP_URL}/api/whop/oauth/callback`);
  url.searchParams.set("scope", WHOP_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(url.toString());
  // verifier + state + destino + user, para validar y canjear en el callback
  res.cookies.set("whop_pkce", JSON.stringify({ v: verifier, s: state, n: next, u: userId }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
