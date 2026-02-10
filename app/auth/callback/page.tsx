'use client'

import { useEffect, useState } from 'react'
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
      // Extract tokens from URL hash
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (!accessToken) {
        throw new Error('No access token found')
      }

      setStatus('Guardando sesión...')

      // Get user info using the token
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (!userResponse.ok) {
        throw new Error('Error getting user info')
      }

      const user = await userResponse.json()

      // Store in localStorage for the app to use
      localStorage.setItem('sb-access-token', accessToken)
      localStorage.setItem('sb-refresh-token', refreshToken || '')
      localStorage.setItem('sb-user', JSON.stringify(user))

      // Also set in Supabase's expected format
      const sessionData = {
        access_token: accessToken,
        refresh_token: refreshToken || '',
        user: user,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      localStorage.setItem(`sb-ftvqoudlmojdxwjxljzr-auth-token`, JSON.stringify(sessionData))

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
