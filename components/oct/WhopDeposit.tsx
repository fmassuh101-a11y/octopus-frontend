'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { Loader2, ShieldCheck } from 'lucide-react'

// Depósito EMBEBIDO de Whop: la empresa carga saldo a SU propia cuenta sin
// salir de Octapi y sin comisión de procesamiento.
//
// POR QUÉ ESTO Y NO LO ANTERIOR
// Antes se guardaba la tarjeta con un checkout en modo "setup" y después se
// intentaba cobrarla con topups.create. No funcionaba nunca: ese formulario
// guarda la tarjeta a nombre de la PERSONA que lo llena, y topups solo acepta
// tarjetas a nombre de la EMPRESA. Whop respondía
// 404 "This PaymentToken was not found".
//
// Dentro de este widget la EMPRESA es la que compra, así que la tarjeta queda
// en la bolsa correcta y el depósito es el de verdad, sin comisión.

export default function WhopDeposit({
  monto,
  onListo,
}: {
  /** Monto sugerido; la empresa puede cambiarlo dentro del widget. */
  monto?: number
  /** Se llama cuando la empresa termina de iniciar el depósito. */
  onListo?: () => void
}) {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [lento, setLento] = useState(false)
  const [dibujado, setDibujado] = useState(false)

  // Si Whop no termina de dibujar, se avisa en vez de dejar un recuadro vacío.
  useEffect(() => {
    if (status !== 'ready' || dibujado) return
    const t = setTimeout(() => setLento(true), 12000)
    return () => clearTimeout(t)
  }, [status, dibujado])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        // Se pide el token primero: si falla, se muestra el motivo y nunca un
        // recuadro en blanco sin explicación.
        const t = await fetch('/api/whop/wallet-token', { headers: authHeaders() })
        const data = await t.json().catch(() => ({}))
        if (!vivo) return
        if (!t.ok || !data.token || !data.companyId) {
          setError(data.error || 'No se pudo abrir el depósito.')
          setStatus('error')
          return
        }
        setCompanyId(data.companyId)
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!vivo) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
        setStatus('ready')
      } catch (e: any) {
        if (vivo) { setError(e?.message || 'No se pudo abrir el depósito'); setStatus('error') }
      }
    })()
    return () => { vivo = false }
  }, [])

  // Se pasa como función para que el widget renueve el token solo antes de que
  // venza (duran una hora).
  const traerToken = useMemo(() => async () => {
    const res = await fetch('/api/whop/wallet-token', { headers: authHeaders() })
    const data = await res.json()
    if (!data.token) throw new Error(data.error || 'sin token')
    return data.token as string
  }, [])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-neutral-100 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-500">{error}</p>
        <button
          onClick={() => location.reload()}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (status === 'loading' || !mod || !elements) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl border border-neutral-100 bg-white py-10 text-neutral-400 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" /> Abriendo el depósito…
      </div>
    )
  }

  const { Elements, WalletSession, DepositElement } = mod

  return (
    <Elements elements={elements}>
      <WalletSession token={traerToken} companyId={companyId} currency="usd">
        <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-gradient-to-r from-cyan-50 to-white px-5 py-3.5">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-extrabold text-neutral-800">Agregar fondos</p>
            <p className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Seguro · Whop</p>
          </div>
          <div className="p-4">
            {lento && !dibujado && (
              <div className="mb-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700">
                El procesador de pagos está tardando en responder. Espera un momento
                o vuelve a entrar en unos minutos.
              </div>
            )}
            <DepositElement
              options={{
                ...(monto && monto >= 1 ? { amount: monto } : {}),
                onReady: () => setDibujado(true),
                // Los depósitos por banco y cripto se acreditan después: este
                // aviso dice que la empresa INICIÓ el depósito, no que la plata
                // ya llegó. El saldo real siempre se lee de Whop.
                onDeposit: () => onListo?.(),
              }}
            />
          </div>
        </div>
      </WalletSession>
    </Elements>
  )
}
