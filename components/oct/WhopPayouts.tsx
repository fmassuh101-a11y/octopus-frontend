'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { Loader2 } from 'lucide-react'

// Wallet de payouts EMBEBIDO de Whop (KYC + banco + balance + retiro) DENTRO de Octopus.
// Nunca saca al usuario a whop.com — usa los elementos embebibles (VerifyElement, etc.).
// Se carga 100% en el cliente para evitar SSR.
export default function WhopPayouts({ onVerified }: { onVerified?: () => void }) {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!alive) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
      } catch (e) {
        setError('No se pudo cargar el módulo de pagos')
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

  if (error) return <p className="py-6 text-center text-sm font-semibold text-red-500">{error}</p>
  if (!mod || !elements) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando pagos seguros…
      </div>
    )
  }

  const { Elements, PayoutsSession, VerifyElement, AddPayoutMethodElement, BalanceElement, WithdrawButtonElement, WithdrawalsElement } = mod

  return (
    <Elements elements={elements}>
      <PayoutsSession
        token={getToken}
        currency="usd"
      >
        <div className="space-y-4">
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
