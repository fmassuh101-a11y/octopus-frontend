'use client'

import { useEffect, useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

export default function AuthCallback() {
  const [status, setStatus] = useState('Procesando...')
  const [error, setError] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  // Helper to check profile and redirect appropriately
  const checkProfileAndRedirect = async (accessToken: string, userId: string) => {
    try {
      setStatus('Verificando perfil...')
      const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (profileResponse.ok) {
        const profiles = await profileResponse.json()
        console.log('Profiles found:', profiles)

        if (profiles && profiles.length > 0) {
          const userType = profiles[0].user_type
          console.log('User type:', userType)

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
      }
    } catch (err) {
      console.error('Error checking profile:', err)
    }

    // No profile found, go to select-type
    setStatus('¡Listo! Configurando tu cuenta...')
    setTimeout(() => { window.location.href = '/auth/select-type' }, 500)
  }

  const handleCallback = async () => {
    try {
      // Check for access_token in hash (implicit flow)
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken) {
        setStatus('Guardando sesión...')

        // Store tokens directly - NO supabase client
        localStorage.setItem('sb-access-token', accessToken)
        localStorage.setItem('sb-refresh-token', refreshToken || '')

        // Get user info from token
        let userId = ''
        try {
          const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': SUPABASE_ANON_KEY || ''
            }
          })
          const user = await response.json()
          localStorage.setItem('sb-user', JSON.stringify(user))
          userId = user.id
        } catch (e) {
          console.log('Could not fetch user info')
        }

        // Check profile and redirect
        if (userId) {
          await checkProfileAndRedirect(accessToken, userId)
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

        // Exchange code for session
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify({
            auth_code: code,
            code_verifier: localStorage.getItem('code_verifier') || ''
          })
        })

        if (response.ok) {
          const data = await response.json()
          localStorage.setItem('sb-access-token', data.access_token)
          localStorage.setItem('sb-refresh-token', data.refresh_token || '')
          localStorage.setItem('sb-user', JSON.stringify(data.user))

          // Check profile and redirect
          await checkProfileAndRedirect(data.access_token, data.user.id)
          return
        }
      }

      // Check if we already have a session
      const existingToken = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (existingToken && userStr) {
        const user = JSON.parse(userStr)
        await checkProfileAndRedirect(existingToken, user.id)
        return
      }

      // No tokens found
      setError(true)
      setStatus('No se encontró sesión')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)

    } catch (err) {
      console.error('Callback error:', err)
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
