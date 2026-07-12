import { NextRequest, NextResponse } from "next/server";

// DIAGNÓSTICO TEMPORAL del OAuth de Whop (borrar cuando el chat funcione).
// Prueba el canje con un code falso usando el client_secret de la ENV (nunca
// sale del server): si Whop responde "invalid_grant" el secret es VÁLIDO;
// si responde "invalid_client" el valor en Vercel está mal.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octopus-frontend-tau.vercel.app";

export async function GET(request: NextRequest) {
  // gate simple con la contraseña del muro
  const key = request.nextUrl.searchParams.get("key") || "";
  if (key !== (process.env.WAITLIST_PASSWORD || "octo2008")) {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }

  const clientId = process.env.WHOP_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_WHOP_APP_ID || "app_D74Fuxu632GOeK";
  const secret = (process.env.WHOP_OAUTH_CLIENT_SECRET || "").trim();

  const probe = async (label: string, headers: Record<string, string>, body: string) => {
    const res = await fetch("https://api.whop.com/oauth/token", { method: "POST", headers, body });
    const text = (await res.text()).slice(0, 200);
    return { label, status: res.status, body: text };
  };

  const base = {
    grant_type: "authorization_code",
    code: "fake_code_for_diagnosis",
    redirect_uri: `${APP_URL}/api/whop/oauth/callback`,
    client_id: clientId,
  };

  const results = [];
  results.push(await probe("json+secret", { "Content-Type": "application/json" },
    JSON.stringify({ ...base, client_secret: secret })));
  results.push(await probe("form+secret", { "Content-Type": "application/x-www-form-urlencoded" },
    new URLSearchParams({ ...base, client_secret: secret }).toString()));
  results.push(await probe("basic-auth", {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
  }, new URLSearchParams(base).toString()));

  return NextResponse.json({
    clientId,
    secretPresent: !!secret,
    secretLen: secret.length,
    secretPrefix: secret.slice(0, 5), // solo el prefijo para saber el formato
    results,
  });
}
