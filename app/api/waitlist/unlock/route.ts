import { NextRequest, NextResponse } from "next/server";
import { shieldAsync } from "@/lib/shield";
import { WAITLIST_COOKIE, waitlistSecret } from "@/lib/waitlist";

// LISTA DE ESPERA — desbloqueo con contraseña (para Felipe / equipo).
// Si la contraseña es correcta, seteamos la cookie httpOnly que el middleware
// valida para dejar pasar a la app real.
const PASSWORD = process.env.WAITLIST_PASSWORD || "octo2008";

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const pass = String(body.password || "").trim();

  if (!pass || pass !== PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(WAITLIST_COOKIE, waitlistSecret(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}
