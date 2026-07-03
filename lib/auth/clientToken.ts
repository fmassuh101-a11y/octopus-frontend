'use client'

/**
 * Header de autorización para llamar a las rutas /api/* protegidas.
 * La sesión vive en localStorage (patrón actual de la app).
 */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') : null
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}
