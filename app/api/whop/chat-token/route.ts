import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/whop/chat-token
 * Devuelve el token de chat de Whop guardado (httpOnly) tras el OAuth, para que el
 * ChatSession embebido (DMs + grupos) funcione DENTRO de Octopus — sin sacar al
 * usuario a whop.com. Si no hay token, responde 401 y el cliente muestra "Conectar".
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("whop_chat_token")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, token });
}
