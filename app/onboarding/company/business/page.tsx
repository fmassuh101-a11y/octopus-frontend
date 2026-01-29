'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CompanyBusinessPage() {
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [appStoreUrl, setAppStoreUrl] = useState('')
  const [user, setUser] = useState<any>(null)

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

  const handleContinue = () => {
    if (!companyName || !website) return

    const data = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    localStorage.setItem('companyOnboarding', JSON.stringify({
      ...data,
      companyName,
      website,
      appStoreUrl
    }))

    window.location.href = '/onboarding/company/phone'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-50 flex">
      {/* Left Section */}
      <div className="flex-1 p-8 max-w-2xl">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl text-white">🐙</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Octopus</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 font-medium mb-6">
          Paso 1 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          <div className="w-10 h-2.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full"></div>
          {[2,3,4,5,6,7].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cuéntanos sobre tu empresa</h1>
        <p className="text-gray-500 mb-8">Proporciona el nombre de tu empresa, sitio web y URL de App Store</p>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la empresa *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: Octopus"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sitio web *</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.tuempresa.com"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">URL de App Store (opcional)</label>
            <input
              type="text"
              value={appStoreUrl}
              onChange={(e) => setAppStoreUrl(e.target.value)}
              placeholder="https://apps.apple.com/app/tu-app"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-12">
          <Link href="/auth/select-type" className="flex items-center text-gray-500 hover:text-gray-700 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </Link>

          <button
            onClick={handleContinue}
            disabled={!companyName || !website}
            className="px-10 py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl font-semibold hover:from-slate-600 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Right Section - Summary Card */}
      <div className="hidden lg:block w-96 bg-white/50 backdrop-blur-sm p-8 border-l border-slate-100">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h3 className="font-bold text-gray-900 text-lg">Empresa</h3>
          <p className="text-sm text-gray-500 mb-6">Busco contratar creadores de contenido para mi marca</p>

          {companyName && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-lg">🏢</span>
                <div>
                  <p className="text-xs text-gray-400">Nombre de empresa</p>
                  <p className="font-medium text-gray-800">{companyName}</p>
                </div>
              </div>

              {website && (
                <div className="flex items-start space-x-3">
                  <span className="text-lg">🌐</span>
                  <div>
                    <p className="text-xs text-gray-400">Sitio web</p>
                    <p className="font-medium text-gray-800">{website}</p>
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
