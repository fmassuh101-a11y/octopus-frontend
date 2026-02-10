'use client'

import { useState, useEffect } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

const ADMIN_EMAIL = 'fmassuh133@gmail.com'

export default function SelectTypePage() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user already has a profile
    const checkExistingProfile = async () => {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      console.log('[SelectType] Checking session...', { hasToken: !!token, hasUser: !!userStr })

      if (!token || !userStr) {
        // No session - redirect to login instead of showing selection
        console.log('[SelectType] No session found, redirecting to login')
        window.location.href = '/auth/login'
        return
      }

      try {
        const user = JSON.parse(userStr)
        console.log('[SelectType] User ID:', user.id, 'Email:', user.email)

        // Check if user is admin - redirect directly to admin dashboard
        if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          console.log('[SelectType] Admin detected, redirecting to admin dashboard')
          window.location.href = '/admin'
          return
        }

        // Check if user has profile
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            }
          }
        )

        console.log('[SelectType] Profile check response status:', response.status)

        if (response.ok) {
          const profiles = await response.json()
          console.log('[SelectType] Profiles found:', profiles)

          if (profiles && profiles.length > 0) {
            const userType = profiles[0].user_type
            console.log('[SelectType] User type:', userType)

            if (userType === 'creator') {
              console.log('[SelectType] Redirecting to creator dashboard')
              window.location.href = '/creator/dashboard'
              return
            } else if (userType === 'company') {
              console.log('[SelectType] Redirecting to company dashboard')
              window.location.href = '/company/dashboard'
              return
            }
          }
        } else if (response.status === 401) {
          // Token expired or invalid - clear and redirect to login
          console.log('[SelectType] Token invalid/expired, clearing session')
          localStorage.removeItem('sb-access-token')
          localStorage.removeItem('sb-refresh-token')
          localStorage.removeItem('sb-user')
          window.location.href = '/auth/login'
          return
        } else {
          console.error('[SelectType] Profile check failed:', response.status)
        }
      } catch (err) {
        console.error('[SelectType] Error checking profile:', err)
      }

      // No profile found, show selection form
      console.log('[SelectType] No profile found, showing selection form')
      setLoading(false)
    }

    checkExistingProfile()
  }, [])

  const handleContinue = () => {
    if (!selectedType) return

    if (selectedType === 'creator') {
      localStorage.setItem('creatorOnboarding', JSON.stringify({ userType: 'creator' }))
      window.location.href = '/onboarding/creator/name'
    } else {
      localStorage.setItem('companyOnboarding', JSON.stringify({ userType: 'company' }))
      window.location.href = '/onboarding/company/business'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐙</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Octopus</h1>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">¿Qué eres?</h2>
            <p className="text-white/60">Selecciona tu tipo de cuenta</p>
          </div>

          <div className="space-y-4 mb-8">
            {/* Creator Option */}
            <button
              onClick={() => setSelectedType('creator')}
              className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                selectedType === 'creator'
                  ? 'border-white bg-white/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Soy Creador</h3>
                  <p className="text-sm text-white/60">Quiero crear contenido y trabajar con marcas</p>
                </div>
                {selectedType === 'creator' && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black text-sm">✓</span>
                  </div>
                )}
              </div>
            </button>

            {/* Company Option */}
            <button
              onClick={() => setSelectedType('company')}
              className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                selectedType === 'company'
                  ? 'border-white bg-white/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Soy Empresa</h3>
                  <p className="text-sm text-white/60">Quiero contratar creadores para mi marca</p>
                </div>
                {selectedType === 'company' && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black text-sm">✓</span>
                  </div>
                )}
              </div>
            </button>
          </div>

          <button
            onClick={handleContinue}
            disabled={!selectedType}
            className="w-full bg-white text-black py-3.5 rounded-xl font-bold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Continuar
          </button>

          <p className="text-center text-white/40 text-sm mt-6">
            ¿Ya tienes una cuenta?{' '}
            <a href="/auth/login" className="text-white hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
