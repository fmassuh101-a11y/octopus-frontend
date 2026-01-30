'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState('Procesando...')
  const [error, setError] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  // Helper to check for pending onboarding
  const checkPendingOnboarding = (): boolean => {
    const creatorOnboarding = localStorage.getItem('creatorOnboarding')
    const companyOnboarding = localStorage.getItem('companyOnboarding')

    if (creatorOnboarding) {
      try {
        const data = JSON.parse(creatorOnboarding)
        if (data.pendingComplete) {
          setStatus('Continuando con tu registro...')
          setTimeout(() => { window.location.href = '/onboarding/creator/socials' }, 500)
          return true
        }
      } catch (e) {}
    }
    if (companyOnboarding) {
      try {
        const data = JSON.parse(companyOnboarding)
        if (data.pendingComplete) {
          setStatus('Continuando con tu registro...')
          setTimeout(() => { window.location.href = '/onboarding/company/logo' }, 500)
          return true
        }
      } catch (e) {}
    }
    return false
  }

  // Helper to check profile and redirect appropriately
  const checkProfileAndRedirect = async (userId: string) => {
    // First check for pending onboarding
    if (checkPendingOnboarding()) {
      return
    }

    try {
      setStatus('Verificando perfil...')
      console.log('[Callback] Checking profile for user:', userId)

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', userId)

      if (!profileError && profiles && profiles.length > 0) {
        const userType = profiles[0].user_type
        console.log('[Callback] User type:', userType)

        if (userType === 'creator') {
          setStatus('¡Bienvenido de vuelta! Redirigiendo...')
          setTimeout(() => { window.location.href = '/creator/dashboard' }, 500)
          return
        } else if (userType === 'company') {
          setStatus('¡Bienvenido de vuelta! Redirigiendo...')
          setTimeout(() => { window.location.href = '/company/dashboard' }, 500)
          return
        }
      }
    } catch (err) {
      console.error('[Callback] Error checking profile:', err)
    }

    // No profile found, go to select-type
    setStatus('¡Listo! Configurando tu cuenta...')
    setTimeout(() => { window.location.href = '/auth/select-type' }, 500)
  }

  const handleCallback = async () => {
    try {
      console.log('[Callback] Starting callback processing...')

      // Check for access_token in hash (implicit flow from OAuth)
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken) {
        setStatus('Guardando sesión...')
        console.log('[Callback] Found access token in hash, setting session with Supabase client...')

        // Use Supabase client to set session - this ensures proper persistence
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (sessionError) {
          console.error('[Callback] Error setting session:', sessionError)
          throw sessionError
        }

        console.log('[Callback] Session set successfully:', data.session?.user?.email)

        if (data.session?.user) {
          await checkProfileAndRedirect(data.session.user.id)
        } else {
          setStatus('¡Listo! Redirigiendo...')
          setTimeout(() => { window.location.href = '/auth/select-type' }, 500)
        }
        return
      }

      // Check for code in URL (PKCE flow)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        setStatus('Intercambiando código...')
        console.log('[Callback] Found code in URL, exchanging...')

        // Use Supabase client to exchange code
        const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code)

        if (codeError) {
          console.error('[Callback] Error exchanging code:', codeError)
          throw codeError
        }

        console.log('[Callback] Code exchanged successfully:', data.session?.user?.email)

        if (data.session?.user) {
          await checkProfileAndRedirect(data.session.user.id)
        } else {
          setStatus('¡Listo! Redirigiendo...')
          setTimeout(() => { window.location.href = '/auth/select-type' }, 500)
        }
        return
      }

      // Check if we already have a session via Supabase client
      console.log('[Callback] No tokens in URL, checking existing session...')
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        console.log('[Callback] Found existing session:', session.user.email)
        await checkProfileAndRedirect(session.user.id)
        return
      }

      // No session found
      console.log('[Callback] No session found')
      setError(true)
      setStatus('No se encontró sesión')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)

    } catch (err) {
      console.error('[Callback] Callback error:', err)
      setError(true)
      setStatus('Error de autenticación')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-blue-800 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🐙</span>
        </div>

        <h2 className={`text-lg font-bold mb-4 ${error ? 'text-red-600' : 'text-gray-800'}`}>
          {status}
        </h2>

        {!error && (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  )
}
