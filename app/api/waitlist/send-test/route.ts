import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { sendWelcomeEmail } from "@/lib/waitlistEmail";

const ADMIN_EMAILS = ["fmassuh133@gmail.com"];

/**
 * POST /api/waitlist/send-test { email, role, name? } — manda el email de
 * bienvenida (creador o empresa) a una dirección de prueba, sin tocar la
 * tabla de la waitlist. Pensado para que el admin vea cómo llega de verdad
 * antes de activar el envío a todos.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role === "company" ? "company" : "creator";
  const name = String(body.name || (role === "creator" ? "Felipe" : "Empresa de Prueba")).trim();
  if (!email.includes("@")) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

  const result = await sendWelcomeEmail({ email, name, role, waitlistId: "00000000-0000-0000-0000-000000000000" });
  if (!result.ok) return NextResponse.json({ error: `No se pudo mandar: ${result.error || "error desconocido"}` }, { status: 500 });

  return NextResponse.json({ ok: true });
}
