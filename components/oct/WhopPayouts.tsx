'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { Loader2, ShieldCheck } from 'lucide-react'

// Cuenta de cobros EMBEBIDA de Whop, integrada en la billetera (no modal).
// El ESTADO lo muestra Whop mismo (StatusBannerElement): si falta verificar
// aparece su aviso con botón; si ya verificó, NO aparece nada — nunca más
// un banner nuestro equivocado. Banco + balance + retiro + historial, todo
// dentro de Octopus.
export default function WhopPayouts() {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [portalReady, setPortalReady] = useState(false)
  const [slow, setSlow] = useState(false)

  // si Whop no termina de dibujar en 12s, avisamos (su portal a veces tiene caídas)
  useEffect(() => {
    if (status !== 'ready' || portalReady) return
    const t = setTimeout(() => setSlow(true), 12000)
    return () => clearTimeout(t)
  }, [status, portalReady])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // probar el token primero (si falla, mostramos el motivo, nunca blanco)
        const t = await fetch('/api/whop/payout-token', { headers: authHeaders() })
        const data = await t.json().catch(() => ({}))
        if (!alive) return
        if (!t.ok || !data.token || !data.companyId) {
          setError(data.error || 'No se pudo cargar tu cuenta de cobros.')
          setStatus('error')
          return
        }
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!alive) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
        setStatus('ready')
      } catch (e: any) {
        if (alive) { setError(e?.message || 'No se pudo cargar tu cuenta de cobros'); setStatus('error') }
      }
    })()
    return () => { alive = false }
  }, [])

  const getToken = useMemo(() => async () => {
    const res = await fetch('/api/whop/payout-token', { headers: authHeaders() })
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
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando tu cuenta de cobros…
      </div>
    )
  }

  const {
    Elements, PayoutsSession, VerifyElement, AddPayoutMethodElement,
    BalanceElement, WithdrawButtonElement, WithdrawalsElement,
    ChangeAccountCountryElement,
  } = mod

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://octapiapp.com'}/creator/wallet?verify=done`

  return (
    <Elements elements={elements}>
      <PayoutsSession token={getToken} redirectUrl={redirectUrl} currency="usd">
        <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          {/* header decorado */}
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-gradient-to-r from-cyan-50 to-white px-5 py-3.5">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-extrabold text-neutral-800">Cuenta de cobros</p>
            <p className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Segura · Whop</p>
          </div>
          <div className="space-y-4 p-4">
            {slow && !portalReady && (
              <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700">
                El procesador de pagos está tardando en responder. Espera un momento o vuelve a entrar en unos minutos.
              </div>
            )}
            {/* VerifyElement solo aparece si la cuenta REQUIERE verificación
                (verificado = no monta nada). Nunca más un aviso equivocado. */}
            <VerifyElement />

            {/* CAMBIAR EL PAÍS DE LA CUENTA.
                Hace falta porque las cuentas creadas antes de julio 2026 nacieron
                con el país de la cuenta madre (Estados Unidos): Whop hereda el
                país del padre si no se le pasa uno, y no se lo estábamos
                pasando. Eso les da métodos de cobro equivocados —ACH, Venmo, RTP
                son de EE.UU.— y un creador chileno no puede usar ninguno.
                La API NO permite corregirlo: companies.update no acepta country
                en ninguna versión del SDK. Este componente embebido es la única
                forma, y la persona lo hace sin salir de Octapi.
                Whop lo muestra solo si la cuenta puede cambiar de país; si ya
                está correcta, no dibuja nada. */}
            <div className="empty:hidden">
              <ChangeAccountCountryElement />
            </div>

            <BalanceElement options={{ onReady: () => setPortalReady(true) }} />
            <WithdrawButtonElement />
            <AddPayoutMethodElement />
            <WithdrawalsElement />
          </div>
        </div>
      </PayoutsSession>
    </Elements>
  )
}
