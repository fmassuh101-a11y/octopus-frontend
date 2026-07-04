import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/supabase'

// Renueva el access token usando el refresh token. La app guarda la sesión
// en localStorage y el access token dura ~1h; sin esto, después de 1 hora
// todo falla con "JWT expired". Esto lo mantiene fresco.

function decodeExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp || 0
  } catch { return 0 }
}

let refreshing: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  const refresh_token = localStorage.getItem('sb-refresh-token')
  if (!refresh_token) return null
  // evitar múltiples refresh en paralelo
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token }),
      })
      const data = await res.json()
      if (!res.ok || !data.access_token) return null
      localStorage.setItem('sb-access-token', data.access_token)
      if (data.refresh_token) localStorage.setItem('sb-refresh-token', data.refresh_token)
      if (data.user) localStorage.setItem('sb-user', JSON.stringify(data.user))
      return data.access_token as string
    } catch { return null } finally { refreshing = null }
  })()
  return refreshing
}

/**
 * Devuelve un access token válido, renovándolo si está por vencer.
 * Llamar antes de acciones importantes (crear campaña, aplicar, etc.).
 */
export async function ensureFreshToken(): Promise<string | null> {
  const token = localStorage.getItem('sb-access-token')
  if (!token) return null
  const exp = decodeExp(token)
  const now = Math.floor(Date.now() / 1000)
  // si vence en menos de 2 minutos (o ya venció), renovar
  if (exp - now < 120) {
    const fresh = await refreshAccessToken()
    return fresh || token
  }
  return token
}
