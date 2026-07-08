'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { authHeaders } from '@/lib/auth/clientToken'
import { ChevronLeft, CreditCard, Check, Loader2, ShieldCheck } from 'lucide-react'

// Agregar fondos — la empresa deposita a SU cuenta y decide cómo usarlo.
// Checkout embebido de Whop; al completar, verificamos el pago por su receipt id
// y redirigimos a la página de felicitaciones.
const WhopCheckoutEmbed = dynamic(
  () => import('@whop/checkout/react').then((m: any) => m.WhopCheckoutEmbed),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-2xl bg-neutral-100" /> }
) as any

interface CheckoutData { planId: string; sessionId?: string; fundingId: string; base: number; total: number; environment?: string }

export default function FondearPage() {
  const router = useRouter()
  const [step, setStep] = useState<'amount' | 'pay'>('amount')
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkout, setCheckout] = useState<CheckoutData | null>(null)
  const [verifying, setVerifying] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)
  const receiptRef = useRef<string>('')

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
        // el objeto va DIRECTO al polling (nada de estado viejo)
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(() => verify(data), 5000)
      } else setError(data.error || 'No se pudo crear el pago')
    } catch { setError('No se pudo crear el pago') }
    setBusy(false)
  }

  // verificar contra la API de Whop (receipt id si lo tenemos + respaldo por lista)
  const verify = async (c: CheckoutData): Promise<boolean> => {
    if (doneRef.current) return true
    try {
      const params = new URLSearchParams({ fundingId: c.fundingId, planId: c.planId || '' })
      if (receiptRef.current) params.set('receiptId', receiptRef.current)
      const res = await fetch(`/api/whop/fund-wallet?${params.toString()}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.paid) {
        doneRef.current = true
        if (pollRef.current) clearInterval(pollRef.current)
        router.push(`/company/fondear/exito?monto=${encodeURIComponent(String(data.amount || c.base))}`)
        return true
      }
    } catch {}
    return false
  }

  const manualVerify = async () => {
    if (!checkout) return
    setVerifying(true)
    const ok = await verify(checkout)
    if (!ok) setError('Todavía no vemos el pago. Si ya pagaste, esperá unos segundos y probá de nuevo.')
    setVerifying(false)
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] pb-20 text-neutral-900">
      <div className="mx-auto w-full max-w-md px-5 pt-6 md:max-w-lg">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/company/wallet'))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-90" aria-label="Volver">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h1 className="mt-5 text-[28px] font-extrabold tracking-tight">Agregar fondos</h1>
        <p className="mt-1 text-neutral-500">El dinero queda en tu cuenta y vos decidís cómo usarlo.</p>

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
              <div className="flex justify-between text-lg"><span className="font-bold">Total a pagar</span><span className="font-extrabold tabular-nums">${fmt(checkout.total)}</span></div>
              <p className="mt-1 text-sm text-neutral-400">Se acredita completo a tu balance.</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
              <WhopCheckoutEmbed
                planId={checkout.planId}
                {...(checkout.sessionId ? { sessionId: checkout.sessionId } : {})}
                {...(checkout.environment === 'sandbox' ? { environment: 'sandbox' } : {})}
                theme="light"
                skipRedirect
                onComplete={(_planId: string, receiptId?: string) => {
                  if (receiptId) receiptRef.current = receiptId
                  verify(checkout)
                }}
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
      </div>
    </div>
  )
}
