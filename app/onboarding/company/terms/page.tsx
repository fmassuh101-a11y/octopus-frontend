'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Camera, Globe, Music2, Phone, Target, Landmark } from 'lucide-react'

export default function CompanyTermsPage() {
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) {
      window.location.href = '/auth/login'
      return
    }

    const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    setFormData(existing)
  }, [])

  const handleContinue = () => {
    if (!acceptPrivacy || !acceptTerms) return

    localStorage.setItem('companyOnboarding', JSON.stringify({
      ...formData,
      acceptedTerms: true
    }))

    window.location.href = '/onboarding/company/logo'
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
          Paso 5 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
          ))}
          <div className="w-10 h-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
          {[6,7].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-neutral-800 rounded-full"></div>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Términos y Privacidad</h1>
        <p className="text-neutral-500 mb-8">Por favor revisa y acepta nuestros términos y política de privacidad</p>

        {/* Checkboxes */}
        <div className="space-y-6">
          <label className="flex items-start cursor-pointer group">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                acceptPrivacy
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-slate-500'
                  : 'border-neutral-700 group-hover:border-slate-400'
              } text-white placeholder-neutral-500`}>
                {acceptPrivacy && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="ml-4 text-neutral-200">
              Acepto la <Link href="/privacy" className="text-neutral-400 underline hover:text-white font-medium">Política de Privacidad</Link>
            </span>
          </label>

          <label className="flex items-start cursor-pointer group">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                acceptTerms
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-slate-500'
                  : 'border-neutral-700 group-hover:border-slate-400'
              } text-white placeholder-neutral-500`}>
                {acceptTerms && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="ml-4 text-neutral-200">
              Acepto los <Link href="/terms" className="text-neutral-400 underline hover:text-white font-medium">Términos de Servicio</Link>
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-12">
          <Link href="/onboarding/company/socials" className="flex items-center text-neutral-500 hover:text-neutral-200 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </Link>

          <button
            onClick={handleContinue}
            disabled={!acceptPrivacy || !acceptTerms}
            className="px-10 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
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
            {formData.tiktok && (
              <div className="flex items-start space-x-3">
                <Music2 className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">TikTok</p>
                  <p className="font-medium text-white">@{formData.tiktok}</p>
                </div>
              </div>
            )}
            {formData.instagram && (
              <div className="flex items-start space-x-3">
                <Camera className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Instagram</p>
                  <p className="font-medium text-white">@{formData.instagram}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
