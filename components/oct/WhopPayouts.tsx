'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { Loader2, ShieldCheck } from 'lucide-react'

// Wallet de payouts EMBEBIDO de Whop (KYC + banco + balance + retiro) DENTRO de Octopus.
// Nunca saca al usuario a whop.com — usa los elementos embebibles (VerifyElement, etc.).
// Se carga 100% en el cliente para evitar SSR.
export default function WhopPayouts({ onVerified }: { onVerified?: () => void }) {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [companyId, setCompanyId] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 1) verificar que el token embebido se genere BIEN antes de montar los elementos
        //    (si falla, mostramos el motivo en vez de dejar todo en blanco)
        const t = await fetch('/api/whop/payout-token', { headers: authHeaders() })
        const data = await t.json().catch(() => ({}))
        if (!alive) return
        if (!t.ok || !data.token || !data.companyId) {
          setError(data.error || 'No se pudo iniciar la verificación. Probá de nuevo.')
          setStatus('error')
          return
        }
        setCompanyId(data.companyId)
        // 2) recién ahí cargamos los módulos embebibles de Whop
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!alive) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
        setStatus('ready')
      } catch (e: any) {
        if (alive) { setError(e?.message || 'No se pudo cargar la verificación'); setStatus('error') }
      }
    })()
    return () => { alive = false }
  }, [])

  // función token: el server mintea un access token scoped a la connected account
  const getToken = useMemo(() => async () => {
    const res = await fetch('/api/whop/payout-token', { headers: authHeaders() })
    const data = await res.json()
    if (!data.token) throw new Error(data.error || 'sin token')
    return data.token as string
  }, [])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-red-500">{error}</p>
        <button
          onClick={() => { setStatus('loading'); setError(''); location.reload() }}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (status === 'loading' || !mod || !elements) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando verificación segura…
      </div>
    )
  }

  const { Elements, PayoutsSession, VerifyElement, AddPayoutMethodElement, BalanceElement, WithdrawButtonElement, WithdrawalsElement } = mod

  // PayoutsSession EXIGE companyId y redirectUrl (URL absoluta pública) — sin
  // ellos el portal no inicia y queda en blanco (bug que tuvimos).
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet?verify=done`

  return (
    <Elements elements={elements}>
      <PayoutsSession token={getToken} companyId={companyId} redirectUrl={redirectUrl} currency="usd">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
            <ShieldCheck className="h-4 w-4" /> Verificación segura, dentro de Octopus
          </div>
          {/* KYC embebido (identidad) */}
          <VerifyElement />
          {/* agregar cuenta bancaria embebido */}
          <AddPayoutMethodElement />
          {/* saldo + retiro embebido */}
          <BalanceElement />
          <WithdrawButtonElement />
          <WithdrawalsElement />
        </div>
      </PayoutsSession>
    </Elements>
  )
}
