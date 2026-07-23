'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getStoredSession, restoreSession } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Clapperboard, Users, Scissors, Smartphone } from 'lucide-react'
import { popTikTokReturnTo } from '@/lib/tiktokConnect'

function HomeInner() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [tiktokProcessing, setTiktokProcessing] = useState(false)
  const [tiktokProgress, setTiktokProgress] = useState(0)

  // Barra de progreso de 0 a 100 mientras se conecta TikTok — no sabemos el
  // tiempo exacto que va a tardar, así que sube rápido al principio y se va
  // frenando (nunca llega sola a 100, hasta que el proceso real termina y la
  // pantalla cambia de una) — se siente viva en vez de una espera muda.
  useEffect(() => {
    if (!tiktokProcessing) { setTiktokProgress(0); return }
    const t = setInterval(() => {
      setTiktokProgress((p) => p + (94 - p) * 0.08)
    }, 120)
    return () => clearInterval(t)
  }, [tiktokProcessing])

  // A dónde volver al terminar con TikTok — a la MISMA conversación/
  // contrato desde donde se apretó "Verifica tus cuentas" si ese dato
  // quedó guardado (lib/tiktokConnect.ts), o al lugar de siempre si no
  // (ej. se conectó desde el perfil, no desde un contrato).
  const finishTikTok = (ok: boolean, extra?: { error?: string }) => {
    const returnTo = popTikTokReturnTo()
    if (returnTo) {
      const qs = new URLSearchParams()
      qs.set('tiktok', ok ? 'connected' : 'error')
      if (!ok && extra?.error) qs.set('tiktokError', extra.error)
      if (returnTo.contractId) qs.set('openContract', returnTo.contractId)
      const sep = returnTo.path.includes('?') ? '&' : '?'
      window.location.href = `${returnTo.path}${sep}${qs.toString()}`
      return
    }
    window.location.href = ok
      ? 'https://octapiapp.com/creator/analytics?tiktok=connected'
      : `/creator/profile?section=verification${extra?.error ? `&error=${encodeURIComponent(extra.error)}` : ''}`
  }

  useEffect(() => {
    // lib/supabase.ts ya sacó el ?code=/?error= de TikTok de la URL de
    // verdad (para que el detector de OAuth de Supabase no lo confunda con
    // su propio login y desloguee a la persona) y lo dejó guardado acá —
    // por eso se lee de sessionStorage y NO de searchParams/la URL.
    let rawSearch = ''
    try { rawSearch = sessionStorage.getItem('oct_tiktok_raw_search') || '' } catch {}
    const tiktokParams = rawSearch ? new URLSearchParams(rawSearch) : searchParams

    // TikTok tiene registrado el dominio viejo de Vercel como redirect_uri
    // — no se puede cambiar sin pedirle a TikTok que lo revise de nuevo.
    // Pero la sesión real de la persona vive en octapiapp.com, que es un
    // "casillero" de localStorage totalmente distinto en el navegador. Sin
    // este puente, quien conecta TikTok termina en una página donde su
    // sesión no existe y parece que "lo echó" — acá se lo manda de una al
    // dominio correcto ANTES de intentar leer nada de localStorage.
    if (typeof window !== 'undefined' && window.location.hostname !== 'octapiapp.com' && window.location.hostname.includes('vercel.app')) {
      const hasOAuthParams = tiktokParams.get('code') || tiktokParams.get('error')
      if (hasOAuthParams) {
        window.location.href = `https://octapiapp.com/${rawSearch || window.location.search}`
        return
      }
    }

    // Check for TikTok OAuth error (user cancelled) BEFORE mounting
    const error = tiktokParams.get('error')
    if (error) {
      console.log('[TikTok] User cancelled or error:', error)
      try { sessionStorage.removeItem('oct_tiktok_raw_search') } catch {}
      finishTikTok(false, { error })
      return // Don't mount, just redirect
    }

    // Check for TikTok OAuth callback BEFORE mounting
    const code = tiktokParams.get('code')
    const state = tiktokParams.get('state')
    if (code && state) {
      try { sessionStorage.removeItem('oct_tiktok_raw_search') } catch {}
      setTiktokProcessing(true)
      handleTikTokCallback(code, state)
      return // Don't mount normal page
    }

    // Only mount if no OAuth params
    setMounted(true)

    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    setHasSession(!!token)

    if (token && userStr) {
      checkUserProfile(token, JSON.parse(userStr))
    }
  }, [searchParams])

  // Handle TikTok OAuth callback
  //
  // BLINDAJE (encontrado por reporte real: se quedaba pegado para siempre
  // en "Conectando con TikTok…", pantalla negra, sin volver a ningún lado):
  // varios pasos de acá abajo (setSession, leer/guardar el perfil, la
  // verificación automática) NO tenían NINGÚN límite de tiempo — a
  // diferencia del pedido a TikTok, que sí tenía uno. Si cualquiera de esos
  // pasos se demoraba (mal wifi, algo lento del lado del servidor), la
  // persona quedaba esperando literalmente para siempre, sin error, sin
  // aviso, sin poder hacer nada. Ahora TODO el proceso completo tiene un
  // límite duro de 20 segundos — pase lo que pase adentro, a los 20
  // segundos como mucho la persona ve un resultado (éxito o error) y puede
  // volver a intentar, nunca se queda mirando una pantalla congelada.
  const handleTikTokCallback = async (code: string, state: string) => {
    setTiktokProcessing(true)
    const finish = finishTikTok

    const savedState = localStorage.getItem('tiktok_oauth_state') || localStorage.getItem('tiktok_csrf_state')
    if (state !== savedState) {
      console.error('[TikTok] State mismatch:', state, 'vs', savedState)
      finish(false, { error: 'state_mismatch' })
      return
    }

    const storedSession = getStoredSession()
    if (!storedSession?.access_token || !storedSession?.user?.id) {
      console.error('[TikTok Callback] No session in localStorage')
      finish(false, { error: 'no_session' })
      return
    }
    const accessToken = storedSession.access_token
    const refreshToken = storedSession.refresh_token || ''
    const userId = storedSession.user.id

    let finished = false
    const finishOnce = (ok: boolean, extra?: { error?: string }) => {
      if (finished) return
      finished = true
      finish(ok, extra)
    }

    // El límite de acá tiene que ser MÁS GRANDE que el de /api/tiktok/callback
    // más abajo — si no, este se dispara primero y corta el pedido a mitad
    // de camino antes de que ese tenga la chance de terminar solo y avisar
    // bien qué pasó. /api/tiktok/callback le pide a TikTok 2 cosas seguidas
    // (token y datos del usuario), 15s cada una como mucho = 30s en el peor
    // de los casos — por eso 35s acá, con margen real, no ajustado al límite.
    const watchdog = setTimeout(() => {
      console.error('[TikTok Callback] Watchdog: no terminó en 35s, se fuerza a terminar igual')
      finishOnce(false, { error: 'timeout' })
    }, 35000)

    try {
      // No se espera (fire-and-forget): solo sincroniza el cliente de
      // Supabase para otras pantallas, no es indispensable para esta.
      restoreSession().catch(err => console.error('[TikTok Callback] restoreSession error:', err))

      const controller = new AbortController()
      const abortTimer = setTimeout(() => controller.abort(), 28000)
      let response: Response
      try {
        response = await fetch('/api/tiktok/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirect_uri: 'https://octopus-frontend-tau.vercel.app/' }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(abortTimer)
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        console.error('[TikTok] API error:', data.error)
        finishOnce(false, { error: data.error || 'unknown' })
        return
      }

      const tiktokData = data.data
      const accountData = {
        id: `tiktok_${tiktokData.openId}`,
        openId: tiktokData.openId,
        username: tiktokData.username || tiktokData.displayName || 'Usuario TikTok',
        displayName: tiktokData.displayName || tiktokData.username || 'Usuario TikTok',
        avatarUrl: tiktokData.avatarUrl,
        bio: tiktokData.bio || '',
        isVerified: tiktokData.isVerified || false,
        followers: tiktokData.followers || 0,
        following: tiktokData.following || 0,
        likes: tiktokData.likes || 0,
        videoCount: tiktokData.videoCount || 0,
        avgViews: tiktokData.avgViews || 0,
        engagementRate: tiktokData.engagementRate || 0,
        recentVideos: tiktokData.recentVideos || [],
        accessToken: tiktokData.accessToken,
        refreshToken: tiktokData.refreshToken,
        connectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }

      // Guardar el perfil por REST directo (no por el cliente de Supabase:
      // depende de que setSession() haya terminado a tiempo, un punto de
      // falla de más que no hace falta acá).
      const H = { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=bio`, { headers: H })
      const profiles = profRes.ok ? await profRes.json() : []

      if (profiles?.length > 0) {
        let bioData: any = {}
        try { bioData = profiles[0].bio ? JSON.parse(profiles[0].bio) : {} } catch { bioData = {} }

        const tiktokAccounts = bioData.tiktokAccounts || []
        const existingIndex = tiktokAccounts.findIndex((a: any) => a.openId === accountData.openId || a.username === accountData.username)
        if (existingIndex >= 0) tiktokAccounts[existingIndex] = accountData
        else tiktokAccounts.push(accountData)
        bioData.tiktokAccounts = tiktokAccounts
        bioData.tiktokConnected = true

        const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: H,
          body: JSON.stringify({ bio: JSON.stringify(bioData), updated_at: new Date().toISOString() }),
        })
        if (!saveRes.ok) console.error('[TikTok Callback] Save error:', await saveRes.text().catch(() => ''))
      }

      localStorage.removeItem('tiktok_oauth_state')
      localStorage.removeItem('tiktok_csrf_state')

      // Si justo esta cuenta era la que un contrato estaba esperando (la
      // empresa ya había aprobado los handles), se verifica sola acá mismo.
      await fetch('/api/handle-requests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      }).catch(() => {})

      finishOnce(true)
    } catch (error: any) {
      console.error('[TikTok] Callback error:', error)
      finishOnce(false, { error: 'callback_failed' })
    } finally {
      clearTimeout(watchdog)
    }
  }

  const checkUserProfile = async (token: string, user: any) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })
      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0 && profiles[0].user_type) {
          setUserType(profiles[0].user_type)
        }
      }
    } catch (e) {
      console.error('Error checking profile:', e)
    }
  }

  const handleContinue = async () => {
    setIsLoading(true)

    // If we already know the user type, redirect
    if (userType === 'creator') {
      window.location.href = '/creator/dashboard'
      return
    } else if (userType === 'company') {
      window.location.href = '/company/dashboard'
      return
    }

    // Otherwise, try to fetch it again
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (!token || !userStr) {
      window.location.href = '/auth/login'
      return
    }

    try {
      const user = JSON.parse(userStr)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0 && profiles[0].user_type) {
          if (profiles[0].user_type === 'creator') {
            window.location.href = '/creator/dashboard'
          } else if (profiles[0].user_type === 'company') {
            window.location.href = '/company/dashboard'
          } else {
            window.location.href = '/auth/select-type'
          }
          return
        }
      }

      // No profile found, go to select type
      window.location.href = '/auth/select-type'
    } catch (e) {
      console.error('Error:', e)
      window.location.href = '/auth/select-type'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('creatorOnboarding')
    localStorage.removeItem('companyOnboarding')
    window.location.reload()
  }

  // Show loading for OAuth processing or initial load
  if (!mounted || tiktokProcessing) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
          <span className="text-3xl font-black text-white">O</span>
        </div>
        {tiktokProcessing ? (
          <>
            <div className="w-56 h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-150 ease-out"
                style={{ width: `${Math.min(100, Math.round(tiktokProgress))}%` }}
              />
            </div>
            <p className="text-white/60 text-sm tabular-nums">
              Conectando con TikTok… {Math.min(100, Math.round(tiktokProgress))}%
            </p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-white/60">Cargando...</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-black text-white">O</span>
            </div>
            <span className="text-2xl font-bold">Octapi</span>
          </div>

          <div className="flex items-center space-x-4">
            {hasSession ? (
              <>
                <button
                  onClick={handleContinue}
                  disabled={isLoading}
                  className="bg-neutral-900 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                      Cargando...
                    </span>
                  ) : (
                    userType ? (userType === 'creator' ? 'Mi Panel' : 'Mi Dashboard') : 'Continuar'
                  )}
                </button>
                <button onClick={handleLogout} className="text-white/60 hover:text-white px-4 py-2.5 transition">
                  Salir
                </button>
              </>
            ) : (
              <>
                <a href="/auth/login" className="text-white/80 hover:text-white px-4 py-2.5 transition font-medium">
                  Iniciar Sesion
                </a>
                <a href="/auth/register" className="bg-neutral-900 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition">
                  Comenzar
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-sm font-medium text-white/80 mb-8">
            La plataforma #1 para creadores en Latinoamerica
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Conecta con marcas.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-400">
              Multiplica tus ingresos.
            </span>
          </h1>

          <p className="text-xl text-white/60 mb-4 max-w-2xl mx-auto leading-relaxed">
            Unete a miles de creadores que ya estan ganando dinero creando contenido UGC,
            clips y colaboraciones con las mejores marcas.
          </p>
          <p className="text-base text-cyan-300/90 mb-12 max-w-2xl mx-auto">
            No hace falta ser influencer — es para cualquiera que quiera crear contenido para marcas (UGC)
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/register"
              className="bg-neutral-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition transform hover:scale-105"
            >
              Comenzar Gratis
            </a>
            <a
              href="/gigs"
              className="border border-white/20 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition"
            >
              Ver Oportunidades
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-blue-400 mb-1">10K+</div>
            <div className="text-white/60 text-sm">Creadores Activos</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-emerald-400 mb-1">500+</div>
            <div className="text-white/60 text-sm">Marcas Premium</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-emerald-400 mb-1">$2M+</div>
            <div className="text-white/60 text-sm">Pagado a Creadores</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-emerald-400 mb-1">98%</div>
            <div className="text-white/60 text-sm">Satisfaccion</div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Oportunidades para ti</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4"><Clapperboard className="w-7 h-7" strokeWidth={2} /></div>
              <h3 className="font-bold mb-2">Contenido UGC</h3>
              <p className="text-white/60 text-sm">Crea videos autenticos para marcas</p>
              <p className="text-blue-400 text-sm mt-2 font-medium">$200 - $2,000</p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4"><Scissors className="w-7 h-7" strokeWidth={2} /></div>
              <h3 className="font-bold mb-2">Clips & Edicion</h3>
              <p className="text-white/60 text-sm">Edita contenido para creadores</p>
              <p className="text-emerald-400 text-sm mt-2 font-medium">$50 - $500</p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4"><Users className="w-7 h-7" strokeWidth={2} /></div>
              <h3 className="font-bold mb-2">Colaboraciones</h3>
              <p className="text-white/60 text-sm">Trabaja directamente con marcas</p>
              <p className="text-emerald-400 text-sm mt-2 font-medium">$500 - $10,000</p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4"><Smartphone className="w-7 h-7" strokeWidth={2} /></div>
              <h3 className="font-bold mb-2">Redes Sociales</h3>
              <p className="text-white/60 text-sm">Gestiona cuentas de marcas</p>
              <p className="text-emerald-400 text-sm mt-2 font-medium">$300 - $2,000/mes</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-12 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-emerald-500/10 rounded-3xl border border-white/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Crea tu perfil gratis y comienza a recibir ofertas de las mejores marcas de Latinoamerica.
          </p>
          <a
            href="/auth/register"
            className="inline-block bg-neutral-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition transform hover:scale-105"
          >
            Crear Cuenta Gratis
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white/40 text-sm">
              © 2024 Octapi. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="/terms" className="text-white/40 hover:text-white/70 transition">
                Terminos de Servicio
              </a>
              <a href="/privacy" className="text-white/40 hover:text-white/70 transition">
                Politica de Privacidad
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


// useSearchParams necesita Suspense en Next 14 — sin esto, el prerender de "/"
// se cae al error shell y el sitio no abre en el celular.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  )
}
