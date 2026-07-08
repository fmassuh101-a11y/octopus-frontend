'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Check, Sparkles, Gift, X, Loader2 } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { authHeaders } from '@/lib/auth/clientToken'
import { getPlan } from '@/lib/plans'

const WhopCheckoutEmbed = dynamic(
  () => import('@whop/checkout/react').then((m: any) => m.WhopCheckoutEmbed),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-2xl bg-neutral-800" /> }
) as any

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
  const [myProfile, setMyProfile] = useState<any>(null)
  const [customOffer, setCustomOffer] = useState<any>(null)
  const [acceptingOffer, setAcceptingOffer] = useState(false)

  // checkout de suscripción (Whop)
  const [subBusy, setSubBusy] = useState<string | null>(null)
  const [subCheckout, setSubCheckout] = useState<{ planId: string; sessionId?: string; subId: string; label?: string; price?: number; environment?: string } | null>(null)

  const startSubscription = async (planKey: string) => {
    setSubBusy(planKey)
    try {
      const res = await fetch('/api/whop/subscribe', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tier: `company_${planKey}`, period: periodKey }),
      })
      const data = await res.json()
      if (data.ok && data.planId) setSubCheckout(data)
      else alert(data.error || 'No se pudo iniciar la suscripción')
    } catch { alert('No se pudo iniciar la suscripción') }
    setSubBusy(null)
  }

  const verifySub = async (receiptId?: string) => {
    if (!subCheckout) return
    try {
      const params = new URLSearchParams({ subId: subCheckout.subId })
      if (receiptId) params.set('receiptId', receiptId)
      const res = await fetch(`/api/whop/subscribe?${params.toString()}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.paid) {
        setSubCheckout(null)
        alert('¡Plan activado! Bienvenido.')
        window.location.reload()
      } else if (data.error) alert(data.error)
    } catch {}
  }

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    const u = JSON.parse(userStr)
    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${u.id}&select=plan,plan_source,discount_percent`,
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } })
      .then(r => r.ok ? r.json() : []).then(d => setMyProfile(d[0] || null)).catch(() => {})
    // ¿tiene una oferta a medida del equipo Octopus?
    fetch(`${SUPABASE_URL}/rest/v1/contact_requests?user_id=eq.${u.id}&offer_status=eq.offered&select=*&order=created_at.desc&limit=1`,
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } })
      .then(r => r.ok ? r.json() : []).then(d => setCustomOffer(d[0] || null)).catch(() => {})
  }, [])

  const acceptOffer = async () => {
    if (!customOffer) return
    setAcceptingOffer(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests?id=eq.${customOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ offer_status: 'accepted' }),
      })
      if (res.ok) { alert('¡Genial! Aceptaste la oferta. Nuestro equipo te contactará para activar tu plan.'); setCustomOffer(null) }
      else alert('No se pudo aceptar. Intenta de nuevo.')
    } catch { alert('Error al aceptar.') } finally { setAcceptingOffer(false) }
  }

  const currentPlanKey = myProfile?.plan || 'starter'
  const discount = myProfile?.discount_percent || 0

  // Precio base por periodo, SIN descuento personal
  const basePrice = (monthly: number | null) => {
    if (monthly === null) return null
    if (monthly === 0) return 0
    return Math.round(monthly * (1 - period.off))
  }
  // Precio final CON el descuento regalado por el admin
  const priceFor = (monthly: number | null) => {
    const base = basePrice(monthly)
    if (base === null || base === 0) return base
    return Math.round(base * (1 - discount / 100))
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

        {/* Oferta a medida del equipo Octopus */}
        {customOffer && (
          <div className="mb-8 max-w-2xl mx-auto bg-emerald-500/[0.06] border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Tienes una oferta a medida</h3>
            </div>
            <p className="text-neutral-400 text-sm mb-4">Nuestro equipo preparó un plan especial para tu marca:</p>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-neutral-900 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white">{customOffer.offer_price}</p>
                <p className="text-xs text-neutral-500">Precio</p>
              </div>
              <div className="bg-neutral-900 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-400">{customOffer.offer_commission}</p>
                <p className="text-xs text-neutral-500">Comisión</p>
              </div>
              <div className="bg-neutral-900 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{customOffer.offer_seats}</p>
                <p className="text-xs text-neutral-500">Equipo</p>
              </div>
            </div>
            {customOffer.offer_message && <p className="text-sm text-neutral-300 mb-4">{customOffer.offer_message}</p>}
            <button onClick={acceptOffer} disabled={acceptingOffer}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold transition-colors mb-3">
              {acceptingOffer ? 'Aceptando...' : 'Aceptar y contratar este plan'}
            </button>
            <button disabled
              className="w-full py-2.5 rounded-xl border border-neutral-800 text-neutral-500 text-sm font-medium cursor-not-allowed">
              ¿Sigues con dudas? Agenda una llamada con nosotros (pronto)
            </button>
          </div>
        )}

        {/* Banner del plan actual / regalo / descuento */}
        {myProfile && (myProfile.plan_source === 'gifted' || (myProfile.discount_percent || 0) > 0 || currentPlanKey !== 'starter') && (
          <div className="mb-6 max-w-2xl mx-auto flex items-center justify-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
            <Gift className="w-4 h-4 flex-shrink-0" />
            <span>
              {myProfile.plan_source === 'gifted'
                ? `Te regalaron el plan ${getPlan(currentPlanKey).name}`
                : `Tu plan actual: ${getPlan(currentPlanKey).name}`}
              {(myProfile.discount_percent || 0) > 0 && ` · ${myProfile.discount_percent}% de descuento en comisión`}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map(plan => {
            const price = priceFor(plan.monthly)
            const isCurrent = plan.key === currentPlanKey
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
                <div className="mt-3 mb-1 h-12 flex items-end gap-2">
                  {price === null ? (
                    <span className="text-3xl font-black">A medida</span>
                  ) : price === 0 ? (
                    <span className="text-4xl font-black">$0<span className="text-base font-medium text-neutral-500">/mes</span></span>
                  ) : (
                    <>
                      <span className="text-4xl font-black">
                        ${price}<span className="text-base font-medium text-neutral-500">/mes</span>
                      </span>
                      {discount > 0 && basePrice(plan.monthly)! > price && (
                        <span className="text-sm text-neutral-500 line-through mb-1.5">${basePrice(plan.monthly)}</span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mb-2 h-4">{price && price > 0 && period.note ? period.note : ''}</p>
                <p className="text-sm text-neutral-400 mb-3 min-h-[40px]">{plan.tagline}</p>

                {plan.trial && (
                  <div className="mb-4 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
                    3 días de prueba gratis
                  </div>
                )}

                {isCurrent ? (
                  <div className="w-full text-center py-2.5 rounded-xl font-semibold text-sm border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                    ✓ Tu plan actual
                  </div>
                ) : plan.key === 'enterprise' ? (
                  <Link
                    href="/company/contact"
                    className="w-full block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors border border-neutral-700 hover:bg-neutral-800"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => plan.monthly ? startSubscription(plan.key) : null}
                    disabled={subBusy === plan.key}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                      currentPlanKey !== 'starter'
                        ? 'border border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        : plan.highlight ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {subBusy === plan.key ? 'Cargando…' : currentPlanKey !== 'starter' ? 'Cambiar a este plan' : plan.cta}
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

      {/* checkout embebido de la suscripción */}
      {subCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={() => setSubCheckout(null)}>
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-lg font-extrabold text-neutral-900">{subCheckout.label || 'Suscribirte'}</p>
                {subCheckout.price ? <p className="text-sm text-neutral-500">${subCheckout.price} por período</p> : null}
              </div>
              <button onClick={() => setSubCheckout(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <WhopCheckoutEmbed
              planId={subCheckout.planId}
              {...(subCheckout.sessionId ? { sessionId: subCheckout.sessionId } : {})}
              {...(subCheckout.environment === 'sandbox' ? { environment: 'sandbox' } : {})}
              theme="light"
              skipRedirect
              onComplete={(_pid: string, receiptId?: string) => verifySub(receiptId)}
            />
            <button onClick={() => verifySub()} className="mt-3 w-full rounded-full border-2 border-emerald-500 py-3 font-bold text-emerald-600">
              Ya pagué — verificar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
