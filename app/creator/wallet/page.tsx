'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

interface WithdrawalRequest {
  id: string
  amount: number
  fee: number
  net_amount: number
  method: string
  status: string
  created_at: string
  processed_at?: string
  admin_notes?: string
}

// Corner Accent Component
const CornerAccent = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const positions = {
    tl: 'top-0 left-0 border-t-2 border-l-2 rounded-tl-xl',
    tr: 'top-0 right-0 border-t-2 border-r-2 rounded-tr-xl',
    bl: 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl',
    br: 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl',
  }
  return (
    <div className={`absolute w-4 h-4 border-emerald-500/50 ${positions[position]}`} />
  )
}

// Professional Card with corner accents
const PremiumCard = ({ children, className = '', accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) => (
  <div className={`relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}>
    {accent && (
      <>
        <CornerAccent position="tl" />
        <CornerAccent position="br" />
      </>
    )}
    {children}
  </div>
)

// Icon components (replacing emojis)
const Icons = {
  wallet: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  send: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  bank: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  arrowUp: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  arrowDown: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  creditCard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  briefcase: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

export default function CreatorWallet() {
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'bank_transfer' | 'paypal' | 'crypto_usdt' | 'crypto_usdc'>('bank_transfer')
  const [paymentDetails, setPaymentDetails] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'withdrawals'>('overview')

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
      window.location.href = '/auth/login'
      return
    }

    try {
      const walletRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (!walletRes.ok) {
        setLoading(false)
        return
      }

      const wallets = await walletRes.json()

      if (wallets.length > 0) {
        setWallet(wallets[0])

        const txRes = await fetch(
          `${SUPABASE_URL}/rest/v1/transactions?wallet_id=eq.${wallets[0].id}&select=*&order=created_at.desc&limit=20`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (txRes.ok) {
          const txs = await txRes.json()
          setTransactions(txs)
        }
      } else {
        const createRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
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
        })
        if (createRes.ok) {
          const newWallets = await createRes.json()
          if (newWallets.length > 0) setWallet(newWallets[0])
        }
      }

      const wdRes = await fetch(
        `${SUPABASE_URL}/rest/v1/withdrawal_requests?user_id=eq.${userId}&select=*&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (wdRes.ok) {
        const wds = await wdRes.json()
        setWithdrawals(wds)
      }

      setLoading(false)
    } catch (err) {
      console.error('[CreatorWallet] Error:', err)
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Por favor ingresa un monto válido')
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (amount > wallet.balance) {
      alert('No tienes suficiente balance')
      return
    }

    if (!paymentDetails.trim()) {
      alert('Por favor ingresa los detalles de pago')
      return
    }

    setProcessing(true)
    const token = getToken()
    const userId = getUserId()

    const fee = amount * 0.02
    const netAmount = amount - fee

    try {
      const requestBody = {
        user_id: userId,
        amount: Number(amount),
        fee: Number(fee),
        net_amount: Number(netAmount),
        method: String(withdrawMethod),
        status: 'pending',
        payment_details: { info: String(paymentDetails) }
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(requestBody)
      })

      if (!res.ok) {
        const responseText = await res.text()
        throw new Error('Error: ' + responseText.substring(0, 100))
      }

      await fetch(`${SUPABASE_URL}/rest/v1/wallets?id=eq.${wallet.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          balance: wallet.balance - amount,
          pending_balance: (wallet.pending_balance || 0) + amount
        })
      })

      setShowWithdrawModal(false)
      setWithdrawAmount('')
      setPaymentDetails('')
      await loadWalletData()
      alert('Solicitud de retiro creada exitosamente!')
    } catch (err: any) {
      console.error('[Withdraw] Error:', err)
      alert('Error al crear solicitud: ' + (err.message || 'Intenta de nuevo'))
    }
    setProcessing(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string; dotColor: string }> = {
      'pending': { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'En revisión', dotColor: 'bg-amber-400' },
      'approved': { bg: 'bg-sky-500/10', text: 'text-sky-400', label: 'Aprobado', dotColor: 'bg-sky-400' },
      'processing': { bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Procesando', dotColor: 'bg-violet-400' },
      'completed': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completado', dotColor: 'bg-emerald-400' },
      'rejected': { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Rechazado', dotColor: 'bg-red-400' }
    }
    return config[status] || { bg: 'bg-neutral-500/10', text: 'text-neutral-400', label: status, dotColor: 'bg-neutral-400' }
  }

  const getMethodIcon = (method: string) => {
    const icons: Record<string, React.ReactNode> = {
      'bank_transfer': Icons.bank,
      'paypal': Icons.creditCard,
      'crypto_usdt': <span className="text-sm font-bold">T</span>,
      'crypto_usdc': <span className="text-sm font-bold">U</span>
    }
    return icons[method] || Icons.wallet
  }

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'bank_transfer': 'Transferencia',
      'paypal': 'PayPal',
      'crypto_usdt': 'USDT',
      'crypto_usdc': 'USDC'
    }
    return labels[method] || method
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/creator/dashboard"
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/5"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Wallet</span>
            </div>
            <div className="w-10" />
          </div>

          {/* Balance Card */}
          <PremiumCard accent className="p-6 mb-6">
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Balance Disponible</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-white/40 text-2xl font-light">$</span>
                <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  {wallet?.balance?.toFixed(2) || '0.00'}
                </h2>
              </div>
              {wallet && wallet.pending_balance > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-white/40">
                    <span className="text-amber-400 font-medium">${wallet.pending_balance.toFixed(2)}</span> en proceso
                  </span>
                </div>
              )}
            </div>
          </PremiumCard>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <PremiumCard className="p-4 text-center">
              <p className="text-xl font-semibold text-emerald-400">${wallet?.total_earned?.toFixed(2) || '0.00'}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Ganado</p>
            </PremiumCard>
            <PremiumCard className="p-4 text-center">
              <p className="text-xl font-semibold">${wallet?.total_withdrawn?.toFixed(2) || '0.00'}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Retirado</p>
            </PremiumCard>
            <PremiumCard className="p-4 text-center">
              <p className="text-xl font-semibold text-amber-400">{pendingWithdrawals.length}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Pendiente</p>
            </PremiumCard>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!wallet || wallet.balance < 10}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
          >
            {Icons.send}
            <span>Retirar Fondos</span>
          </button>
          {wallet && wallet.balance > 0 && wallet.balance < 10 && (
            <p className="text-center text-amber-400/60 text-xs mt-3">Mínimo de retiro: $10.00</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 py-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'activity', label: 'Actividad' },
            { id: 'withdrawals', label: 'Retiros', badge: pendingWithdrawals.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] flex items-center justify-center text-black font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <PremiumCard accent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                    {Icons.arrowDown}
                  </div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">Disponible</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">${wallet?.balance?.toFixed(2) || '0.00'}</p>
              </PremiumCard>
              <PremiumCard accent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400">
                    {Icons.clock}
                  </div>
                  <span className="text-white/40 text-xs uppercase tracking-wider">En Proceso</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">${wallet?.pending_balance?.toFixed(2) || '0.00'}</p>
              </PremiumCard>
            </div>

            {/* Payment Methods */}
            <PremiumCard className="p-5">
              <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">Métodos de Retiro</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bank', icon: Icons.bank, name: 'Banco', desc: 'Transferencia' },
                  { id: 'paypal', icon: Icons.creditCard, name: 'PayPal', desc: 'Instantáneo' },
                  { id: 'usdt', icon: <span className="text-sm font-bold">T</span>, name: 'USDT', desc: 'TRC20' },
                  { id: 'usdc', icon: <span className="text-sm font-bold">U</span>, name: 'USDC', desc: 'ERC20' }
                ].map((method) => (
                  <div key={method.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/60">
                      {method.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{method.name}</p>
                      <p className="text-[10px] text-white/30">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>

            {/* Info */}
            <PremiumCard className="p-5 border-emerald-500/20">
              <h4 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">Información</h4>
              <ul className="space-y-3">
                {[
                  'Fee de retiro: 2%',
                  'Procesamiento: 1-3 días hábiles',
                  'Mínimo de retiro: $10.00',
                  'Sin límite máximo'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/50">
                    <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-400">
                      {Icons.check}
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </PremiumCard>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white/20">
                  {Icons.wallet}
                </div>
                <p className="text-white/30 text-sm">Sin actividad reciente</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <PremiumCard key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {tx.type === 'withdrawal' ? Icons.arrowUp : Icons.arrowDown}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description || 'Pago recibido'}</p>
                      <p className="text-xs text-white/30">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.net_amount?.toFixed(2) || tx.amount?.toFixed(2)}
                    </p>
                  </div>
                </PremiumCard>
              ))
            )}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-2">
            {withdrawals.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white/20">
                  {Icons.send}
                </div>
                <p className="text-white/30 text-sm">Sin solicitudes de retiro</p>
              </div>
            ) : (
              withdrawals.map((wd) => {
                const status = getStatusConfig(wd.status)
                return (
                  <PremiumCard key={wd.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/60">
                          {getMethodIcon(wd.method)}
                        </div>
                        <div>
                          <p className="font-semibold">${wd.amount.toFixed(2)}</p>
                          <p className="text-xs text-white/30">{getMethodLabel(wd.method)}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${status.bg} ${status.text}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                        {status.label}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-white/30 pt-3 border-t border-white/5">
                      <span>Neto: ${wd.net_amount.toFixed(2)}</span>
                      <span>{formatDate(wd.created_at)}</span>
                    </div>
                    {wd.status === 'approved' && (
                      <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <p className="text-xs text-emerald-400">Tu pago fue aprobado y llegará en 1-3 días hábiles.</p>
                      </div>
                    )}
                    {wd.status === 'rejected' && (
                      <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-xs text-red-400">Solicitud rechazada. El monto fue devuelto a tu balance.</p>
                      </div>
                    )}
                  </PremiumCard>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex justify-around py-3">
          {[
            { href: '/gigs', icon: Icons.briefcase, label: 'Trabajos', active: false },
            { href: '/creator/dashboard', icon: Icons.chart, label: 'Panel', active: false },
            { href: '/creator/wallet', icon: Icons.wallet, label: 'Wallet', active: true },
            { href: '/creator/messages', icon: Icons.chat, label: 'Mensajes', active: false },
            { href: '/creator/profile', icon: Icons.user, label: 'Perfil', active: false },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 ${item.active ? 'text-emerald-400' : 'text-white/30 hover:text-white/50'} transition-colors`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="h-1 bg-white/10 mx-auto w-32 rounded-full mb-2" />
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />

          <div className="relative w-full max-w-lg bg-[#111] rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto border border-white/10">
            {/* Handle */}
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />

            {/* Close */}
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-semibold mb-6">Retirar Fondos</h2>

            <div className="space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Monto a retirar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-white/30">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    max={wallet?.balance || 0}
                    min="10"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 pl-10 text-2xl font-semibold focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20 transition-colors"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-white/30">Disponible: ${wallet?.balance?.toFixed(2)}</span>
                  {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                    <span className="text-emerald-400">
                      Recibes: ${(parseFloat(withdrawAmount) * 0.98).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-3">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bank_transfer', label: 'Banco', icon: Icons.bank },
                    { id: 'paypal', label: 'PayPal', icon: Icons.creditCard },
                    { id: 'crypto_usdt', label: 'USDT', icon: <span className="text-sm font-bold">T</span> },
                    { id: 'crypto_usdc', label: 'USDC', icon: <span className="text-sm font-bold">U</span> }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setWithdrawMethod(m.id as any)}
                      className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                        withdrawMethod === m.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        withdrawMethod === m.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                      }`}>
                        {m.icon}
                      </div>
                      <span className="font-medium text-sm">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  {withdrawMethod === 'bank_transfer' && 'Número de cuenta / IBAN'}
                  {withdrawMethod === 'paypal' && 'Email de PayPal'}
                  {withdrawMethod === 'crypto_usdt' && 'Dirección USDT (TRC20)'}
                  {withdrawMethod === 'crypto_usdc' && 'Dirección USDC (ERC20)'}
                </label>
                <input
                  type="text"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder={
                    withdrawMethod === 'bank_transfer' ? 'ES91 2100 0418 4502 0005 1332' :
                    withdrawMethod === 'paypal' ? 'tu@email.com' :
                    '0x...'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleWithdraw}
                disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) < 10 || parseFloat(withdrawAmount) > (wallet?.balance || 0) || !paymentDetails}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirmar Retiro'
                )}
              </button>

              <p className="text-[10px] text-white/30 text-center uppercase tracking-wider">
                Fee de 2% aplicado · Procesamiento 1-3 días hábiles
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
