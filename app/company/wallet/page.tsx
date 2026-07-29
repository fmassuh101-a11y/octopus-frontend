'use client'

import { useState, useEffect } from 'react'
import WhopVerifyCompany from '@/components/oct/WhopVerifyCompany'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { readCache, writeCache } from '@/lib/useCachedFetch'
import { BarChart3, Briefcase, Inbox, MessageCircle, Users, Wallet } from 'lucide-react'

interface Wallet {
  id: string
  balance: number
  pending_balance: number
  total_earned: number
  total_withdrawn: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  fee: number
  net_amount: number
  description: string
  created_at: string
  status: string
}

export default function CompanyWallet() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  // Saldo que Whop todavía está confirmando, y el que retiene como reserva.
  const [pendiente, setPendiente] = useState(0)
  const [retenido, setRetenido] = useState(0)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview')

  const getToken = () => localStorage.getItem('sb-access-token')
  const getUserId = () => {
    const userStr = localStorage.getItem('sb-user')
    return userStr ? JSON.parse(userStr).id : null
  }

  useEffect(() => {
    // FLUIDEZ: pinta al instante lo último visto; lo fresco llega por detrás
    // Se pinta al instante lo último visto para que la pantalla no arranque
    // vacía — PERO NO EL SALDO. El saldo guardado venía de nuestra base, y
    // nuestra base puede no coincidir con Whop; mostrarlo y después
    // reemplazarlo hacía que el número saltara de $17 a $0 en medio segundo,
    // que es la peor forma posible de mostrar plata. El saldo se muestra solo
    // cuando llega el de Whop, que es el único real.
    const cached = readCache<{ wallet: Wallet, transactions: Transaction[] }>('company-wallet')
    if (cached) {
      setTransactions(cached.transactions)
    }
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    const token = getToken()
    const userId = getUserId()

    if (!token || !userId) {
      router.push('/auth/login')
      return
    }

    try {
      // SALDO REAL: se lee de la cuenta de Whop de la empresa, no de la tabla
      // `wallets`. La plata está en SU cuenta — Octapi no la custodia, así que
      // tampoco puede ser la que lleve la cuenta. Si Whop responde, ese número
      // manda; la tabla queda solo para el historial de movimientos.
      let whopBalance: number | null = null
      try {
        const bRes = await fetch('/api/whop/my-balance', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (bRes.ok) {
          const b = await bRes.json()
          if (b?.ok && b?.readable) {
            whopBalance = Number(b.balance) || 0
            // PENDIENTE: la plata de un depósito con tarjeta no queda
            // disponible al instante — Whop la retiene mientras confirma el
            // cobro. Antes se leía solo el disponible, así que la empresa
            // pagaba, veía $0 y no había NADA en pantalla que lo explicara.
            setPendiente(Number(b.pending) || 0)
            setRetenido(Number(b.reserved) || 0)
          }
        }
      } catch {}

      // Load wallet
      const walletRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (!walletRes.ok) {
        console.error('[CompanyWallet] Wallet fetch failed:', walletRes.status)
        setLoading(false)
        return
      }

      const wallets = await walletRes.json()

      if (wallets.length > 0) {
        setWallet(whopBalance !== null ? { ...wallets[0], balance: whopBalance } : wallets[0])

        // Load transactions
        const txRes = await fetch(
          `${SUPABASE_URL}/rest/v1/transactions?wallet_id=eq.${wallets[0].id}&select=*&order=created_at.desc&limit=20`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const txs = txRes.ok ? await txRes.json() : []
        setTransactions(txs)
        writeCache('company-wallet', { wallet: wallets[0], transactions: txs })
      } else {
        // No wallet exists - create one
        const createRes = await fetch(
          `${SUPABASE_URL}/rest/v1/wallets`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              user_id: userId,
              balance: 0,
              pending_balance: 0,
              total_earned: 0,
              total_withdrawn: 0
            })
          }
        )

        if (createRes.ok) {
          const newWallets = await createRes.json()
          if (newWallets.length > 0) {
            setWallet(newWallets[0])
          }
        } else {
          console.error('[CompanyWallet] Failed to create wallet:', createRes.status)
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('[CompanyWallet] Error loading wallet:', err)
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      'deposit': '',
      'bonus': '',
      'payment_sent': '',
      'refund': '',
      'fee': ''
    }
    return icons[type] || ''
  }

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'deposit': 'Depósito',
      'bonus': 'Bonus',
      'payment_sent': 'Pago a Creador',
      'refund': 'Reembolso',
      'fee': 'Fee de Plataforma'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/company/dashboard')}
              className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold">Wallet Empresa</h1>
              <p className="text-xs text-neutral-500">Balance y pagos</p>
            </div>
            <div className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="text-center mb-6">
            <p className="text-sm text-sky-100 mb-2">Balance Disponible</p>
            <p className="text-5xl font-black">${wallet?.balance?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-sky-200 mt-2">
              Usa este balance para pagar a creadores
            </p>
          </div>

          {/* PLATA EN CAMINO. Un depósito con tarjeta no queda disponible al
              instante: Whop lo retiene mientras confirma el cobro. Sin este
              aviso, la empresa paga, ve $0 y cree que perdió la plata. */}
          {pendiente > 0 && (
            <div className="mb-4 rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur">
              <p className="text-sm font-bold">
                ${pendiente.toFixed(2)} en camino
              </p>
              <p className="mt-0.5 text-xs text-sky-100">
                Tu depósito está confirmándose con el banco. Aparece en tu balance
                apenas Whop lo libera; no tienes que hacer nada.
              </p>
            </div>
          )}
          {retenido > 0 && (
            <div className="mb-4 rounded-2xl bg-white/10 px-4 py-2.5 text-center">
              <p className="text-xs text-sky-100">
                ${retenido.toFixed(2)} retenidos por Whop como reserva
              </p>
            </div>
          )}

          {/* Agregar fondos */}
          <Link href="/company/fondear"
            className="block w-full rounded-2xl bg-white py-3.5 text-center font-bold text-sky-700 shadow-lg transition-transform active:scale-[0.98]">
            Agregar fondos
          </Link>
        </div>

        {/* Verificación de la cuenta. Si ya está verificada, este componente
            no dibuja nada y desaparece solo. */}
        <div className="mt-4">
          <WhopVerifyCompany />
        </div>

        {/* How It Works */}
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-white placeholder-neutral-500">
          <h3 className="font-semibold mb-4">¿Cómo funciona?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sky-400 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Agrega fondos</p>
                <p className="text-sm text-neutral-500">Deposita con tu tarjeta y el balance queda en tu cuenta</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sky-400 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">Acepta creadores</p>
                <p className="text-sm text-neutral-500">Selecciona aplicantes para tus gigs</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sky-400 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">Paga automáticamente</p>
                <p className="text-sm text-neutral-500">El pago se descuenta de tu balance al completar el gig</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-900 rounded-2xl p-1">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'transactions', label: 'Historial' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-400 hover:text-white'
              } placeholder-neutral-500`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 text-white placeholder-neutral-500">
                <p className="text-sm text-neutral-500 mb-1">Pagos Realizados</p>
                <p className="text-2xl font-bold text-sky-400">
                  {transactions.filter(t => t.type === 'payment_sent').length}
                </p>
              </div>
              <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 text-white placeholder-neutral-500">
                <p className="text-sm text-neutral-500 mb-1">Total Pagado</p>
                <p className="text-2xl font-bold">
                  ${transactions
                    .filter(t => t.type === 'payment_sent')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>

            {/* Agregar fondos */}
            <Link href="/company/fondear" className="block rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-blue-500/10 p-6 transition-transform active:scale-[0.99]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sky-200">¿Necesitas agregar fondos?</h3>
                  <p className="text-sm text-sky-300/70">
                    Deposita con tu tarjeta en un minuto
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden text-white placeholder-neutral-500">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox className="w-8 h-8" strokeWidth={2} />
                <p className="text-neutral-500">No hay transacciones aún</p>
                <p className="text-sm text-neutral-600 mt-2">
                  Las transacciones aparecerán aquí cuando agregues fondos o pagues a creadores
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                        <span>{getTransactionIcon(tx.type)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{getTransactionLabel(tx.type)}</p>
                        <p className="text-sm text-neutral-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'refund'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'refund' ? '+' : '-'}
                        ${tx.amount.toFixed(2)}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-neutral-500 max-w-[150px] truncate">{tx.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/company/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <BarChart3 className="w-5 h-5" strokeWidth={2} />
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => router.push('/company/jobs')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <Briefcase className="w-5 h-5" strokeWidth={2} />
            <span className="text-xs">Mis Gigs</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-sky-500">
            <Wallet className="w-5 h-5" strokeWidth={2} />
            <span className="text-xs font-medium">Wallet</span>
          </div>
          <button onClick={() => router.push('/company/applicants')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <Users className="w-5 h-5" strokeWidth={2} />
            <span className="text-xs">Aplicantes</span>
          </button>
        </div>
        <div className="h-1 bg-neutral-900 mx-auto w-32 rounded-full mb-2" />
      </div>
    </div>
  )
}
