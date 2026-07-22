'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, getStoredSession, restoreSession } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Clapperboard, Users, Scissors, Smartphone } from 'lucide-react'

function HomeInner() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [tiktokProcessing, setTiktokProcessing] = useState(false)

  useEffect(() => {
    // TikTok tiene registrado el dominio viejo de Vercel como redirect_uri
    // — no se puede cambiar sin pedirle a TikTok que lo revise de nuevo.
    // Pero la sesión real de la persona vive en octapiapp.com, que es un
    // "casillero" de localStorage totalmente distinto en el navegador. Sin
    // este puente, quien conecta TikTok termina en una página donde su
    // sesión no existe y parece que "lo echó" — acá se lo manda de una al
    // dominio correcto ANTES de intentar leer nada de localStorage.
    if (typeof window !== 'undefined' && window.location.hostname !== 'octapiapp.com' && window.location.hostname.includes('vercel.app')) {
      const hasOAuthParams = searchParams.get('code') || searchParams.get('error')
      if (hasOAuthParams) {
        window.location.href = `https://octapiapp.com/${window.location.search}`
        return
      }
    }

    // Check for TikTok OAuth error (user cancelled) BEFORE mounting
    const error = searchParams.get('error')
    if (error) {
      console.log('[TikTok] User cancelled or error:', error)
      window.location.href = '/creator/profile?section=verification'
      return // Don't mount, just redirect
    }

    // Check for TikTok OAuth callback BEFORE mounting
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (code && state) {
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
  const handleTikTokCallback = async (code: string, state: string) => {
    setTiktokProcessing(true)

    // Verify state matches (check both possible keys)
    const savedState = localStorage.getItem('tiktok_oauth_state') || localStorage.getItem('tiktok_csrf_state')
    if (state !== savedState) {
      console.error('[TikTok] State mismatch:', state, 'vs', savedState)
      window.location.href = '/creator/profile?section=verification&error=state_mismatch'
      return
    }

    try {
      console.log('[TikTok Callback] Processing TikTok authorization...')

      // Step 1: Get session from localStorage and restore to Supabase client
      const storedSession = getStoredSession()

      console.log('[TikTok Callback] Stored session found:', !!storedSession)

      if (!storedSession) {
        console.error('[TikTok Callback] No session in localStorage')
        alert('No hay sesión activa. Por favor inicia sesión.')
        window.location.href = '/auth/login'
        return
      }

      // Create a session-like object for use below (do this BEFORE restoreSession to avoid blocking)
      const session = {
        user: storedSession.user,
        access_token: storedSession.access_token
      }

      // Restore session to Supabase client (in background, don't block)
      console.log('[TikTok Callback] Restoring session to Supabase...')
      restoreSession().catch(err => console.error('[TikTok Callback] restoreSession error:', err))
      console.log('[TikTok Callback] Session restore initiated')

      // Step 2: Exchange code for TikTok token (with 30 second timeout)
      console.log('[TikTok Callback] Calling /api/tiktok/callback...')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('[TikTok Callback] Request timeout after 30 seconds')
        controller.abort()
      }, 30000)

      let response
      try {
        response = await fetch('/api/tiktok/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirect_uri: 'https://octopus-frontend-tau.vercel.app/'
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          console.error('[TikTok Callback] Request timed out')
          alert('La conexión con TikTok tardó demasiado. Por favor intenta de nuevo.')
          window.location.href = '/creator/analytics'
          return
        }
        throw fetchError
      }

      console.log('[TikTok Callback] Response status:', response.status)
      const data = await response.json()
      console.log('[TikTok Callback] Response data:', data)

      if (!data.success || !data.data) {
        console.error('[TikTok] API error:', data.error)
        window.location.href = `/creator/profile?section=verification&error=${encodeURIComponent(data.error || 'unknown')}`
        return
      }

      const tiktokData = data.data
      console.log('[TikTok Callback] Got TikTok data for:', tiktokData.username || tiktokData.displayName)

      // Step 3: Build account data
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

      // Step 4: Save to Supabase
      console.log('[TikTok Callback] Preparing to save to Supabase...')

      // Validate tokens before using
      const accessToken = storedSession.access_token
      const refreshToken = storedSession.refresh_token || ''
      const userId = storedSession.user?.id

      console.log('[TikTok Callback] Token length:', accessToken?.length)
      console.log('[TikTok Callback] User ID:', userId)

      if (!accessToken || !userId) {
        throw new Error('Invalid session data')
      }

      // Set session in Supabase client
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (sessionError) {
          console.error('[TikTok Callback] Session error:', sessionError)
        } else {
          console.log('[TikTok Callback] Supabase session set successfully')
        }
      } catch (sessionErr) {
        console.error('[TikTok Callback] Error setting session:', sessionErr)
      }

      // Now fetch profile using Supabase client
      console.log('[TikTok Callback] Fetching profile for user:', userId)
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) {
        console.error('[TikTok Callback] Profile fetch error:', fetchError)
        throw new Error('Error al obtener perfil: ' + fetchError.message)
      }

      console.log('[TikTok Callback] Got profiles:', profiles?.length || 0)

      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        let bioData: any = {}

        try {
          bioData = profile.bio ? JSON.parse(profile.bio) : {}
        } catch (e) {
          bioData = {}
        }

        // Add TikTok account
        const tiktokAccounts = bioData.tiktokAccounts || []
        const existingIndex = tiktokAccounts.findIndex((a: any) =>
          a.openId === accountData.openId || a.username === accountData.username
        )

        if (existingIndex >= 0) {
          tiktokAccounts[existingIndex] = accountData
        } else {
          tiktokAccounts.push(accountData)
        }

        bioData.tiktokAccounts = tiktokAccounts
        bioData.tiktokConnected = true

        // Save to Supabase using client
        console.log('[TikTok Callback] Saving TikTok data to Supabase...')
        const { error: saveError } = await supabase
          .from('profiles')
          .update({
            bio: JSON.stringify(bioData),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (saveError) {
          console.error('[TikTok Callback] Save error:', saveError)
          throw new Error('Error al guardar: ' + saveError.message)
        }

        console.log('[TikTok Callback] TikTok account saved successfully!')
      }

      // Cleanup
      localStorage.removeItem('tiktok_oauth_state')
      localStorage.removeItem('tiktok_csrf_state')

      // Si justo esta cuenta era la que un contrato estaba esperando (la
      // empresa ya había aprobado los handles), se verifica sola acá mismo
      // — sin que la persona tenga que apretar nada más después de conectar.
      fetch('/api/handle-requests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      }).catch(() => {})

      // Redirect a analytics — SIEMPRE en octapiapp.com, sea cual sea el
      // dominio donde terminó corriendo este callback (ver el puente arriba).
      window.location.href = 'https://octapiapp.com/creator/analytics?tiktok=connected'

    } catch (error: any) {
      console.error('[TikTok] Callback error:', error)
      alert('Error: ' + (error?.message || String(error)))
      window.location.href = '/creator/profile?section=verification&error=callback_failed'
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
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-white/60">
          {tiktokProcessing ? 'Conectando con TikTok...' : 'Cargando...'}
        </p>
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

          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Unete a miles de creadores que ya estan ganando dinero creando contenido UGC,
            clips y colaboraciones con las mejores marcas.
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
