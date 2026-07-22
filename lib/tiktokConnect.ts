'use client'

// Conectar TikTok en una ventanita chica, SIN mover la pantalla principal.
//
// Por qué NO se usa window.opener + postMessage: la ventanita salta de
// dominio en dominio (nuestro sitio -> tiktok.com -> el dominio viejo de
// Vercel, registrado como redirect_uri de TikTok -> octapiapp.com) — varios
// navegadores modernos CORTAN la referencia window.opener en navegaciones
// cross-origin como esas (Cross-Origin-Opener-Policy y similares), así que
// postMessage podía fallar en silencio después de ese salto y la ventana
// principal se quedaba esperando para siempre.
//
// En cambio, se usa localStorage: es compartido entre TODAS las pestañas/
// ventanas del MISMO origen (no depende de ninguna referencia entre
// ventanas), así que apenas la ventanita aterriza de vuelta en nuestro
// dominio y termina, escribe el resultado ahí — la ventana principal lo
// detecta sondeando esa clave.

const RESULT_KEY = 'oct_tiktok_connect_result'
const TIMEOUT_MS = 120_000 // 2 min — de sobra para loguearse en TikTok

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

// Llamado por el popup (app/page.tsx) cuando termina, sea éxito o error.
export function reportTikTokConnectResult(ok: boolean, error?: string) {
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify({ ok, error: error || null, ts: Date.now() }))
  } catch {}
  // si la ventana la abrimos nosotros, se puede cerrar sola; si por algo
  // falla (ventana no abierta como popup real), no rompe nada.
  try { window.close() } catch {}
}

// Llamado por quien abre el popup (los 3 botones "Verifica tus cuentas").
export function connectTikTok(onDone: (ok: boolean, error?: string) => void) {
  const startedAt = Date.now()
  const { url, state } = tiktokAuthUrl()
  localStorage.setItem('tiktok_csrf_state', state)
  localStorage.setItem('tiktok_oauth_state', state)
  try { localStorage.removeItem(RESULT_KEY) } catch {}

  const popup = window.open(url, 'tiktok_oauth', 'width=500,height=720')
  if (!popup) {
    onDone(false, 'popup_blocked')
    return
  }

  let done = false
  const finish = (ok: boolean, error?: string) => {
    if (done) return
    done = true
    clearInterval(poll)
    onDone(ok, error)
  }

  // sondeo simple — más confiable acá que el evento "storage" del navegador,
  // que NO se dispara en la misma pestaña que escribe el valor y puede tener
  // comportamientos raros entre popup y opener según el navegador.
  const poll = setInterval(() => {
    if (Date.now() - startedAt > TIMEOUT_MS) { finish(false, 'timeout'); return }

    let raw: string | null = null
    try { raw = localStorage.getItem(RESULT_KEY) } catch {}
    if (raw) {
      try {
        const data = JSON.parse(raw)
        if (data?.ts >= startedAt) {
          localStorage.removeItem(RESULT_KEY)
          finish(!!data.ok, data.error)
          return
        }
      } catch {}
    }

    // si la persona cerró la ventanita a mano sin terminar, no la dejamos
    // esperando para siempre — se cuenta como cancelado, no como error real.
    if (popup.closed) { finish(false, 'closed') }
  }, 600)
}
