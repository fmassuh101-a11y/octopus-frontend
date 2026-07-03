'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { countries } from '@/lib/data/countries'
import { Building2, Globe, Phone } from 'lucide-react'

export default function CompanyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+56')
  const [formData, setFormData] = useState<any>({})
  const [showCountrySearch, setShowCountrySearch] = useState(false)
  const [countrySearchQuery, setCountrySearchQuery] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) {
      window.location.href = '/auth/login'
      return
    }

    const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    setFormData(existing)
    if (existing.phoneNumber) setPhoneNumber(existing.phoneNumber)
    if (existing.countryCode) setCountryCode(existing.countryCode)
  }, [])

  // Only allow numbers in phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Remove all non-digits
    setPhoneNumber(value)
  }

  const handleContinue = () => {
    if (!phoneNumber || phoneNumber.length < 7) return

    localStorage.setItem('companyOnboarding', JSON.stringify({
      ...formData,
      phoneNumber,
      countryCode
    }))

    window.location.href = '/onboarding/company/about'
  }

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.code.includes(countrySearchQuery) ||
    country.searchKeys.some(key => key.includes(countrySearchQuery.toLowerCase()))
  )

  const selectedCountry = countries.find(c => c.code === countryCode) || countries.find(c => c.code === '+56')

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
          Paso 2 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          <div className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
          <div className="w-10 h-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
          {[3,4,5,6,7].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-neutral-800 rounded-full"></div>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Número de Teléfono</h1>
        <p className="text-neutral-500 mb-8">Ingresa tu número de contacto. Nunca lo compartiremos con nadie.</p>

        {/* Form */}
        <div className="relative">
          <label className="block text-sm font-semibold text-neutral-200 mb-2">Teléfono *</label>
          <div className="flex">
            <button
              type="button"
              onClick={() => setShowCountrySearch(!showCountrySearch)}
              className="px-4 py-3.5 border border-neutral-800 rounded-l-xl bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium flex items-center gap-2 min-w-[120px] text-white placeholder-neutral-500"
            >
              <span>{selectedCountry?.flag}</span>
              <span>{selectedCountry?.code}</span>
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="912345678"
              className="flex-1 px-4 py-3.5 border border-l-0 border-neutral-800 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-900 shadow-sm text-white placeholder-neutral-500"
            />
          </div>

          {/* Country Search Dropdown */}
          {showCountrySearch && (
            <div className="absolute top-full left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-xl mt-2 shadow-xl z-20 max-h-80 overflow-hidden text-white placeholder-neutral-500">
              <div className="p-3 border-b border-neutral-800">
                <input
                  type="text"
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  placeholder="Buscar país..."
                  className="w-full p-2 border border-neutral-800 rounded-lg focus:outline-none bg-neutral-900 focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredCountries.map((country, index) => (
                  <button
                    key={`${country.code}-${country.name}-${index}`}
                    onClick={() => {
                      setCountryCode(country.code)
                      setShowCountrySearch(false)
                      setCountrySearchQuery('')
                    }}
                    className="w-full p-3 text-left hover:bg-neutral-950 flex items-center gap-3 border-b border-gray-50 last:border-b-0"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 font-medium text-white">{country.name}</span>
                    <span className="text-neutral-500">{country.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phoneNumber && phoneNumber.length < 7 && (
            <p className="text-red-500 text-sm mt-2">El número debe tener al menos 7 dígitos</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-12">
          <Link href="/onboarding/company/business" className="flex items-center text-neutral-500 hover:text-neutral-200 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </Link>

          <button
            onClick={handleContinue}
            disabled={!phoneNumber}
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

          <h3 className="font-bold text-white text-lg">Tu Empresa</h3>
          <p className="text-sm text-neutral-500 mb-6">Resumen de tu información</p>

          <div className="border-t border-neutral-800 pt-4 space-y-4">
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

            {phoneNumber && (
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5" strokeWidth={2} />
                <div>
                  <p className="text-xs text-neutral-500">Teléfono</p>
                  <p className="font-medium text-white">{countryCode} {phoneNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
