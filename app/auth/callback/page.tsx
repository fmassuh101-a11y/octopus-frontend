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
          window.location.href = '/onboarding/creator/socials'
          return true
        }
      } catch (e) {}
    }
    if (companyOnboarding) {
      try {
        const data = JSON.parse(companyOnboarding)
        if (data.pendingComplete) {
          setStatus('Continuando con tu registro...')
          window.location.href = '/onboarding/company/logo'
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

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', userId)

      if (!profileError && profiles && profiles.length > 0) {
        const userType = profiles[0].user_type

        if (userType === 'creator') {
          setStatus('¡Bienvenido de vuelta!')
          window.location.href = '/creator/dashboard'
          return
        } else if (userType === 'company') {
          setStatus('¡Bienvenido de vuelta!')
          window.location.href = '/company/dashboard'
          return
        }
      }
    } catch (err) {
      console.error('[Callback] Error checking profile:', err)
    }

    // No profile found, go to select-type
    setStatus('¡Listo! Configurando tu cuenta...')
    window.location.href = '/auth/select-type'
  }

  const handleCallback = async () => {
    try {
      console.log('[Callback] Processing OAuth callback...')
      console.log('[Callback] URL hash:', window.location.hash ? 'present' : 'none')
      console.log('[Callback] URL search:', window.location.search ? 'present' : 'none')

      // Wait a moment for Supabase to auto-detect tokens from URL
      // (detectSessionInUrl: true in supabase config handles this)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Now check for session - Supabase should have processed the tokens
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('[Callback] Session check:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        error: sessionError?.message
      })

      if (sessionError) {
        console.error('[Callback] Session error:', sessionError)
        throw sessionError
      }

      if (session?.user) {
        setStatus('Sesión activa')
        await checkProfileAndRedirect(session.user.id)
        return
      }

      // If no session yet, try to manually extract from hash (fallback)
      const hash = window.location.hash.substring(1)
      if (hash) {
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken) {
          console.log('[Callback] Manually setting session from hash...')
          setStatus('Guardando sesión...')

          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })

          if (setSessionError) {
            console.error('[Callback] setSession error:', setSessionError)
            throw setSessionError
          }

          if (data.session?.user) {
            console.log('[Callback] Session set successfully:', data.session.user.email)
            await checkProfileAndRedirect(data.session.user.id)
            return
          }
        }
      }

      // Check for PKCE code
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        console.log('[Callback] Exchanging PKCE code...')
        setStatus('Procesando código...')

        const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code)

        if (codeError) {
          console.error('[Callback] Code exchange error:', codeError)
          throw codeError
        }

        if (data.session?.user) {
          await checkProfileAndRedirect(data.session.user.id)
          return
        }
      }

      // No session found at all
      console.log('[Callback] No session found after all attempts')
      setError(true)
      setStatus('No se encontró sesión')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)

    } catch (err: any) {
      console.error('[Callback] Error:', err)
      setError(true)
      setStatus(`Error: ${err.message || 'Error de autenticación'}`)
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 3000)
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
