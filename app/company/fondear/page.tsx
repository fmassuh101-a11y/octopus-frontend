'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { authHeaders } from '@/lib/auth/clientToken'
import { ChevronLeft, CreditCard, Check, Loader2, ShieldCheck } from 'lucide-react'

// Fondear wallet de la empresa — Paso 3 del flujo de pagos.
// La empresa paga (monto + fee de plataforma) con el checkout embebido de Whop;
// verificamos el pago contra la API y el saldo se acredita al wallet.
const WhopCheckoutEmbed = dynamic(
  () => import('@whop/checkout/react').then((m: any) => m.WhopCheckoutEmbed),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-2xl bg-neutral-100" /> }
) as any

type Step = 'amount' | 'pay' | 'done'

export default function FondearPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('amount')
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkout, setCheckout] = useState<{ planId: string; sessionId?: string; fundingId: string; base: number; fee: number; total: number; environment?: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [credited, setCredited] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const amount = Math.round((parseFloat(amountStr) || 0) * 100) / 100

  const createCheckout = async () => {
    if (amount < 1) { setError('El monto mínimo es $1'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/whop/fund-wallet', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (data.ok && data.planId) {
        setCheckout(data)
        setStep('pay')
        startPolling(data.fundingId)
      } else setError(data.error || 'No se pudo crear el pago')
    } catch { setError('No se pudo crear el pago') }
    setBusy(false)
  }

  // verificar el pago contra la API de Whop (sin depender de webhooks)
  const verify = async (fundingId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/whop/fund-wallet?fundingId=${encodeURIComponent(fundingId)}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.paid) {
        setCredited(data.amount || 0)
        setStep('done')
        if (pollRef.current) clearInterval(pollRef.current)
        return true
      }
    } catch {}
    return false
  }

  const startPolling = (fundingId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => verify(fundingId), 5000)
  }

  const manualVerify = async () => {
    if (!checkout) return
    setVerifying(true)
    const ok = await verify(checkout.fundingId)
    if (!ok) setError('Todavía no vemos el pago. Si ya pagaste, esperá unos segundos y probá de nuevo.')
    setVerifying(false)
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] pb-20 text-neutral-900">
      <div className="mx-auto w-full max-w-md px-5 pt-6 md:max-w-lg">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/company/dashboard'))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-90" aria-label="Volver">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="mt-5 text-[28px] font-extrabold tracking-tight">Fondear campaña</h1>
        <p className="mt-1 text-neutral-500">Agregá fondos a tu wallet para pagar a los creadores.</p>

        {step === 'amount' && (
          <div className="mt-6 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
            <p className="font-bold">Monto</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-neutral-200 px-4 py-3.5 focus-within:border-cyan-400">
              <span className="text-2xl font-extrabold text-neutral-400">$</span>
              <input
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => { setAmountStr(e.target.value.replace(/[^0-9.]/g, '')); setError('') }}
                placeholder="0.00"
                className="w-full bg-transparent text-2xl font-extrabold tabular-nums placeholder-neutral-300 focus:outline-none"
              />
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-red-500">{error}</p>}
            <button onClick={createCheckout} disabled={busy || amount < 1}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              Pagar con tarjeta
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Pago seguro procesado por Whop
            </p>
          </div>
        )}

        {step === 'pay' && checkout && (
          <div className="mt-6">
            <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
              <div className="flex justify-between text-neutral-500"><span>Fondos para campañas</span><span className="font-bold tabular-nums">${fmt(checkout.base)}</span></div>
              <div className="mt-1 flex justify-between text-neutral-500"><span>Fee de plataforma</span><span className="font-bold tabular-nums">${fmt(checkout.fee)}</span></div>
              <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 text-lg"><span className="font-bold">Total</span><span className="font-extrabold tabular-nums">${fmt(checkout.total)}</span></div>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
              <WhopCheckoutEmbed
                planId={checkout.planId}
                {...(checkout.sessionId ? { sessionId: checkout.sessionId } : {})}
                {...(checkout.environment === 'sandbox' ? { environment: 'sandbox' } : {})}
                theme="light"
                onComplete={() => verify(checkout.fundingId)}
              />
            </div>

            {error && <p className="mt-3 text-center text-sm font-semibold text-amber-600">{error}</p>}
            <button onClick={manualVerify} disabled={verifying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-cyan-500 py-3 font-bold text-cyan-700 transition-transform active:scale-[0.98] disabled:opacity-60">
              {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Ya pagué — verificar
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-sm">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-200">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </span>
            <p className="mt-4 text-2xl font-extrabold text-emerald-900">Pago confirmado</p>
            <p className="mt-1 text-emerald-800/80">Se acreditaron <span className="font-bold tabular-nums">${fmt(credited)}</span> a tu wallet.</p>
            <button onClick={() => router.push('/company/dashboard')}
              className="mt-6 rounded-full bg-emerald-600 px-8 py-3 font-bold text-white transition-transform active:scale-[0.98]">
              Volver al panel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
