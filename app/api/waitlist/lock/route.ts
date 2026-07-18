import { NextResponse } from "next/server";
import { WAITLIST_COOKIE } from "@/lib/waitlist";

// Cierra el pase del muro (se llama al CERRAR SESIÓN): borra la cookie de
// acceso para que el navegador vuelva a quedar detrás de la waitlist.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WAITLIST_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
