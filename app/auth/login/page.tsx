'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if already logged in using localStorage - simplified to avoid redirect loops
  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (token && userStr) {
      console.log('[Login] Session found, checking where to redirect...')

      // Check for pending onboarding first
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

      // Has session, go directly to select-type which will route appropriately
      // Don't do profile checks here to avoid redirect loops
      window.location.href = '/auth/select-type'
      return
    }

    // No session, show login form
    setCheckingSession(false)
  }, [])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('[Login] Attempting sign in...')

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        console.error('[Login] Sign in error:', signInError)
        if (signInError.message?.includes('Invalid login') || signInError.message?.includes('invalid_grant')) {
          setError('Email o contraseña incorrectos')
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Debes confirmar tu email antes de iniciar sesión')
        } else {
          setError(signInError.message || 'Error al iniciar sesión')
        }
        setLoading(false)
        return
      }

      if (!data.session) {
        setError('Error al iniciar sesión - no se pudo crear la sesión')
        setLoading(false)
        return
      }

      console.log('[Login] Sign in successful:', data.session.user.email)

      // Store session in localStorage (same format as callback)
      localStorage.setItem('sb-access-token', data.session.access_token)
      localStorage.setItem('sb-refresh-token', data.session.refresh_token || '')
      localStorage.setItem('sb-user', JSON.stringify(data.session.user))

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

      // Check if user has a profile using direct fetch
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${data.session.user.id}&select=user_type`,
        {
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
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

      // No profile found, go to select-type
      window.location.href = '/auth/select-type'

    } catch (err: any) {
      console.error('[Login] Error:', err)
      setError(err.message || 'Error de conexión. Verifica tu internet.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      console.log('[Login] Starting Google OAuth...')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      console.log('[Login] OAuth response:', { url: data?.url, error: error?.message })

      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      console.error('[Login] Google OAuth error:', err)
      setError(err.message || 'Error al iniciar con Google')
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-blue-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="flex justify-center items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">🐙</span>
            </div>
            <span className="text-2xl font-bold text-white">Octopus</span>
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Bienvenido</h2>
            <p className="text-blue-100">Inicia sesión en tu cuenta</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-2">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-blue-100">o</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-blue-100 text-sm">
              ¿No tienes una cuenta?{' '}
              <Link href="/auth/register" className="font-medium text-white hover:text-blue-200">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
