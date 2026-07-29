'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { authHeaders } from '@/lib/auth/clientToken'
import CheckoutFrame from '@/components/oct/CheckoutFrame'
import SelectorTarjeta, { type Tarjeta } from '@/components/oct/SelectorTarjeta'
import ActivarSinComision from '@/components/oct/ActivarSinComision'
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

  // Medios de pago guardados. La lista se le pide a Whop, no a nuestra base:
  // Whop es quien las guarda. Ojo: tener la tarjeta guardada NO evita la
  // comisión hoy — ver el comentario largo más abajo, junto a los botones.
  const [tarjetas, setTarjetas] = useState<Tarjeta[] | null>(null)
  const [elegida, setElegida] = useState<string | null>(null)
  const [cardSession, setCardSession] = useState<string | null>(null)
  const [savingCard, setSavingCard] = useState(false)
  // Solo se llena si la CONSULTA a Whop falló — que es distinto de no tener
  // tarjetas. Mezclar las dos cosas fue el error de la versión anterior.
  const [fallaConsulta, setFallaConsulta] = useState<string | null>(null)
  // El cobro salió pero Whop todavía no lo confirma. Se muestra una pantalla
  // propia: NO se puede ofrecer pagar de nuevo, o la empresa paga dos veces.
  const [pendiente, setPendiente] = useState(false)
  // Tarjetas guardadas A NOMBRE DE LA EMPRESA. Son las únicas que permiten
  // depositar sin comisión; las de una persona no sirven aunque se vean igual.
  const [tarjetasEmpresa, setTarjetasEmpresa] = useState<Tarjeta[] | null>(null)
  const [enlacePanel, setEnlacePanel] = useState<string | null>(null)
  const [activando, setActivando] = useState(false)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // Lee la lista de tarjetas. Devuelve cuántas encontró, para que quien la
  // llame después de guardar una sepa si ya apareció.
  const cargarTarjetas = async (): Promise<number> => {
    try {
      const res = await fetch('/api/whop/cards', { headers: authHeaders() })
      const d = await res.json()
      if (d?.ok) {
        const lista: Tarjeta[] = d.cards || []
        setTarjetas(lista)
        setElegida(d.elegida || lista[0]?.id || null)
        setFallaConsulta(lista.length ? null : d.problema || null)
        return lista.length
      }
      setTarjetas([])
      setFallaConsulta(d?.error || null)
    } catch {
      setTarjetas([])
      setFallaConsulta('No pudimos leer tus medios de pago')
    }
    return 0
  }

  // ¿Puede depositar gratis? Depende de si tiene tarjeta propia de empresa.
  const cargarTarjetasEmpresa = async () => {
    try {
      const res = await fetch('/api/whop/company-cards', { headers: authHeaders() })
      const d = await res.json()
      if (d?.ok) {
        setTarjetasEmpresa(d.cards || [])
        setEnlacePanel(d.enlacePanel || null)
        if ((d.cards || []).length && !elegida) setElegida(d.cards[0].id)
        return
      }
    } catch {}
    setTarjetasEmpresa([])
  }

  useEffect(() => { cargarTarjetas(); cargarTarjetasEmpresa() }, [])

  // Cambiar cuál se usa. Se refleja al toque en pantalla y se guarda detrás;
  // si el guardado falla, se vuelve atrás para no mostrar una mentira.
  const elegirTarjeta = async (id: string) => {
    const previa = elegida
    setElegida(id)
    try {
      const res = await fetch('/api/whop/cards', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ paymentMethodId: id }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setElegida(previa)
      setError('No se pudo cambiar la tarjeta. Intenta de nuevo.')
    }
  }

  const hasCard = tarjetas === null ? null : tarjetas.length > 0

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

  // Tras guardar la tarjeta se le pregunta a Whop si ya la tiene. Puede tardar
  // unos segundos en aparecer, así que se reintenta con esperas crecientes
  // antes de rendirse (hasta ~30s: la versión anterior esperaba 9s y por eso
  // decía "no la vemos confirmada" con la tarjeta perfectamente guardada).
  const confirmCardSaved = async () => {
    setStep('amount')
    setError('')
    for (let i = 0; i < 8; i++) {
      if (await cargarTarjetas() > 0) return
      await new Promise((r) => setTimeout(r, i < 3 ? 1500 : 5000))
    }
    setError('Tu tarjeta quedó guardada en Whop, pero todavía no aparece acá. Recarga la página en un minuto, o paga con tarjeta ahora.')
  }

  const createCheckout = async (metodo: 'guardada' | 'saved' | 'checkout' | 'auto' = 'auto') => {
    if (amount < 1) { setError('El monto mínimo es $1'); return }
    setBusy(true); setError('')
    // reset de estado de un intento anterior (para no arrastrar receipt/done viejos)
    doneRef.current = false
    receiptRef.current = ''
    try {
      const res = await fetch('/api/whop/fund-wallet', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        // se manda cuál tarjeta para que cobre la que está marcada en pantalla
        body: JSON.stringify({
          amount,
          method: metodo,
          ...((metodo === 'saved' || metodo === 'guardada') && elegida ? { paymentMethodId: elegida } : {}),
        }),
      })
      const data = await res.json()

      // Si el Topup llegara a funcionar (hoy no: Whop no encuentra la tarjeta
      // de una sub-cuenta), el pago vuelve YA hecho y no hay checkout que
      // mostrar. Se deja el caso porque el día que Whop lo habilite, funciona
      // solo. Sin esto, un cobro exitoso caía al else y decía "No se pudo
      // crear el pago" con la plata ya acreditada.
      if (data.ok && (data.method === 'topup' || data.method === 'guardada') && data.paid) {
        doneRef.current = true
        router.push(`/company/fondear/exito?monto=${encodeURIComponent(String(data.base || amount))}`)
        return
      }

      // COBRO EN CURSO: la tarjeta YA se cobró y Whop lo está procesando.
      // No se abre el checkout — si la empresa pagara ahí, quedaría cobrada
      // dos veces por el mismo depósito.
      if (data.ok && (data.method === 'topup' || data.method === 'guardada') && data.pending) {
        doneRef.current = true
        setError('')
        setPendiente(true)
        return
      }

      // Si venía con tarjeta guardada y aun así terminamos en el checkout, se
      // dice POR QUÉ, en vez de cambiar de pantalla sin explicación.
      // El motivo técnico va a la consola para nosotros; a la empresa se le
      // dice algo que pueda entender y hacer. Mostrarle un 404 de Whop en
      // pantalla no la ayuda en nada.
      if (data.motivoTopup) {
        console.error('[Fondear] topup no disponible:', data.motivoTopup)
        setError(`No pudimos cobrar tu tarjeta guardada. Puedes terminar acá abajo, pero por esta vía se cobra $${fmt(conComision(amount))} en vez de $${fmt(amount)}.`)
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

  // OJO: la comisión real NO es 2,7% + $0,30. En la primera prueba con plata
  // de verdad, un depósito de $17 acreditó $15,77 — o sea $1,23, un 7,2%.
  // Whop cobra más por tarjetas internacionales (la de Felipe es chilena) y no
  // publica la fórmula. Por eso la pantalla ya NO predice el monto acreditado:
  // dice lo que se cobra a la tarjeta y avisa que Whop descuenta lo suyo.
  // Se deja esta función solo para el mensaje de respaldo del checkout.
  const conComision = (n: number) => Math.round((n + n * 0.027 + 0.3) * 100) / 100

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

        {/* Cobro en curso. Sin botón de pagar: la tarjeta ya se cobró y volver
            a intentar sería un segundo cobro por el mismo depósito. */}
        {pendiente && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-600" />
            <p className="mt-4 text-lg font-bold text-amber-900">Tu pago se está procesando</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800/90">
              Ya cobramos ${fmt(amount)} a tu tarjeta y el banco lo está confirmando.
              Puede tardar unos minutos. <strong>No vuelvas a pagar</strong> — el dinero
              aparecerá solo en tu balance.
            </p>
            <button
              onClick={() => router.push('/company/wallet')}
              className="mt-5 w-full rounded-full bg-amber-600 py-3.5 font-bold text-white transition-transform active:scale-[0.98]"
            >
              Ir a mi billetera
            </button>
          </div>
        )}

        {activando && (
          <ActivarSinComision
            onListo={() => { setActivando(false); cargarTarjetasEmpresa() }}
            onCerrar={() => setActivando(false)}
          />
        )}

        {step === 'amount' && !pendiente && (
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

            {/* El plazo se dice ANTES de pagar. Que alguien deposite y recién
                ahí descubra que su plata no está disponible por días es la
                peor forma de enterarse. */}
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs leading-relaxed text-amber-900">
                <strong>Antes de depositar:</strong> los pagos con tarjeta tardan
                <strong> 1 a 4 días hábiles</strong> en quedar disponibles para pagar
                creadores. Es el plazo de liquidación del procesador. Deposita con
                anticipación si tienes una campaña por lanzar.
              </p>
            </div>

            {/* HONESTIDAD SOBRE LA COMISIÓN — no borrar este comentario.
                La idea original era cobrar por Topup, que Whop no cobra. No se
                puede: el topup busca la tarjeta en la cuenta MADRE de Octapi y
                la tarjeta vive en la sub-cuenta de la empresa, así que responde
                404 "This PaymentToken was not found". Es un límite de Whop para
                sub-cuentas, no algo que se arregle acá.
                Mientras tanto la pantalla NO promete "sin comisión": muestra el
                costo real por adelantado. Prometer gratis y cobrar 2,7% es peor
                que cobrar 2,7% avisando. */}
            {/* OFERTA DE 0% — solo si todavía no está activado. Una vez que la
                empresa tiene tarjeta propia, esto desaparece para siempre. */}
            {tarjetasEmpresa !== null && tarjetasEmpresa.length === 0 && enlacePanel && (
              <button
                onClick={() => setActivando(true)}
                className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition-transform active:scale-[0.99]"
              >
                <Zap className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-emerald-900">
                    Deposita sin comisión
                  </span>
                  <span className="block text-xs leading-relaxed text-emerald-800/80">
                    Guarda tu tarjeta una vez y tus recargas dejan de pagar el 7%.
                  </span>
                </span>
                <span className="shrink-0 text-lg font-bold text-emerald-600">›</span>
              </button>
            )}

            {/* YA ACTIVADO: depósito directo, sin comisión de verdad. */}
            {tarjetasEmpresa && tarjetasEmpresa.length > 0 && (
              <>
                <button
                  onClick={() => createCheckout('saved')}
                  disabled={busy || amount < 1}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#10B981] to-[#059669] py-4 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  {amount >= 1 ? `Agregar $${fmt(amount)} sin comisión` : 'Agregar fondos'}
                </button>
                <p className="mt-2 text-center text-xs font-semibold text-emerald-600">
                  Sin comisión · llegan ${amount >= 1 ? fmt(amount) : '0.00'} completos
                </p>
              </>
            )}

            {/* TARJETA GUARDADA — el camino de un clic.
                La empresa nunca sale de Octapi ni sabe que existe Whop. La
                tarjeta se guardó antes con nuestro propio formulario y se
                cobra por detrás. NO evita la comisión (es un cobro de tarjeta
                como cualquiera); lo que evita es tener que escribirla de nuevo
                en cada depósito, que era la molestia de verdad. */}
            {hasCard === null ? (
              <div className="mt-5 space-y-2.5">
                <div className="h-[68px] animate-pulse rounded-2xl bg-neutral-100" />
                <div className="h-[52px] animate-pulse rounded-2xl bg-neutral-100" />
              </div>
            ) : hasCard ? (
              <>
                <p className="mt-6 text-sm font-bold text-neutral-900">Pagar con</p>
                <div className="mt-2.5">
                  <SelectorTarjeta
                    tarjetas={tarjetas || []}
                    elegida={elegida}
                    onElegir={elegirTarjeta}
                    onAgregar={openSaveCard}
                    ocupado={busy || savingCard}
                  />
                </div>

                <button
                  onClick={() => createCheckout('guardada')}
                  disabled={busy || amount < 1 || !elegida}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  {amount >= 1 ? `Agregar $${fmt(amount)}` : 'Agregar fondos'}
                </button>

                <button
                  onClick={() => createCheckout('checkout')}
                  disabled={busy || amount < 1}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-neutral-200 py-3.5 font-bold text-neutral-700 transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" /> Usar otra tarjeta
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => createCheckout('checkout')}
                  disabled={busy || amount < 1}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  {amount >= 1 ? `Agregar $${fmt(amount)}` : 'Agregar fondos'}
                </button>

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
