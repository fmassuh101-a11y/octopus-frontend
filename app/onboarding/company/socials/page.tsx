'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Camera, Globe, Music2, Phone, Target, Landmark } from 'lucide-react'

export default function CompanySocialsPage() {
  const [tiktok, setTiktok] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) {
      window.location.href = '/auth/login'
      return
    }

    const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    setFormData(existing)
    if (existing.tiktok) setTiktok(existing.tiktok)
    if (existing.instagram) setInstagram(existing.instagram)
    if (existing.linkedin) setLinkedin(existing.linkedin)
  }, [])

  const handleContinue = () => {
    localStorage.setItem('companyOnboarding', JSON.stringify({
      ...formData,
      tiktok,
      instagram,
      linkedin
    }))

    window.location.href = '/onboarding/company/terms'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-950 flex">
      <div className="flex-1 p-8 max-w-2xl">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl text-white font-black">O</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Octopus</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="inline-block px-4 py-1.5 bg-neutral-800 rounded-full text-sm text-neutral-200 font-medium mb-6">
          Paso 4 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          {[1,2,3].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
          ))}
          <div className="w-10 h-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
          {[5,6,7].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-neutral-800 rounded-full"></div>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Tus Redes Sociales</h1>
        <p className="text-neutral-500 mb-8">Agrega información adicional para que los creadores conozcan mejor tu empresa</p>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">TikTok (opcional)</label>
            <div className="flex">
              <span className="px-4 py-3.5 bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl text-neutral-500 font-medium text-white placeholder-neutral-500">@</span>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="tu_usuario"
                className="flex-1 px-4 py-3.5 border border-neutral-800 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-900 shadow-sm text-white placeholder-neutral-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Instagram (opcional)</label>
            <div className="flex">
              <span className="px-4 py-3.5 bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl text-neutral-500 font-medium text-white placeholder-neutral-500">@</span>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="tu_usuario"
                className="flex-1 px-4 py-3.5 border border-neutral-800 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-900 shadow-sm text-white placeholder-neutral-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">LinkedIn (opcional)</label>
            <div className="flex">
              <span className="px-4 py-3.5 bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl text-neutral-500 text-sm font-medium text-white placeholder-neutral-500">linkedin.com/in/</span>
              <input
                type="text"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="tu_perfil"
                className="flex-1 px-4 py-3.5 border border-neutral-800 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-900 shadow-sm text-white placeholder-neutral-500"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-12">
          <Link href="/onboarding/company/about" className="flex items-center text-neutral-500 hover:text-neutral-200 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </Link>

          <button
            onClick={handleContinue}
            className="px-10 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Right Section - Summary Card */}
      <div className="hidden lg:block w-96 bg-neutral-900/50 backdrop-blur-sm p-8 overflow-y-auto border-l border-neutral-800">
        <div className="bg-neutral-900 rounded-3xl p-6 shadow-xl border border-neutral-800 text-white placeholder-neutral-500">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h3 className="font-bold text-white text-lg">Tu Empresa</h3>
          <p className="text-sm text-neutral-500 mb-6">Resumen de tu información</p>

          <div className="border-t border-neutral-800 pt-4 space-y-4 text-sm">
            {formData.companyName && (
              <div className="flex items-start space-x-3">
                <Building2 className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Nombre de empresa</p>
                  <p className="font-medium text-white">{formData.companyName}</p>
                </div>
              </div>
            )}
            {formData.website && (
              <div className="flex items-start space-x-3">
                <Globe className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Sitio web</p>
                  <p className="font-medium text-white">{formData.website}</p>
                </div>
              </div>
            )}
            {formData.phoneNumber && (
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Teléfono</p>
                  <p className="font-medium text-white">{formData.countryCode} {formData.phoneNumber}</p>
                </div>
              </div>
            )}
            {formData.orgType && (
              <div className="flex items-start space-x-3">
                <Landmark className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Tipo de organización</p>
                  <p className="font-medium text-white">{formData.orgType}</p>
                </div>
              </div>
            )}
            {formData.niche && (
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Industria</p>
                  <p className="font-medium text-white">{formData.niche}</p>
                </div>
              </div>
            )}
            {tiktok && (
              <div className="flex items-start space-x-3">
                <Music2 className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">TikTok</p>
                  <p className="font-medium text-white">@{tiktok}</p>
                </div>
              </div>
            )}
            {instagram && (
              <div className="flex items-start space-x-3">
                <Camera className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Instagram</p>
                  <p className="font-medium text-white">@{instagram}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
