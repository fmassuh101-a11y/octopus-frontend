// Emails con acceso de administrador. Agregar/quitar acá.
export const ADMIN_EMAILS = ['fmassuh133@gmail.com', 'admin@octopus.app']

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
