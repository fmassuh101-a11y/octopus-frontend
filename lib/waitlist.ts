// LISTA DE ESPERA — config compartida entre el middleware (edge) y las rutas.
// El muro se prende/apaga con WAITLIST_ENABLED en Vercel:
//   - sin la variable o "1"/"true"  → muro ACTIVO (default: cerrado)
//   - "0" o "false"                 → muro APAGADO (día del lanzamiento)
export const WAITLIST_COOKIE = "oct_acceso";

export function waitlistEnabled(): boolean {
  const v = (process.env.WAITLIST_ENABLED || "1").toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

// valor de la cookie de acceso (secreto simple de env; no es una sesión de usuario,
// solo el "pase" del muro). Cambiarlo en Vercel invalida todos los pases.
export function waitlistSecret(): string {
  return process.env.WAITLIST_SECRET || "octo-pase-2026-kraken";
}
