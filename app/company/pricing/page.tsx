'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'

// Periodos de facturación — más largo, más descuento (que "tenga sentido").
// Por defecto mostramos ANUAL (con descuento) para anclar el precio bajo.
const PERIODS = [
  { key: 'anual', label: 'Anual', off: 0.30, note: 'facturado anual' },
  { key: 'semestral', label: 'Semestral', off: 0.15, note: 'facturado cada 6 meses' },
  { key: 'mensual', label: 'Mensual', off: 0, note: '' },
] as const

const PLANS = [
  {
    key: 'starter', name: 'Starter', monthly: 0, badge: 'Versión gratis',
    tagline: 'Para empezar y publicar tu primera campaña.', highlight: false, cta: 'Empezar', trial: false,
    features: ['1 campaña en el feed', 'Máximo 2 creadores contratados', '1 miembro del equipo', 'Comisión de 7% al depositar', 'Sin analíticas'],
  },
  {
    key: 'pro', name: 'Pro', monthly: 99, badge: 'Más popular',
    tagline: 'Para marcas que quieren contenido constante.', highlight: true, cta: 'Elegir Pro', trial: true,
    features: ['3 campañas publicadas en el feed', 'Hasta 5 campañas activas (2 por link privado)', '3 miembros del equipo', 'Analíticas de rendimiento', 'Soporte funcional cuando lo necesites', 'Comisión reducida de 4.7% al depositar'],
  },
  {
    key: 'scale', name: 'Scale', monthly: 499, badge: 'Mejor para escalar',
    tagline: 'Para escalar contenido a gran volumen.', highlight: false, cta: 'Elegir Scale', trial: false,
    features: ['10 campañas al feed por mes', 'Hasta 15 campañas creadas', '10 miembros del equipo', 'Analíticas avanzadas + reportes exportables', 'Campañas destacadas (boost)', 'Gerente de cuenta dedicado', 'Soporte 24/7', 'Comisión mínima de 2.3% al depositar'],
  },
  {
    key: 'enterprise', name: 'Hablemos', monthly: null, badge: 'Crece con nosotros',
    tagline: 'Nosotros creamos y gestionamos tus campañas por ti.', highlight: false, cta: 'Hablemos', trial: false,
    features: ['Todo lo de Scale, sin límites', 'Miembros del equipo ilimitados', 'Campañas "Listas para ti" (creadas por nuestro equipo)', 'Estrategia y check-ins semanales', 'Comisión a medida — ¡hasta 0%!'],
  },
]

export default function CompanyPricing() {
  const [periodKey, setPeriodKey] = useState<'anual' | 'semestral' | 'mensual'>('anual')
  const period = PERIODS.find(p => p.key === periodKey)!

  const priceFor = (monthly: number | null) => {
    if (monthly === null) return null
    if (monthly === 0) return 0
    return Math.round(monthly * (1 - period.off))
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
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
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Precios simples para hacer crecer tu marca</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Prueba Pro gratis por 3 días. Los pagos a los creadores van aparte. Cancela cuando quieras.
          </p>

          {/* Toggle de periodo (anual primero) */}
          <div className="inline-flex items-center gap-1 mt-6 bg-neutral-900 border border-neutral-800 rounded-full p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodKey(p.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  periodKey === p.key ? 'bg-emerald-500 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {p.label}{p.off > 0 && <span className={periodKey === p.key ? 'text-emerald-100' : 'text-emerald-400'}> -{Math.round(p.off * 100)}%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map(plan => {
            const price = priceFor(plan.monthly)
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlight
                    ? 'border-emerald-500 bg-emerald-500/[0.06] ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                }`}
              >
                {/* Badge por card */}
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                  plan.highlight ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                }`}>
                  {plan.highlight && <Sparkles className="w-3.5 h-3.5" />}
                  {plan.badge}
                </span>

                <h3 className="text-lg font-bold mt-1">{plan.name}</h3>
                <div className="mt-3 mb-1 h-12 flex items-end">
                  {price === null ? (
                    <span className="text-3xl font-black">A medida</span>
                  ) : price === 0 ? (
                    <span className="text-4xl font-black">$0<span className="text-base font-medium text-neutral-500">/mes</span></span>
                  ) : (
                    <span className="text-4xl font-black">
                      ${price}<span className="text-base font-medium text-neutral-500">/mes</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mb-2 h-4">{price && price > 0 && period.note ? period.note : ''}</p>
                <p className="text-sm text-neutral-400 mb-3 min-h-[40px]">{plan.tagline}</p>

                {plan.trial && (
                  <div className="mb-4 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
                    3 días de prueba gratis
                  </div>
                )}

                {plan.key === 'enterprise' ? (
                  <Link
                    href="/company/contact"
                    className="w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors border border-neutral-700 hover:bg-neutral-800"
                  >
                    {plan.cta}
                  </Link>
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
          La comisión por pago baja según tu plan: Starter 7% · Pro 4.7% · Scale 2.3% · Enterprise hasta 0%.
        </p>
      </div>
    </div>
  )
}
