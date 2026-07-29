'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { Loader2, ShieldCheck } from 'lucide-react'

// Verificación de la cuenta de la EMPRESA.
//
// POR QUÉ EXISTE
// La verificación (KYC) solo estaba del lado del creador, para que pudiera
// retirar. Del lado de la empresa no había NADA — ni siquiera una forma de
// intentarlo. Y las plataformas de pago retienen los fondos de las cuentas sin
// verificar: es la explicación más probable de por qué un depósito con tarjeta
// queda en "pendiente" en vez de quedar disponible al instante.
//
// La empresa NO retira plata (eso no es su trabajo), así que acá no van ni el
// botón de retiro ni la cuenta bancaria. Solo la verificación.
//
// VerifyElement se monta solo si la cuenta REQUIERE verificación. Si ya está
// verificada no dibuja nada, así que esta tarjeta desaparece sola y nunca
// muestra un aviso equivocado.

export default function WhopVerifyCompany() {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const t = await fetch('/api/whop/payout-token', { headers: authHeaders() })
        const data = await t.json().catch(() => ({}))
        if (!vivo) return
        if (!t.ok || !data.token) {
          setError(data.error || 'No se pudo cargar la verificación.')
          setStatus('error')
          return
        }
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!vivo) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
        setStatus('ready')
      } catch (e: any) {
        if (vivo) { setError(e?.message || 'No se pudo cargar la verificación'); setStatus('error') }
      }
    })()
    return () => { vivo = false }
  }, [])

  const traerToken = useMemo(() => async () => {
    const res = await fetch('/api/whop/payout-token', { headers: authHeaders() })
    const data = await res.json()
    if (!data.token) throw new Error(data.error || 'sin token')
    return data.token as string
  }, [])

  // Callado si falla: es una tarjeta secundaria, no puede romper la billetera.
  if (status === 'error') {
    console.error('[WhopVerifyCompany]', error)
    return null
  }

  if (status === 'loading' || !mod || !elements) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 py-6 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Revisando tu verificación…
      </div>
    )
  }

  const { Elements, PayoutsSession, StatusBannerElement, VerifyElement } = mod
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://octapiapp.com'}/company/wallet?verify=done`

  return (
    <Elements elements={elements}>
      <PayoutsSession token={traerToken} redirectUrl={redirectUrl} currency="usd">
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-800 px-5 py-3.5">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <p className="text-sm font-bold text-white">Verificación de tu cuenta</p>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-xs leading-relaxed text-neutral-400">
              Las cuentas sin verificar tienen sus depósitos retenidos mientras el
              procesador confirma el cobro. Verificar una vez hace que la plata
              quede disponible más rápido.
            </p>
            <StatusBannerElement />
            <VerifyElement />
          </div>
        </div>
      </PayoutsSession>
    </Elements>
  )
}
