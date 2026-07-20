// LISTA DE ESPERA — config compartida entre el middleware (edge) y las rutas.
// El muro se prende/apaga con WAITLIST_ENABLED en Vercel:
//   - sin la variable o "1"/"true"  → muro ACTIVO (default: cerrado)
//   - "0" o "false"                 → muro APAGADO (día del lanzamiento)
export const WAITLIST_COOKIE = "oct_acceso";

export function waitlistEnabled(): boolean {
  const v = (process.env.WAITLIST_ENABLED || "1").toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

// SEGURIDAD (20 jul 2026): este archivo antes tenía un valor de cookie fijo
// escrito acá mismo como respaldo ("octo-pase-2026-kraken") si WAITLIST_SECRET
// no estaba configurado en Vercel. Como el repo es PÚBLICO en GitHub, ese
// valor era visible para cualquiera — y probamos en producción que pegando esa
// cookie a mano en el navegador se entraba a toda la app SIN saber la
// contraseña. Ya no hay ningún valor fijo en el código: si falta la variable
// en Vercel, se DERIVA de otro secreto que solo existe ahí (nunca en el repo).
function simpleHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

// valor de la cookie de acceso. Preferí SIEMPRE configurar WAITLIST_SECRET en
// Vercel; si no está, se deriva de otro secreto que ya vive solo ahí (nunca
// visible en el repo) — y si no hay ningún secreto disponible, devuelve ""
// (el muro queda cerrado: "" nunca matchea una cookie inexistente).
export function waitlistSecret(): string {
  if (process.env.WAITLIST_SECRET) return process.env.WAITLIST_SECRET;
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.WHOP_API_KEY || "";
  if (!seed) return "";
  return "oct-" + simpleHash("waitlist-pass:" + seed);
}
