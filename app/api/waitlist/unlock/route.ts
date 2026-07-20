import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { shieldAsync } from "@/lib/shield";
import { WAITLIST_COOKIE, waitlistSecret } from "@/lib/waitlist";

// LISTA DE ESPERA — desbloqueo con contraseña (para Felipe / equipo).
// Si la contraseña es correcta, seteamos la cookie httpOnly que el middleware
// valida para dejar pasar a la app real.
//
// SEGURIDAD (20 jul 2026): antes había un valor fijo acá ("octo2008") como
// respaldo si WAITLIST_PASSWORD no estaba en Vercel. El repo es público en
// GitHub, así que ese valor era visible para cualquiera — se confirmó en
// producción que esa contraseña funcionaba de verdad. Ya no hay respaldo: sin
// WAITLIST_PASSWORD configurado en Vercel, el desbloqueo queda cerrado para
// TODOS (incluido el equipo) hasta que se configure una contraseña real ahí.
const PASSWORD = process.env.WAITLIST_PASSWORD || "";

function safeEqual(a: string, b: string): boolean {
  const bufA = new Uint8Array(Buffer.from(a));
  const bufB = new Uint8Array(Buffer.from(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 5, windowMs: 5 * 60_000 });
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const pass = String(body.password || "").trim();

  if (!PASSWORD || !pass || !safeEqual(pass, PASSWORD)) {
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
