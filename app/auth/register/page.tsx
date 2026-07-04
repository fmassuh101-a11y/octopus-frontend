'use client'

import { useState } from 'react'
import OctopusMascot, { OctoMood } from '@/components/OctopusMascot'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { validateEmail } from '@/lib/validateEmail'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'confirm' | null>(null)

  const octoMood: OctoMood =
    error ? 'error'
    : loading ? 'success'
    : (focusedField === 'password' || focusedField === 'confirm') ? 'hiding'
    : focusedField === 'email' ? 'happy'
    : 'idle'

  const octoLook =
    focusedField === 'email'
      ? { x: Math.min(1, (email.length / 24) * 2 - 1), y: 0.7 }
      : null

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword) {
      setError('Por favor completa todos los campos')
      return
    }

    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) {
      setError(emailCheck.message || 'Email inválido')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')

    // Registro vía fetch directo al Auth API de Supabase.
    // El cliente supabase-js se cuelga en el navegador (locks), por eso
    // NO lo usamos acá. Timeout de 20s para que nunca quede colgado.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          data: { full_name: email.split('@')[0] },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json()

      if (!res.ok) {
        const msg = (data?.msg || data?.error_description || data?.error || '').toLowerCase()
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          setError('Este email ya está registrado. Intenta iniciar sesión.')
        } else if (msg.includes('password')) {
          setError('La contraseña debe tener al menos 6 caracteres.')
        } else {
          setError(data?.msg || data?.error_description || 'Error al crear cuenta')
        }
        setLoading(false)
        return
      }

      // Con "Confirm email" apagado, el signup devuelve la sesión directo
      if (data.access_token && data.user) {
        localStorage.setItem('sb-access-token', data.access_token)
        localStorage.setItem('sb-refresh-token', data.refresh_token || '')
        localStorage.setItem('sb-user', JSON.stringify(data.user))
        window.location.href = '/auth/select-type'
        return
      }

      // Usuario creado sin sesión (confirmación de email activada): logueamos vía token endpoint
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      })
      const loginData = await loginRes.json()
      if (loginRes.ok && loginData.access_token) {
        localStorage.setItem('sb-access-token', loginData.access_token)
        localStorage.setItem('sb-refresh-token', loginData.refresh_token || '')
        localStorage.setItem('sb-user', JSON.stringify(loginData.user))
        window.location.href = '/auth/select-type'
        return
      }

      setError('Cuenta creada. Por favor inicia sesión.')
      setLoading(false)
    } catch (err: any) {
      clearTimeout(timeout)
      console.error('[Register] Error:', err)
      setError(err.name === 'AbortError' ? 'La conexión tardó demasiado. Intenta de nuevo.' : (err.message || 'Error de conexión.'))
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      console.log('[Register] Starting Google OAuth...')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      console.log('[Register] OAuth response:', { url: data?.url, error: error?.message })

      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      console.error('[Register] Google OAuth error:', err)
      setError(err.message || 'Error al iniciar con Google')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center -mb-1">
            <OctopusMascot mood={octoMood} look={octoLook} size={150} />
          </div>
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-white block tracking-tight">Octopus</span>
          </Link>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-8 shadow-xl border border-neutral-800 text-white placeholder-neutral-500">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Crear cuenta</h2>
            <p className="text-neutral-400">Empieza a ganar con tu contenido</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-neutral-300">o</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-neutral-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-neutral-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Registrarse con Google</span>
          </button>

          <div className="mt-8 text-center">
            <p className="text-neutral-300 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/auth/login" className="font-medium text-emerald-400 hover:text-emerald-300">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
