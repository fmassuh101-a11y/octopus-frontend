'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'

// Precios ~mitad de SideShift ($199/$299/$999 → nosotros más baratos).
// Máximo 4 planes, incluyendo "Hablemos" (enterprise / contacto).
const PLANS = [
  {
    key: 'free',
    name: 'Gratis',
    monthly: 0,
    tagline: 'Para probar Octopus y lanzar tu primera campaña.',
    highlight: false,
    cta: 'Empezar gratis',
    features: [
      '3 campañas activas',
      'Hasta 5 creadores',
      '1 miembro del equipo',
      '30 invitaciones a creadores',
      'Soporte por chat',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 99,
    tagline: 'Para marcas que quieren contenido de forma constante.',
    highlight: true,
    cta: 'Elegir Pro',
    features: [
      '10 campañas activas',
      'Hasta 15 creadores',
      '3 miembros del equipo',
      '100 invitaciones a creadores',
      'Analíticas de rendimiento',
      '1 impulso de campaña (boost)',
      'Soporte prioritario',
    ],
  },
  {
    key: 'scale',
    name: 'Scale',
    monthly: 499,
    tagline: 'Para escalar contenido a gran volumen.',
    highlight: false,
    cta: 'Elegir Scale',
    features: [
      'Campañas ilimitadas',
      'Creadores ilimitados',
      '10 miembros del equipo',
      'Invitaciones ilimitadas',
      'Analíticas avanzadas',
      '3 impulsos de campaña',
      'Soporte 24/7',
    ],
  },
  {
    key: 'enterprise',
    name: 'Hablemos',
    monthly: null,
    tagline: 'Campañas gestionadas por nosotros, a tu medida.',
    highlight: false,
    cta: 'Contáctanos',
    features: [
      'Todo lo de Scale',
      'Miembros del equipo ilimitados',
      'Manager dedicado',
      'Campañas hechas por nosotros (done-for-you)',
      'Estrategia y check-ins semanales',
    ],
  },
]

export default function CompanyPricing() {
  const [annual, setAnnual] = useState(false)

  const priceFor = (monthly: number | null) => {
    if (monthly === null) return null
    if (monthly === 0) return 0
    return annual ? Math.round(monthly * 0.7) : monthly // 30% off anual
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/company/dashboard" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Volver</span>
          </Link>
          <span className="font-semibold">Planes</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Precios simples para hacer crecer tu marca</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Paga solo por lo que necesitas. Los pagos a los creadores van aparte. Cancela cuando quieras.
          </p>

          {/* Toggle mensual/anual */}
          <div className="inline-flex items-center gap-3 mt-6 bg-neutral-900 border border-neutral-800 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!annual ? 'bg-emerald-500 text-white' : 'text-neutral-400'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${annual ? 'bg-emerald-500 text-white' : 'text-neutral-400'}`}
            >
              Anual <span className="text-emerald-300">-30%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => {
            const price = priceFor(plan.monthly)
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-emerald-500 bg-emerald-500/[0.06] ring-1 ring-emerald-500/30'
                    : 'border-neutral-800 bg-neutral-900'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5" /> Más popular
                  </span>
                )}

                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-3 mb-1 h-12 flex items-end">
                  {price === null ? (
                    <span className="text-3xl font-black">A medida</span>
                  ) : price === 0 ? (
                    <span className="text-4xl font-black">Gratis</span>
                  ) : (
                    <span className="text-4xl font-black">
                      ${price}<span className="text-base font-medium text-neutral-500">/mes</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 mb-5 min-h-[40px]">{plan.tagline}</p>

                {plan.key === 'enterprise' ? (
                  <a
                    href="mailto:fmassuh133@gmail.com?subject=Plan%20Enterprise%20Octopus"
                    className="w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors border border-neutral-700 hover:bg-neutral-800"
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <button
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      plan.highlight ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {plan.cta}
                  </button>
                )}

                <div className="mt-6 space-y-2.5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-neutral-300">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-neutral-500 mt-8">
          Los precios no incluyen lo que pagas a los creadores. Octopus cobra una comisión de 4.5% por pago procesado.
        </p>
      </div>
    </div>
  )
}
