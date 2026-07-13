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
    Elements, PayoutsSession, StatusBannerElement, AddPayoutMethodElement,
    BalanceElement, WithdrawButtonElement, WithdrawalsElement,
  } = mod

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet?verify=done`

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
            {/* El estado REAL lo dice Whop: si falta verificar muestra su aviso
                con botón; verificado = no muestra nada. */}
            <StatusBannerElement />
            <BalanceElement />
            <WithdrawButtonElement />
            <AddPayoutMethodElement />
            <WithdrawalsElement />
          </div>
        </div>
      </PayoutsSession>
    </Elements>
  )
}
