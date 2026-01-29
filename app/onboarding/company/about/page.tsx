'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ORG_TYPES = ['Pre-seed', 'Seed', 'Serie A', 'App Studio', 'Agencia', 'Enterprise']
const HIRING_RANGES = ['1-10', '10-50', '50-100', '100+']
const NICHES = [
  '🗣️ Social y Comunicación',
  '💰 Finanzas y Comercio',
  '🎬 Entretenimiento y Media',
  '🏃 Salud y Fitness',
  '🎓 Educación',
  '✈️ Viajes y Local',
  '🏠 Lifestyle y Utilidades',
  '📷 Foto y Video',
  '🍔 Comida y Bebida',
  '🛍️ Shopping',
  '🎮 Gaming',
  '📰 Noticias',
  '🔧 Otro'
]
const ROLES = ['Fundador / CEO', 'Growth / Marketing', 'Líder Creativo', 'Operador de Agencia', 'Manager de Creadores', 'Otro']
const BUSINESS_TYPES = ['App de Consumo', 'eCommerce', 'SaaS', 'Agencia', 'Negocio de Servicios', 'App Studio', 'Otro']
const MARKETING_STRATEGIES = ['Recién comenzando', 'Lo probé con resultados mixtos', 'Trabajando con equipo interno', 'Trabajando con agencia']

export default function CompanyAboutPage() {
  const [orgType, setOrgType] = useState('')
  const [hiringRange, setHiringRange] = useState('')
  const [niche, setNiche] = useState('')
  const [role, setRole] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [marketingStrategy, setMarketingStrategy] = useState('')
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) {
      window.location.href = '/auth/login'
      return
    }

    const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    setFormData(existing)
    if (existing.orgType) setOrgType(existing.orgType)
    if (existing.hiringRange) setHiringRange(existing.hiringRange)
    if (existing.niche) setNiche(existing.niche)
    if (existing.role) setRole(existing.role)
    if (existing.businessType) setBusinessType(existing.businessType)
    if (existing.marketingStrategy) setMarketingStrategy(existing.marketingStrategy)
  }, [])

  const handleContinue = () => {
    localStorage.setItem('companyOnboarding', JSON.stringify({
      ...formData,
      orgType,
      hiringRange,
      niche,
      role,
      businessType,
      marketingStrategy
    }))

    window.location.href = '/onboarding/company/socials'
  }

  const allFilled = orgType && hiringRange && niche && role && businessType && marketingStrategy

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-50 flex">
      <div className="flex-1 p-8 max-w-2xl overflow-y-auto">
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
          Paso 3 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          {[1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
          ))}
          <div className="w-10 h-2.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full"></div>
          {[4,5,6,7].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cuéntanos sobre ti</h1>
        <p className="text-gray-500 mb-8">Selecciona las respuestas que mejor describan tu organización</p>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">¿Qué describe mejor tu organización?</label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white shadow-sm"
            >
              <option value="">Seleccionar</option>
              {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">¿Cuántas personas buscas contratar?</label>
            <select
              value={hiringRange}
              onChange={(e) => setHiringRange(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white shadow-sm"
            >
              <option value="">Seleccionar</option>
              {HIRING_RANGES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">¿Cuál es la industria de tu empresa?</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white shadow-sm"
            >
              <option value="">Seleccionar</option>
              {NICHES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">¿Cuál es tu rol?</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white shadow-sm"
            >
              <option value="">Seleccionar tu rol</option>
              {ROLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">¿Qué describe mejor tu negocio?</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white shadow-sm"
            >
              <option value="">Seleccionar tipo de negocio</option>
              {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">¿Cuál es tu estrategia de marketing actual?</label>
            <select
              value={marketingStrategy}
              onChange={(e) => setMarketingStrategy(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white shadow-sm"
            >
              <option value="">Seleccionar estrategia</option>
              {MARKETING_STRATEGIES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-12 pb-8">
          <Link href="/onboarding/company/phone" className="flex items-center text-gray-500 hover:text-gray-700 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </Link>

          <button
            onClick={handleContinue}
            disabled={!allFilled}
            className="px-10 py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl font-semibold hover:from-slate-600 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Right Section - Summary Card */}
      <div className="hidden lg:block w-96 bg-white/50 backdrop-blur-sm p-8 overflow-y-auto border-l border-slate-100">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h3 className="font-bold text-gray-900 text-lg">Tu Empresa</h3>
          <p className="text-sm text-gray-500 mb-6">Resumen de tu información</p>

          <div className="border-t border-gray-100 pt-4 space-y-4 text-sm">
            {formData.companyName && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🏢</span>
                <div>
                  <p className="text-xs text-gray-400">Nombre de empresa</p>
                  <p className="font-medium text-gray-800">{formData.companyName}</p>
                </div>
              </div>
            )}
            {formData.website && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🌐</span>
                <div>
                  <p className="text-xs text-gray-400">Sitio web</p>
                  <p className="font-medium text-gray-800">{formData.website}</p>
                </div>
              </div>
            )}
            {formData.phoneNumber && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">📞</span>
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="font-medium text-gray-800">{formData.countryCode} {formData.phoneNumber}</p>
                </div>
              </div>
            )}
            {orgType && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🏛️</span>
                <div>
                  <p className="text-xs text-gray-400">Tipo de organización</p>
                  <p className="font-medium text-gray-800">{orgType}</p>
                </div>
              </div>
            )}
            {hiringRange && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">👥</span>
                <div>
                  <p className="text-xs text-gray-400">Rango de contratación</p>
                  <p className="font-medium text-gray-800">{hiringRange} personas</p>
                </div>
              </div>
            )}
            {niche && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="text-xs text-gray-400">Industria</p>
                  <p className="font-medium text-gray-800">{niche}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
