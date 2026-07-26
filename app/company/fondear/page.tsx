'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { authHeaders } from '@/lib/auth/clientToken'
import CheckoutFrame from '@/components/oct/CheckoutFrame'
import { ChevronLeft, CreditCard, Check, Loader2, ShieldCheck, Zap } from 'lucide-react'

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
  const [step, setStep] = useState<'amount' | 'pay' | 'card'>('amount')
  const [amountStr, setAmountStr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkout, setCheckout] = useState<CheckoutData | null>(null)
  const [verifying, setVerifying] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)
  const receiptRef = useRef<string>('')

  // Tarjeta guardada: con ella el depósito va por Topup y Whop NO cobra
  // comisión. Sin ella solo cabe el checkout, que cuesta 2,7% + $0,30. Por eso
  // se consulta al entrar: define qué opciones se le ofrecen a la empresa.
  const [hasCard, setHasCard] = useState<boolean | null>(null)
  const [cardSession, setCardSession] = useState<string | null>(null)
  const [savingCard, setSavingCard] = useState(false)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/whop/save-card', { headers: authHeaders() })
        const d = await res.json()
        setHasCard(!!d?.hasCard)
      } catch { setHasCard(false) }
    })()
  }, [])

  const amount = Math.round((parseFloat(amountStr) || 0) * 100) / 100

  // Abre el formulario para guardar la tarjeta. No cobra nada — es un checkout
  // en modo "setup", solo para que Whop guarde el medio de pago.
  const openSaveCard = async () => {
    setSavingCard(true); setError('')
    try {
      const res = await fetch('/api/whop/save-card', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({}),
      })
      const d = await res.json()
      if (d?.ok && d.sessionId) {
        setCardSession(d.sessionId)
        setStep('card')
      } else setError(d?.error || 'No se pudo abrir el formulario de tarjeta')
    } catch { setError('No se pudo abrir el formulario de tarjeta') }
    setSavingCard(false)
  }

  // Tras guardar la tarjeta, Whop avisa por webhook y ahí queda registrada.
  // Puede tardar un par de segundos, así que se reintenta antes de rendirse.
  const confirmCardSaved = async () => {
    for (let i = 0; i < 6; i++) {
      try {
        const res = await fetch('/api/whop/save-card', { headers: authHeaders() })
        const d = await res.json()
        if (d?.hasCard) { setHasCard(true); setStep('amount'); return }
      } catch {}
      await new Promise((r) => setTimeout(r, 1500))
    }
    // aunque no la veamos aún, no se deja atrapada a la empresa
    setStep('amount')
    setError('Guardamos tu tarjeta, pero todavía no la vemos confirmada. Puedes pagar con tarjeta mientras tanto.')
  }

  const createCheckout = async (metodo: 'saved' | 'checkout' | 'auto' = 'auto') => {
    if (amount < 1) { setError('El monto mínimo es $1'); return }
    setBusy(true); setError('')
    // reset de estado de un intento anterior (para no arrastrar receipt/done viejos)
    doneRef.current = false
    receiptRef.current = ''
    try {
      const res = await fetch('/api/whop/fund-wallet', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount, method: metodo }),
      })
      const data = await res.json()

      // Con tarjeta ya guardada el servidor cobra por Topup (sin comisión) y
      // devuelve el pago YA hecho — no hay checkout que mostrar. Sin este
      // caso, un cobro exitoso caía al else y decía "No se pudo crear el
      // pago" aunque la plata ya estaba acreditada.
      if (data.ok && data.method === 'topup' && data.paid) {
        doneRef.current = true
        router.push(`/company/fondear/exito?monto=${encodeURIComponent(String(data.base || amount))}`)
        return
      }

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
      if (data.error) setError(data.error) // mostrar el motivo real del servidor
    } catch {}
    return false
  }

  const manualVerify = async () => {
    if (!checkout) return
    setVerifying(true)
    setError('')
    const ok = await verify(checkout)
    if (!ok) setError((prev) => prev || 'Todavía no vemos el pago. Si ya pagaste, espera unos segundos y prueba de nuevo.')
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
        <p className="mt-1 text-neutral-500">El dinero queda en tu cuenta y tú decides cómo usarlo.</p>

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

            {/* Con tarjeta guardada el cobro va por Topup y Whop no cobra
                comisión — por eso es la opción destacada. Sin ella, el checkout
                es el único camino y cuesta 2,7% + $0,30. */}
            {hasCard ? (
              <>
                <button onClick={() => createCheckout('saved')} disabled={busy || amount < 1}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  Cobrar a mi tarjeta guardada
                </button>
                <p className="mt-2 text-center text-xs font-semibold text-emerald-600">Sin comisión</p>
                <button onClick={() => createCheckout('checkout')} disabled={busy || amount < 1}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-neutral-200 py-3.5 font-bold text-neutral-700 transition-transform active:scale-[0.98] disabled:opacity-50">
                  <CreditCard className="h-4 w-4" /> Usar otro medio de pago
                </button>
              </>
            ) : (
              <>
                <button onClick={() => createCheckout('checkout')} disabled={busy || amount < 1}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  Pagar con tarjeta
                </button>

                {hasCard === false && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                      <Zap className="h-4 w-4" /> Guarda tu tarjeta y no pagues comisión
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
                      Pagando de esta forma se descuenta la comisión de procesamiento. Si guardas tu
                      tarjeta una vez, las próximas recargas no tienen costo. Guardarla es gratis.
                    </p>
                    <button onClick={openSaveCard} disabled={savingCard}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60">
                      {savingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Guardar mi tarjeta
                    </button>
                  </div>
                )}
              </>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Pago seguro procesado por Whop
            </p>
          </div>
        )}

        {/* Guardar tarjeta — no cobra nada, solo la deja registrada */}
        {step === 'card' && cardSession && (
          <div className="mt-6">
            <CheckoutFrame
              title="Guardar tu tarjeta"
              subtitle="No se te cobra nada ahora. Queda guardada para tus próximas recargas."
            >
              <WhopCheckoutEmbed
                sessionId={cardSession}
                theme="light"
                accentColor="cyan"
                skipRedirect
                onComplete={() => confirmCardSaved()}
              />
            </CheckoutFrame>
            <button onClick={() => { setStep('amount'); setCardSession(null) }}
              className="mt-4 w-full py-3 text-sm font-semibold text-neutral-500">
              Volver
            </button>
          </div>
        )}

        {step === 'pay' && checkout && (
          <div className="mt-6">
            <CheckoutFrame
              title={`Agregar $${fmt(checkout.total)}`}
              subtitle="Se acredita completo a tu balance."
            >
              <WhopCheckoutEmbed
                planId={checkout.planId}
                {...(checkout.sessionId ? { sessionId: checkout.sessionId } : {})}
                {...(checkout.environment === 'sandbox' ? { environment: 'sandbox' } : {})}
                theme="light"
                accentColor="cyan"
                skipRedirect
                onComplete={(_planId: string, receiptId?: string) => {
                  if (receiptId) receiptRef.current = receiptId
                  verify(checkout)
                }}
              />
            </CheckoutFrame>

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
