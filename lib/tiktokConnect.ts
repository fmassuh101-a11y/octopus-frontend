'use client'

// Conectar TikTok — navegación directa, SIN ventanita.
//
// Por qué se sacó la ventanita (window.open): en el celular, la mayoría de
// los navegadores NO abren una ventana chica de verdad como en el
// computador — muchas veces navegan la PROPIA pestaña/app a TikTok igual,
// así que la "ventanita" terminaba siendo toda la app. Al querer cerrarse
// sola con window.close(), Safari en iPhone lo bloquea y muestra "saliste
// de la página" — y como nunca fue una ventana de verdad, no había forma
// de avisarle a nada que había terminado: quedaba trabado ahí, sin guardar
// nada. Esto se confirmó probando en el celular real.
//
// Ahora se navega derecho a TikTok en la misma pantalla — la única
// excepción a "nunca salir de Mensajes" que ya se aceptó, porque TikTok
// funciona así para todo el mundo (Google, Stripe, etc. son iguales). Lo
// que sí se controla: ANTES de salir, se guarda a dónde volver (la misma
// conversación, el mismo contrato) — así cuando TikTok termina y vuelve,
// aterriza exactamente en el mismo lugar, no en un dashboard genérico.

const RETURN_KEY = 'oct_tiktok_return_to'

export function tiktokAuthUrl(): { url: string; state: string } {
  const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'aw5n2omdzbjx4xf8'
  const state = Math.random().toString(36).substring(2, 15)
  const redirectUri = encodeURIComponent('https://octopus-frontend-tau.vercel.app/')
  const scope = encodeURIComponent('user.info.basic,user.info.profile,user.info.stats,video.list')
  return {
    state,
    url: `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=${state}&disable_auto_auth=1`,
  }
}

export type TikTokReturnTo = { path: string; contractId?: string }

// Llamado por los botones "Verifica tus cuentas" — guarda a dónde volver y
// navega derecho a TikTok.
export function connectTikTok(returnTo: TikTokReturnTo) {
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify(returnTo))
  } catch {}
  const { url, state } = tiktokAuthUrl()
  try {
    localStorage.setItem('tiktok_csrf_state', state)
    localStorage.setItem('tiktok_oauth_state', state)
  } catch {}
  window.location.href = url
}

// Llamado UNA vez por app/page.tsx (el callback real) al terminar, para
// saber a dónde mandar de vuelta a la persona. Se borra al leerlo — solo
// sirve para ese viaje de ida y vuelta puntual.
export function popTikTokReturnTo(): TikTokReturnTo | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY)
    if (!raw) return null
    localStorage.removeItem(RETURN_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}
