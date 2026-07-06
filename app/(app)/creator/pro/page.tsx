'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sky from '@/components/oct/Sky'
import { toast } from '@/components/oct/toast'
import { X, Check, Send } from 'lucide-react'

// Paywall Pro — copia del "Pro creators earn 400% more" de SideShift.
// Sin cobro real por ahora: el botón avisa que los pagos se conectan pronto.
const BENEFITS = [
  { t: 'Postulaciones ilimitadas', d: 'Postulá a todas las campañas que quieras, sin tope diario.' },
  { t: 'Prioridad ante las marcas', d: 'Tu perfil aparece primero en las búsquedas de las empresas.' },
  { t: 'Comisión reducida', d: 'Te quedás con más de lo que ganás en cada trabajo.' },
  { t: 'Soporte prioritario', d: 'Te respondemos antes que a nadie.' },
]

export default function ProPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual')

  return (
    <div className="relative min-h-[100dvh] bg-white pb-56 text-neutral-900">
      <Sky height={230} />
      <div className="relative mx-auto w-full max-w-md px-5 pt-4 md:max-w-lg lg:max-w-xl">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/dashboard'))}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/90 shadow-sm transition-transform active:scale-90" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>

        {/* ilustración */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#34D399] to-[#0EA472] shadow-lg shadow-emerald-200">
            <Send className="h-11 w-11 -rotate-12 text-white" />
            <span className="absolute -bottom-2 rounded-full border border-emerald-200 bg-white px-3 py-0.5 text-xs font-bold text-emerald-600 shadow-sm">Pro</span>
          </div>
        </div>

        <h1 className="mt-7 text-center text-[36px] font-extrabold leading-tight tracking-tight">
          Los creadores Pro<br />ganan 400% más
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-lg text-neutral-500">
          Postulá más, aparecé primero y quedate con más de lo que ganás con las marcas.
        </p>
        <div className="mx-auto mt-4 w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
          Los mejores creadores Pro ganan hasta $15k/mes
        </div>

        {/* beneficios */}
        <div className="mt-7 space-y-1 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          {BENEFITS.map((b) => (
            <div key={b.t} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />
              </span>
              <div>
                <p className="text-[17px] font-bold leading-snug">{b.t}</p>
                <p className="text-neutral-500">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* selector de plan + CTA sticky */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-100 bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+86px)] pt-4 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md md:max-w-lg">
          <div className="flex items-center justify-between">
            <p className="font-extrabold">Elegí tu plan</p>
            <p className="text-sm text-neutral-500">Cancelá cuando quieras</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button onClick={() => setPlan('annual')}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${plan === 'annual' ? 'border-emerald-400 bg-emerald-50/50' : 'border-neutral-200 bg-white'}`}>
              <span className="absolute -top-2.5 left-3 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-black text-amber-900">AHORRÁ 50%</span>
              <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${plan === 'annual' ? 'bg-emerald-500' : 'border-2 border-neutral-200'}`}>
                {plan === 'annual' && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
              </span>
              <p className="mt-1 font-bold">Pro Anual</p>
              <p className="text-lg font-extrabold tabular-nums">$99.990</p>
              <p className="text-xs text-neutral-500">Solo $8.332 CLP/mes</p>
            </button>
            <button onClick={() => setPlan('monthly')}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${plan === 'monthly' ? 'border-emerald-400 bg-emerald-50/50' : 'border-neutral-200 bg-white'}`}>
              <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${plan === 'monthly' ? 'bg-emerald-500' : 'border-2 border-neutral-200'}`}>
                {plan === 'monthly' && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
              </span>
              <p className="mt-1 font-bold">Pro Mensual</p>
              <p className="text-lg font-extrabold tabular-nums">$9.990</p>
              <p className="text-xs text-neutral-500">Flexible, sin ataduras</p>
            </button>
          </div>
          <button onClick={() => toast('Los pagos se activan muy pronto. Te avisamos.')}
            className="mt-3 w-full rounded-full bg-gradient-to-b from-[#34D399] to-[#0EA472] py-4 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98]">
            Suscribirme
          </button>
        </div>
      </div>
    </div>
  )
}
