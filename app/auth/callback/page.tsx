'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState('Procesando...')
  const [error, setError] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      console.log('[Callback] Starting...')
      console.log('[Callback] Full URL:', window.location.href)

      // Extract tokens from URL hash (OAuth implicit flow)
      const hash = window.location.hash.substring(1)
      console.log('[Callback] Hash params present:', !!hash)

      if (hash) {
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const errorParam = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // Check for OAuth errors
        if (errorParam) {
          console.error('[Callback] OAuth error:', errorParam, errorDescription)
          throw new Error(errorDescription || errorParam)
        }

        if (accessToken) {
          console.log('[Callback] Found access token, setting session...')
          setStatus('Guardando sesión...')

          // Set session manually
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })

          if (sessionError) {
            console.error('[Callback] Session error:', sessionError)
            throw sessionError
          }

          if (data.session?.user) {
            console.log('[Callback] Session set successfully:', data.session.user.email)
            setStatus('¡Sesión creada!')

            // Check for pending onboarding
            const creatorOnboarding = localStorage.getItem('creatorOnboarding')
            const companyOnboarding = localStorage.getItem('companyOnboarding')

            if (creatorOnboarding) {
              try {
                const onboardingData = JSON.parse(creatorOnboarding)
                if (onboardingData.pendingComplete) {
                  window.location.href = '/onboarding/creator/socials'
                  return
                }
              } catch (e) {}
            }
            if (companyOnboarding) {
              try {
                const onboardingData = JSON.parse(companyOnboarding)
                if (onboardingData.pendingComplete) {
                  window.location.href = '/onboarding/company/logo'
                  return
                }
              } catch (e) {}
            }

            // Check if user has profile
            setStatus('Verificando perfil...')
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_type')
              .eq('user_id', data.session.user.id)

            if (profiles && profiles.length > 0) {
              const userType = profiles[0].user_type
              if (userType === 'creator') {
                window.location.href = '/creator/dashboard'
                return
              } else if (userType === 'company') {
                window.location.href = '/company/dashboard'
                return
              }
            }

            // No profile, go to select-type
            window.location.href = '/auth/select-type'
            return
          }
        }
      }

      // Check for PKCE code in URL params
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        console.log('[Callback] Found PKCE code, exchanging...')
        setStatus('Procesando código...')

        const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code)

        if (codeError) {
          console.error('[Callback] Code exchange error:', codeError)
          throw codeError
        }

        if (data.session?.user) {
          setStatus('¡Sesión creada!')
          window.location.href = '/auth/select-type'
          return
        }
      }

      // Check for existing session
      console.log('[Callback] No tokens in URL, checking existing session...')
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        console.log('[Callback] Found existing session:', session.user.email)
        window.location.href = '/auth/select-type'
        return
      }

      // No session found
      console.log('[Callback] No session found')
      setError(true)
      setStatus('No se encontró sesión')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)

    } catch (err: any) {
      console.error('[Callback] Error:', err)
      setError(true)
      setStatus(err.message || 'Error de autenticación')
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
