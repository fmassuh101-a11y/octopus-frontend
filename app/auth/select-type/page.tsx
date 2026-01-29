'use client'

import { useState, useEffect } from 'react'

export default function SelectTypePage() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if logged in
    const token = localStorage.getItem('sb-access-token')
    if (!token) {
      window.location.href = '/auth/login'
    }
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

  if (!mounted) {
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
