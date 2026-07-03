'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Globe } from 'lucide-react'

export default function CompanyBusinessPage() {
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [appStoreUrl, setAppStoreUrl] = useState('')
  const [user, setUser] = useState<any>(null)
  const [errors, setErrors] = useState<{companyName?: string, website?: string, appStoreUrl?: string}>({})

  useEffect(() => {
    const userStr = localStorage.getItem('sb-user')
    const token = localStorage.getItem('sb-access-token')
    if (!userStr || !token) {
      window.location.href = '/auth/login'
      return
    }
    setUser(JSON.parse(userStr))

    const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    if (existing.companyName) setCompanyName(existing.companyName)
    if (existing.website) setWebsite(existing.website)
    if (existing.appStoreUrl) setAppStoreUrl(existing.appStoreUrl)
  }, [])

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    if (!url) return false
    // Add https:// if no protocol specified
    const urlToCheck = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    try {
      const parsed = new URL(urlToCheck)
      // Must have a valid domain with at least one dot
      return parsed.hostname.includes('.') && parsed.hostname.length > 3
    } catch {
      return false
    }
  }

  // Validate company name (at least 2 characters, no random letters)
  const isValidCompanyName = (name: string): boolean => {
    if (!name || name.length < 2) return false
    // Must have at least one vowel (indicates real word)
    const hasVowel = /[aeiouáéíóúAEIOUÁÉÍÓÚ]/.test(name)
    return hasVowel
  }

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!isValidCompanyName(companyName)) {
      newErrors.companyName = 'Ingresa un nombre de empresa válido'
    }

    if (!isValidUrl(website)) {
      newErrors.website = 'Ingresa una URL válida (ej: www.tuempresa.com)'
    }

    if (appStoreUrl && !isValidUrl(appStoreUrl)) {
      newErrors.appStoreUrl = 'Ingresa una URL válida de App Store'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (!validateForm()) return

    // Format website with https:// if needed
    let formattedWebsite = website
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      formattedWebsite = `https://${website}`
    }

    let formattedAppStoreUrl = appStoreUrl
    if (appStoreUrl && !appStoreUrl.startsWith('http://') && !appStoreUrl.startsWith('https://')) {
      formattedAppStoreUrl = `https://${appStoreUrl}`
    }

    const data = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    localStorage.setItem('companyOnboarding', JSON.stringify({
      ...data,
      companyName: companyName.trim(),
      website: formattedWebsite,
      appStoreUrl: formattedAppStoreUrl
    }))

    window.location.href = '/onboarding/company/phone'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-950 flex">
      {/* Left Section */}
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
          Paso 1 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          <div className="w-10 h-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
          {[2,3,4,5,6,7].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-neutral-800 rounded-full"></div>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Cuéntanos sobre tu empresa</h1>
        <p className="text-neutral-500 mb-8">Proporciona el nombre de tu empresa, sitio web y URL de App Store</p>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Nombre de la empresa *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value)
                if (errors.companyName) setErrors({...errors, companyName: undefined})
              }}
              placeholder="Ej: Octopus, Nike, Apple"
              className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-neutral-900 shadow-sm ${errors.companyName ? 'border-red-500' : 'border-neutral-800'} text-white placeholder-neutral-500`}
            />
            {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Sitio web *</label>
            <input
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value)
                if (errors.website) setErrors({...errors, website: undefined})
              }}
              placeholder="www.tuempresa.com"
              className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-neutral-900 shadow-sm ${errors.website ? 'border-red-500' : 'border-neutral-800'} text-white placeholder-neutral-500`}
            />
            {errors.website && <p className="text-red-500 text-sm mt-1">{errors.website}</p>}
            <p className="text-neutral-500 text-xs mt-1">Ejemplo: www.miempresa.com o https://miempresa.com</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">URL de App Store (opcional)</label>
            <input
              type="url"
              value={appStoreUrl}
              onChange={(e) => {
                setAppStoreUrl(e.target.value)
                if (errors.appStoreUrl) setErrors({...errors, appStoreUrl: undefined})
              }}
              placeholder="apps.apple.com/app/tu-app"
              className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-neutral-900 shadow-sm ${errors.appStoreUrl ? 'border-red-500' : 'border-neutral-800'} text-white placeholder-neutral-500`}
            />
            {errors.appStoreUrl && <p className="text-red-500 text-sm mt-1">{errors.appStoreUrl}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-12">
          <Link href="/auth/select-type" className="flex items-center text-neutral-500 hover:text-neutral-200 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </Link>

          <button
            onClick={handleContinue}
            disabled={!companyName || !website}
            className="px-10 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Right Section - Summary Card */}
      <div className="hidden lg:block w-96 bg-neutral-900/50 backdrop-blur-sm p-8 border-l border-neutral-800">
        <div className="bg-neutral-900 rounded-3xl p-6 shadow-xl border border-neutral-800 text-white placeholder-neutral-500">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h3 className="font-bold text-white text-lg">Empresa</h3>
          <p className="text-sm text-neutral-500 mb-6">Busco contratar creadores de contenido para mi marca</p>

          {companyName && (
            <div className="border-t border-neutral-800 pt-4 space-y-4">
              <div className="flex items-start space-x-3">
                <Building2 className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Nombre de empresa</p>
                  <p className="font-medium text-white">{companyName}</p>
                </div>
              </div>

              {website && (
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5" strokeWidth={2} />
                  <div>
                    <p className="text-xs text-neutral-500">Sitio web</p>
                    <p className="font-medium text-white">{website}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
