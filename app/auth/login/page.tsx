'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { isAdminEmail } from '@/lib/isAdmin'
import OctopusMascot, { OctoMood } from '@/components/OctopusMascot'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  // Estado de ánimo del pulpo según lo que hace el usuario
  const octoMood: OctoMood =
    error ? 'error'
    : loading ? 'success'
    : focusedField === 'password' ? 'hiding'
    : focusedField === 'email' ? 'happy'
    : 'idle'

  // Sigue con la mirada lo que escribís en el email (side-eye)
  const octoLook =
    focusedField === 'email'
      ? { x: Math.max(-0.85, Math.min(0.85, (email.length / 22) * 1.7 - 0.85)), y: 0.42 }
      : null

  // Check if already logged in using localStorage
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        // No session, show login form
        setCheckingSession(false)
        return
      }

      console.log('[Login] Session found, checking profile...')

      try {
        const user = JSON.parse(userStr)

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

        // Admin va directo al panel
        if (isAdminEmail(user.email)) {
          window.location.href = '/admin'
          return
        }

        // Check if user has a profile
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            }
          }
        )

        if (response.ok) {
          const profiles = await response.json()
          if (profiles && profiles.length > 0) {
            const userType = profiles[0].user_type
            console.log('[Login] User has profile, type:', userType)
            if (userType === 'creator') {
              window.location.href = '/creator/dashboard'
              return
            } else if (userType === 'company') {
              window.location.href = '/company/dashboard'
              return
            }
          }
          // Has session but no profile, go to select-type
          console.log('[Login] No profile found, going to select-type')
          window.location.href = '/auth/select-type'
        } else if (response.status === 401) {
          // Token expired, clear and show login
          console.log('[Login] Token expired, clearing session')
          localStorage.removeItem('sb-access-token')
          localStorage.removeItem('sb-refresh-token')
          localStorage.removeItem('sb-user')
          setCheckingSession(false)
        } else {
          // Error, go to select-type as fallback
          window.location.href = '/auth/select-type'
        }
      } catch (err) {
        console.error('[Login] Error checking session:', err)
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    setError('')

    // Login vía fetch directo (el cliente supabase-js se cuelga por locks).
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json()

      if (!res.ok || !data.access_token) {
        const msg = (data?.error_description || data?.msg || data?.error || '').toLowerCase()
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('grant')) {
          setError('Email o contraseña incorrectos')
        } else if (msg.includes('not confirmed')) {
          setError('Debes confirmar tu email antes de iniciar sesión')
        } else {
          setError(data?.error_description || data?.msg || 'Error al iniciar sesión')
        }
        setLoading(false)
        return
      }

      const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user }

      // Store session in localStorage (same format as callback)
      localStorage.setItem('sb-access-token', session.access_token)
      localStorage.setItem('sb-refresh-token', session.refresh_token || '')
      localStorage.setItem('sb-user', JSON.stringify(session.user))

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

      // Admin va directo al panel
      if (isAdminEmail(session.user.email)) {
        window.location.href = '/admin'
        return
      }

      // Check if user has a profile using direct fetch
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${session.user.id}&select=user_type`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
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
      <div className="min-h-[100dvh] bg-[#F7FAFD] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] flex items-center justify-center px-4 py-4 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-cyan-300/45 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-[420px] h-[420px] rounded-full bg-teal-300/40 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="relative z-10 w-full bg-white rounded-[28px] pt-8 px-8 pb-7 shadow-[0_24px_60px_-20px_rgba(56,130,200,0.25)] border border-neutral-100 text-neutral-900">
          <div className="text-center mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 mb-2">Octopus</p>
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-1">Bienvenido</h2>
            <p className="text-neutral-500">Inicia sesión en tu cuenta</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-2">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] text-white py-3.5 px-4 rounded-full font-bold shadow-lg shadow-cyan-200 active:scale-[0.98] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-neutral-600">o</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-neutral-800 py-3.5 px-4 rounded-full font-bold border border-neutral-200 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
            <p className="text-neutral-600 text-sm">
              ¿No tienes una cuenta?{' '}
              <Link href="/auth/register" className="font-medium text-cyan-700 hover:text-cyan-300">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
