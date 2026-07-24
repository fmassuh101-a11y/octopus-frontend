'use client'

// Mismo patrón que lib/tiktokConnect.ts y lib/youtubeConnect.ts: redirect de
// página completa (no popup), con el destino guardado en localStorage para
// volver exactamente adonde estaba el creador. Ruta propia (/auth/instagram)
// para no compartir la raíz con TikTok ni con /auth/callback de Supabase.
const RETURN_KEY = 'oct_instagram_return_to'
const REDIRECT_URI = 'https://octapiapp.com/auth/instagram'

export function instagramAuthUrl(): { url: string; state: string } {
  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || ''
  const state = Math.random().toString(36).substring(2, 15)
  // instagram_business_basic alcanza para lo que hacemos hoy (mostrar el
  // handle conectado, verificarlo contra el pedido de un contrato) — sin
  // pedir scopes de insights/analytics, que son más pesados de aprobar.
  const scope = encodeURIComponent('instagram_business_basic')
  const url = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`
  return { state, url }
}

export type InstagramReturnTo = { path: string; contractId?: string }

export function connectInstagram(returnTo: InstagramReturnTo) {
  try { localStorage.setItem(RETURN_KEY, JSON.stringify(returnTo)) } catch {}
  const { url, state } = instagramAuthUrl()
  try { localStorage.setItem('instagram_oauth_state', state) } catch {}
  window.location.href = url
}

export function popInstagramReturnTo(): InstagramReturnTo | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY)
    if (!raw) return null
    localStorage.removeItem(RETURN_KEY)
    return JSON.parse(raw)
  } catch { return null }
}
