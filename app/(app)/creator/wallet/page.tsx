'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Drawer } from 'vaul'
import Sky from '@/components/oct/Sky'
import { toast } from '@/components/oct/toast'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { authHeaders } from '@/lib/auth/clientToken'
import { ChevronLeft, Wallet, ShieldCheck, Clock3, CreditCard, ArrowDownToLine, Check, Loader2, ChevronRight } from 'lucide-react'

// Wallet del creador — Paso 1 (activar pagos + KYC) y Paso 2 (saldo del ledger + retiro con fee).
// El saldo se muestra COMPLETO; el fee (3.7% no-Pro / 0% Pro) se descuenta solo al retirar.
const WhopPayouts = dynamic(() => import('@/components/oct/WhopPayouts'), { ssr: false })
const MIN_WITHDRAW = 5
const FEE_PERCENT = 0.037

interface Movement {
  id?: string
  amount: number
  fee_amount?: number
  net_amount?: number
  status?: string
  created_at: string
  kind?: 'retiro' | 'pago_recibido' | 'pago_enviado'
  description?: string
}

export default function CreatorWallet() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  // estado de pagos: 'none' (sin cuenta) | 'kyc' (cuenta creada, falta verificar) | 'ok' (verificado)
  const [payState, setPayState] = useState<'none' | 'kyc' | 'ok'>('none')
  const [balance, setBalance] = useState(0)
  const [isPro, setIsPro] = useState(false)
  const [moves, setMoves] = useState<Movement[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [showPayouts, setShowPayouts] = useState(false) // modal KYC/banco/retiro embebido

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    try {
      const userStr = localStorage.getItem('sb-user')
      if (!userStr) { router.push('/auth/login'); return }
      const user = JSON.parse(userStr)
      const token = localStorage.getItem('sb-access-token')
      const sb = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }

      // saldo del ledger + perfil + retiros + pagos recibidos + estado Whop, en paralelo
      const [wRes, pRes, mRes, pmRes, whopRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=balance`, { headers: sb }),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=is_pro`, { headers: sb }),
        fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests?user_id=eq.${user.id}&select=id,amount,fee_amount,net_amount,status,created_at&order=created_at.desc&limit=12`, { headers: sb }),
        fetch(`${SUPABASE_URL}/rest/v1/wallet_movements?user_id=eq.${user.id}&select=id,amount,kind,description,seen,created_at&order=created_at.desc&limit=12`, { headers: sb }),
        fetch(`/api/whop/creator-balance`, { headers: authHeaders() }),
      ])
      const wallets = wRes.ok ? await wRes.json() : []
      setBalance(Math.max(0, Number(wallets?.[0]?.balance) || 0))
      const profs = pRes.ok ? await pRes.json() : []
      setIsPro(!!profs?.[0]?.is_pro)
      const mv = mRes.ok ? await mRes.json() : []
      const withdrawals: Movement[] = (Array.isArray(mv) ? mv : []).map((m: any) => ({ ...m, kind: 'retiro' as const }))
      const pays: any[] = pmRes.ok ? await pmRes.json() : []
      const received: Movement[] = (Array.isArray(pays) ? pays : []).filter((p) => p.kind === 'pago_recibido')

      // NOTIFICACIÓN "te pagaron": pagos nuevos que el creador aún no vio
      const unseen = received.filter((p: any) => p.seen === false)
      if (unseen.length) {
        const total = unseen.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
        toast(`Te pagaron $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
        fetch(`${SUPABASE_URL}/rest/v1/wallet_movements?id=in.(${unseen.map((p: any) => p.id).join(',')})`, {
          method: 'PATCH',
          headers: { ...sb, 'Content-Type': 'application/json' },
          body: JSON.stringify({ seen: true }),
        }).catch(() => {})
      }

      const all = [...withdrawals, ...received].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setMoves(all.slice(0, 15))
      if (whopRes.ok) {
        const whop = await whopRes.json()
        setPayState(whop.needsSetup ? 'none' : whop.kycComplete ? 'ok' : 'kyc')
      } else {
        setPayState('none') // si falla la consulta, ofrecer activar (el server revalida todo)
      }
    } catch {}
    setLoading(false)
  }

  // Paso 1: crear la connected account en Whop y abrir el KYC EMBEBIDO (dentro de la app)
  const activate = async () => {
    setBusy(true)
    try {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (!userStr || !token) { router.push('/auth/login'); return }
      const user = JSON.parse(userStr)
      const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=full_name,whop_company_id`, {
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      })
      const profile = ((pr.ok ? await pr.json() : [])[0]) || {}
      const res = await fetch('/api/whop/setup-creator', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: user.email, fullName: profile.full_name, existingCompanyId: profile.whop_company_id }),
      })
      const data = await res.json()
      if (data.companyId || data.kycUrl) {
        // la connected account ya existe → abrimos el KYC/banco/retiro EMBEBIDO
        // (VerifyElement de Whop) sin sacar al usuario de Octopus.
        setPayState((s) => (s === 'ok' ? 'ok' : 'kyc'))
        setShowPayouts(true)
      } else toast(data.error || 'No se pudo activar. Probá de nuevo.', 'error')
    } catch { toast('No se pudo activar. Probá de nuevo.', 'error') }
    setBusy(false)
  }

  // Paso 2: retiro (el server valida TODO de nuevo y descuenta atómicamente)
  const amount = useMemo(() => Math.round((parseFloat(amountStr) || 0) * 100) / 100, [amountStr])
  const fee = useMemo(() => (isPro ? 0 : Math.round(amount * FEE_PERCENT * 100) / 100), [amount, isPro])
  const net = useMemo(() => Math.round((amount - fee) * 100) / 100, [amount, fee])
  const canConfirm = amount >= MIN_WITHDRAW && amount <= balance && !busy

  const confirmWithdraw = async () => {
    if (!canConfirm) return
    setBusy(true)
    try {
      const res = await fetch('/api/whop/request-withdraw', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (data.ok) {
        setSheetOpen(false)
        setAmountStr('')
        toast(data.sent ? 'Retiro enviado a tu cuenta' : 'Retiro solicitado. Lo estamos procesando.')
        load()
      } else {
        toast(data.error || 'No se pudo procesar el retiro', 'error')
      }
    } catch { toast('No se pudo procesar el retiro', 'error') }
    setBusy(false)
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky height={210} />
      <div className="relative mx-auto w-full max-w-md px-5 pt-4 md:max-w-lg">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/profile'))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform active:scale-90" aria-label="Volver">
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* saldo grande (ledger interno — se ve completo, el fee es al retirar) */}
        <div className="mt-6 text-center">
          <p className="font-semibold text-neutral-700">Saldo disponible</p>
          {loading ? (
            <div className="mx-auto mt-2 h-12 w-40 animate-pulse rounded-2xl bg-white/70" />
          ) : (
            <p className="mt-1 text-[52px] font-extrabold leading-none tracking-tight tabular-nums">
              ${fmt(balance)}
            </p>
          )}
          <button
            onClick={() => setSheetOpen(true)}
            disabled={loading || payState !== 'ok' || balance < MIN_WITHDRAW}
            className="mt-5 w-full rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none">
            Retirar
          </button>
          {!loading && payState === 'ok' && balance < MIN_WITHDRAW && (
            <p className="mt-2 text-sm text-neutral-500">El retiro mínimo es ${MIN_WITHDRAW}</p>
          )}
        </div>

        {/* Paso 1 — tarjeta de activación / estado del KYC */}
        {!loading && payState === 'none' && (
          <div className="mt-7 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50">
                <CreditCard className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-lg font-extrabold leading-tight">Cobrá tu plata</p>
                <p className="mt-1 text-neutral-500">Verificá tu identidad para poder retirar lo que ganás.</p>
              </div>
            </div>
            <button onClick={activate} disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              {busy ? 'Creando tu cuenta…' : 'Activar pagos'}
            </button>
          </div>
        )}

        {!loading && payState === 'kyc' && (
          <div className="mt-7 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                <Clock3 className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-extrabold leading-tight text-amber-900">Activá tus cobros</p>
                <p className="mt-1 text-amber-800/80">Verificá tu identidad y agregá tu banco. Cuando tengas un método de pago cargado, esto desaparece.</p>
              </div>
            </div>
            <button onClick={activate} disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3.5 font-bold text-white shadow-lg shadow-amber-200 transition-transform active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
              Continuar verificación
            </button>
            <button onClick={() => { setLoading(true); load() }}
              className="mt-2 w-full py-2 text-sm font-bold text-amber-700 active:opacity-70">
              Ya me verifiqué — actualizar
            </button>
          </div>
        )}

        {!loading && payState === 'ok' && (
          <div className="mt-7 flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-5 w-5 text-white" strokeWidth={3} />
            </span>
            <div>
              <p className="font-extrabold text-emerald-900">Verificado — ya podés cobrar</p>
              <p className="text-sm text-emerald-800/70">Tus retiros van directo a tu cuenta.</p>
            </div>
          </div>
        )}

        {/* movimientos */}
        <h2 className="mt-9 text-xl font-extrabold tracking-tight">Movimientos</h2>
        <div className="mt-3 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          {loading ? (
            <div className="p-5"><div className="h-16 animate-pulse rounded-2xl bg-neutral-100" /></div>
          ) : moves.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <Wallet className="h-9 w-9 text-neutral-300" />
              <p className="mt-3 font-bold text-neutral-600">Todavía no hay movimientos</p>
              <p className="text-sm text-neutral-400">Cuando retires plata, aparece acá.</p>
            </div>
          ) : (
            moves.map((m, i) => {
              const isPay = m.kind === 'pago_recibido'
              return (
                <div key={m.id || i} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-neutral-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${isPay ? 'bg-emerald-50' : 'bg-cyan-50'}`}>
                      {isPay
                        ? <Check className="h-5 w-5 text-emerald-600" strokeWidth={3} />
                        : <ArrowDownToLine className="h-5 w-5 text-cyan-600" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold">{isPay ? 'Te pagaron' : 'Retiro'}</p>
                      <p className="truncate text-sm text-neutral-400">
                        {isPay && m.description ? m.description : new Date(m.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-extrabold tabular-nums ${isPay ? 'text-emerald-600' : ''}`}>
                      {isPay ? '+' : '-'}${fmt(Math.abs(Number(m.amount) || 0))}
                    </p>
                    {!isPay && (
                      <p className={`text-xs font-bold ${m.status === 'completed' ? 'text-emerald-600' : m.status === 'rejected' ? 'text-red-500' : 'text-amber-600'}`}>
                        {m.status === 'completed' ? 'Enviado' : m.status === 'rejected' ? 'Rechazado' : 'Procesando'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* hoja de retiro */}
      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-white pb-[calc(env(safe-area-inset-bottom)+20px)]">
            <div className="mx-auto w-full max-w-md px-6 pt-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200" />
              <Drawer.Title className="mt-5 text-2xl font-extrabold tracking-tight">Retirar plata</Drawer.Title>
              <p className="mt-1 text-neutral-500">Saldo disponible: <span className="font-bold text-neutral-900 tabular-nums">${fmt(balance)}</span></p>

              <div className="mt-5 flex items-center gap-2 rounded-2xl border-2 border-neutral-200 px-4 py-3.5 focus-within:border-cyan-400">
                <span className="text-2xl font-extrabold text-neutral-400">$</span>
                <input
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="w-full bg-transparent text-2xl font-extrabold tabular-nums placeholder-neutral-300 focus:outline-none"
                />
                <button onClick={() => setAmountStr(String(balance))}
                  className="rounded-full bg-cyan-50 px-3.5 py-1.5 text-sm font-bold text-cyan-700 active:scale-95">Todo</button>
              </div>
              {amount > 0 && amount < MIN_WITHDRAW && <p className="mt-2 text-sm font-semibold text-red-500">El mínimo es ${MIN_WITHDRAW}</p>}
              {amount > balance && <p className="mt-2 text-sm font-semibold text-red-500">No te alcanza el saldo</p>}

              <div className="mt-5 space-y-2.5 rounded-2xl bg-neutral-50 p-4">
                <div className="flex justify-between text-neutral-500">
                  <span>Fee de retiro {isPro ? '(Pro: sin fee)' : `(${(FEE_PERCENT * 100).toFixed(1)}%)`}</span>
                  <span className="font-bold tabular-nums">-${fmt(fee)}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2.5 text-lg">
                  <span className="font-bold">Recibís</span>
                  <span className="font-extrabold tabular-nums">${fmt(Math.max(0, net))}</span>
                </div>
                {!isPro && (
                  <p className="text-xs text-neutral-400">Con Octopus Pro el fee es 0% y te quedás con todo.</p>
                )}
              </div>

              <button onClick={confirmWithdraw} disabled={!canConfirm}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 disabled:shadow-none">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}
                Confirmar retiro
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Modal EMBEBIDO de pagos (KYC + banco + retiro) — todo dentro de Octopus */}
      {showPayouts && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header fijo con botón volver — ocupa toda la pantalla para que el
              formulario de verificación de Whop se vea COMPLETO */}
          <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              onClick={() => { setShowPayouts(false); load() }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
              aria-label="Volver"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-lg font-extrabold leading-tight">Cobrá tu plata</p>
              <p className="text-xs text-neutral-500">Verificación y cuenta bancaria, dentro de Octopus</p>
            </div>
          </div>
          {/* Área scrolleable a pantalla completa */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <WhopPayouts />
          </div>
        </div>
      )}
    </div>
  )
}
