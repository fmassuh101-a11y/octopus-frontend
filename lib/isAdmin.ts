// Emails con acceso de administrador. Agregar/quitar acá.
//
// SEGURIDAD (20 jul 2026): antes había un segundo email acá ("admin@octopus.app")
// que nadie controla — ese dominio no es nuestro, así que cualquiera podía
// registrarse en la app con exactamente ese email y quedar con acceso admin
// completo (cambiar planes de usuarios, ver disputas, formularios de contacto).
// Se saca: solo el email real de Felipe tiene acceso admin.
export const ADMIN_EMAILS = ['fmassuh133@gmail.com']

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
