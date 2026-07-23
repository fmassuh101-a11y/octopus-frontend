'use client'

// Mismo patrón que lib/tiktokConnect.ts: redirect de página completa (no
// popup — en mobile no abre ventanas reales), con el destino guardado en
// localStorage para volver exactamente adonde estaba el creador.
//
// A diferencia de TikTok, acá el redirect_uri NO está atado a un dominio
// viejo — se registra desde cero en Google Cloud Console, así que se usa
// directo el dominio canónico con una ruta propia (/auth/youtube) en vez
// de la raíz. Evita compartir la raíz con el login de Google de Supabase
// y con TikTok.
const RETURN_KEY = 'oct_youtube_return_to'
const REDIRECT_URI = 'https://octapiapp.com/auth/youtube'

export function youtubeAuthUrl(): { url: string; state: string } {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  const state = Math.random().toString(36).substring(2, 15)
  const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
  return { state, url }
}

export type YouTubeReturnTo = { path: string; contractId?: string }

export function connectYouTube(returnTo: YouTubeReturnTo) {
  try { localStorage.setItem(RETURN_KEY, JSON.stringify(returnTo)) } catch {}
  const { url, state } = youtubeAuthUrl()
  try { localStorage.setItem('youtube_oauth_state', state) } catch {}
  window.location.href = url
}

export function popYouTubeReturnTo(): YouTubeReturnTo | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY)
    if (!raw) return null
    localStorage.removeItem(RETURN_KEY)
    return JSON.parse(raw)
  } catch { return null }
}
