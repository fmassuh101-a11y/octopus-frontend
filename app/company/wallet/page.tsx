'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

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
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview')

  const getToken = () => localStorage.getItem('sb-access-token')
  const getUserId = () => {
    const userStr = localStorage.getItem('sb-user')
    return userStr ? JSON.parse(userStr).id : null
  }

  useEffect(() => {
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
      // Load wallet
      const walletRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const wallets = walletRes.ok ? await walletRes.json() : []
      if (wallets.length > 0) {
        setWallet(wallets[0])

        // Load transactions
        const txRes = await fetch(
          `${SUPABASE_URL}/rest/v1/transactions?wallet_id=eq.${wallets[0].id}&select=*&order=created_at.desc&limit=20`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const txs = txRes.ok ? await txRes.json() : []
        setTransactions(txs)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading wallet:', err)
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
      'deposit': '💰',
      'bonus': '🎁',
      'payment_sent': '📤',
      'refund': '↩️',
      'fee': '📋'
    }
    return icons[type] || '💵'
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
              <h1 className="text-xl font-bold">💼 Wallet Empresa</h1>
              <p className="text-xs text-neutral-500">Balance y pagos</p>
            </div>
            <div className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="text-center mb-6">
            <p className="text-sm text-sky-100 mb-2">Balance Disponible</p>
            <p className="text-5xl font-black">${wallet?.balance?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-sky-200 mt-2">
              Usa este balance para pagar a creadores
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-sm text-center text-sky-100">
              Para agregar fondos a tu cuenta, contacta al administrador o realiza una transferencia a nuestra cuenta.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
          <h3 className="font-semibold mb-4">📋 ¿Cómo funciona?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sky-400 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Agrega fondos</p>
                <p className="text-sm text-neutral-500">El admin agrega balance a tu cuenta</p>
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
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
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
              <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
                <p className="text-sm text-neutral-500 mb-1">Pagos Realizados</p>
                <p className="text-2xl font-bold text-sky-400">
                  {transactions.filter(t => t.type === 'payment_sent').length}
                </p>
              </div>
              <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
                <p className="text-sm text-neutral-500 mb-1">Total Pagado</p>
                <p className="text-2xl font-bold">
                  ${transactions
                    .filter(t => t.type === 'payment_sent')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>

            {/* Contact Admin */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-200">¿Necesitas agregar fondos?</h3>
                  <p className="text-sm text-amber-300/70">
                    Contacta al soporte para agregar balance a tu cuenta
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <span className="text-4xl block mb-4">📭</span>
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

        {/* Fee Info */}
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
          <h3 className="font-semibold mb-3">💡 Información de Fees</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Fee de plataforma</span>
              <span>10% por pago</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">El creador recibe</span>
              <span>90% del monto</span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-4">
            Ejemplo: Si pagas $100, el creador recibe $90 y $10 van a la plataforma.
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/company/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => router.push('/company/jobs')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">💼</span>
            <span className="text-xs">Mis Gigs</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-sky-500">
            <span className="text-lg">💰</span>
            <span className="text-xs font-medium">Wallet</span>
          </div>
          <button onClick={() => router.push('/company/applicants')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">👥</span>
            <span className="text-xs">Aplicantes</span>
          </button>
        </div>
        <div className="h-1 bg-white mx-auto w-32 rounded-full mb-2" />
      </div>
    </div>
  )
}
