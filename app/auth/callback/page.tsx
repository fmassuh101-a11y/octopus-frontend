'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

const ADMIN_EMAIL = 'fmassuh133@gmail.com'

export default function AuthCallback() {
  const [status, setStatus] = useState('Procesando...')
  const [error, setError] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      setStatus('Procesando autenticación...')

      // First, let Supabase handle the OAuth callback automatically
      // (detectSessionInUrl: true handles this)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // If no session from automatic detection, try manual extraction
      let accessToken = session?.access_token
      let refreshToken = session?.refresh_token
      let user = session?.user

      if (!accessToken) {
        // Fallback: Extract tokens from URL hash manually
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        accessToken = hashParams.get('access_token') || undefined
        refreshToken = hashParams.get('refresh_token') || undefined

        if (!accessToken) {
          throw new Error('No access token found')
        }

        // Set session in Supabase client
        const { data, error: setError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (setError) {
          throw setError
        }

        user = data.user || undefined
      }

      if (!user) {
        throw new Error('No user found')
      }

      setStatus('Guardando sesión...')

      // Store in localStorage for app compatibility
      localStorage.setItem('sb-access-token', accessToken)
      localStorage.setItem('sb-refresh-token', refreshToken || '')
      localStorage.setItem('sb-user', JSON.stringify(user))

      setStatus('¡Sesión guardada!')

      // Check if user is admin - redirect directly to admin dashboard
      if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        console.log('[Callback] Admin detected, redirecting to admin dashboard')
        window.location.href = '/admin'
        return
      }

      // Check for pending onboarding
      const creatorOnboarding = localStorage.getItem('creatorOnboarding')
      const companyOnboarding = localStorage.getItem('companyOnboarding')

      if (creatorOnboarding) {
        try {
          const data = JSON.parse(creatorOnboarding)
          if (data.pendingComplete) {
            window.location.href = '/onboarding/creator/socials'
            return
          }
        } catch (e) {}
      }

      if (companyOnboarding) {
        try {
          const data = JSON.parse(companyOnboarding)
          if (data.pendingComplete) {
            window.location.href = '/onboarding/company/logo'
            return
          }
        } catch (e) {}
      }

      // Check if user has profile
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (profileResponse.ok) {
        const profiles = await profileResponse.json()
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
      }

      // No profile, go to select-type
      window.location.href = '/auth/select-type'

    } catch (err: any) {
      console.error('Callback error:', err)
      setError(true)
      setStatus(err.message || 'Error de autenticación')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-blue-900 to-blue-800 flex items-center justify-center">
      <div className="bg-neutral-900 rounded-3xl p-10 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl"></span>
        </div>

        <h2 className={`text-lg font-bold mb-4 ${error ? 'text-red-600' : 'text-white'}`}>
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
