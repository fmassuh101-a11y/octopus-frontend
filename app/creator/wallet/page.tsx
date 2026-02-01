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

    console.log('[CreatorWallet] Loading...', { hasToken: !!token, userId })

    if (!token || !userId) {
      window.location.href = '/auth/login'
      return
    }

    try {
      // Load wallet
      const walletRes = await fetch(
        `${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userId}&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (!walletRes.ok) {
        console.error('[CreatorWallet] Wallet fetch failed:', walletRes.status)
        setLoading(false)
        return
      }

      const wallets = await walletRes.json()
      console.log('[CreatorWallet] Wallets:', wallets)

      if (wallets.length > 0) {
        setWallet(wallets[0])

        // Load transactions
        const txRes = await fetch(
          `${SUPABASE_URL}/rest/v1/transactions?wallet_id=eq.${wallets[0].id}&select=*&order=created_at.desc&limit=20`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (txRes.ok) {
          const txs = await txRes.json()
          setTransactions(txs)
        }
      } else {
        // Create wallet if doesn't exist
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

      // Load withdrawal requests
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
      // Create withdrawal request FIRST with minimal data
      console.log('[Withdraw] Creating request for user:', userId)
      console.log('[Withdraw] Data:', { amount, fee, netAmount, method: withdrawMethod })

      const requestBody = {
        user_id: userId,
        amount: Number(amount),
        fee: Number(fee),
        net_amount: Number(netAmount),
        method: String(withdrawMethod),
        status: 'pending',
        payment_details: { info: String(paymentDetails) }
      }

      console.log('[Withdraw] Request body:', JSON.stringify(requestBody))

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

      const responseText = await res.text()
      console.log('[Withdraw] Response:', res.status, responseText)

      if (!res.ok) {
        console.error('[Withdraw] Failed:', responseText)
        throw new Error('Error: ' + responseText.substring(0, 100))
      }

      // Only update wallet if request was created successfully
      console.log('[Withdraw] Updating wallet...')
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
    const config: Record<string, { bg: string; text: string; label: string }> = {
      'pending': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pendiente' },
      'approved': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Aprobado' },
      'processing': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Procesando' },
      'completed': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completado' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rechazado' }
    }
    return config[status] || { bg: 'bg-neutral-500/20', text: 'text-neutral-400', label: status }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando wallet...</p>
        </div>
      </div>
    )
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing')

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-emerald-900/30 to-black">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-6">
            <Link href="/creator/dashboard" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold">Mi Wallet</h1>
            <div className="w-10" />
          </div>

          {/* Balance Card */}
          <div className="text-center py-8">
            <p className="text-emerald-400 text-sm font-medium mb-2">Balance Disponible</p>
            <h2 className="text-6xl font-black tracking-tight mb-2">
              ${wallet?.balance?.toFixed(2) || '0.00'}
            </h2>
            {wallet && wallet.pending_balance > 0 && (
              <p className="text-white/50 text-sm">
                <span className="text-amber-400">${wallet.pending_balance.toFixed(2)}</span> en proceso de retiro
              </p>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-white/5 backdrop-blur rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-emerald-400">${wallet?.total_earned?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-white/50 mt-1">Total Ganado</p>
            </div>
            <div className="flex-1 bg-white/5 backdrop-blur rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold">${wallet?.total_withdrawn?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-white/50 mt-1">Retirado</p>
            </div>
            <div className="flex-1 bg-white/5 backdrop-blur rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-amber-400">{pendingWithdrawals.length}</p>
              <p className="text-xs text-white/50 mt-1">Pendientes</p>
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!wallet || wallet.balance < 10}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Retirar Fondos
          </button>
          {wallet && wallet.balance > 0 && wallet.balance < 10 && (
            <p className="text-center text-amber-400 text-sm mt-2">Mínimo de retiro: $10.00</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'activity'
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Actividad
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all relative ${
              activeTab === 'withdrawals'
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Retiros
            {pendingWithdrawals.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-xs flex items-center justify-center text-black font-bold">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">💵</span>
                  </div>
                  <span className="text-white/50 text-sm">Disponible</span>
                </div>
                <p className="text-3xl font-black text-emerald-400">${wallet?.balance?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">⏳</span>
                  </div>
                  <span className="text-white/50 text-sm">En Proceso</span>
                </div>
                <p className="text-3xl font-black text-amber-400">${wallet?.pending_balance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Métodos de Pago */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span>💳</span> Métodos de Retiro Disponibles
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🏦', name: 'Banco', desc: 'Transferencia' },
                  { icon: '💳', name: 'PayPal', desc: 'Instantáneo' },
                  { icon: '₮', name: 'USDT', desc: 'Crypto TRC20' },
                  { icon: '💵', name: 'USDC', desc: 'Crypto ERC20' }
                ].map((method) => (
                  <div key={method.name} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{method.name}</p>
                      <p className="text-xs text-white/40">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-5 border border-emerald-500/20">
              <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <span>💡</span> Información
              </h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Fee de retiro: solo 2%
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Procesamiento: 1-3 días hábiles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Mínimo de retiro: $10.00
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Sin límite máximo
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💸</span>
                </div>
                <p className="text-white/40 mb-2">Sin actividad reciente</p>
                <p className="text-white/20 text-sm">Tus pagos aparecerán aquí</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'withdrawal' ? 'bg-red-500/20' : 'bg-emerald-500/20'
                    }`}>
                      {tx.type === 'withdrawal' ? '📤' : '💰'}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description || 'Pago recibido'}</p>
                      <p className="text-xs text-white/40">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.net_amount?.toFixed(2) || tx.amount?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📤</span>
                </div>
                <p className="text-white/40 mb-2">Sin retiros</p>
                <p className="text-white/20 text-sm">Tus solicitudes de retiro aparecerán aquí</p>
              </div>
            ) : (
              withdrawals.map((wd) => {
                const status = getStatusConfig(wd.status)
                return (
                  <div key={wd.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {wd.method === 'bank_transfer' && '🏦'}
                          {wd.method === 'paypal' && '💳'}
                          {wd.method === 'crypto_usdt' && '₮'}
                          {wd.method === 'crypto_usdc' && '💵'}
                        </span>
                        <span className="font-bold text-lg">${wd.amount.toFixed(2)}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-white/40">
                      <span>Neto: ${wd.net_amount.toFixed(2)}</span>
                      <span>{formatDate(wd.created_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">💼</span>
            <span className="text-[10px]">Trabajos</span>
          </Link>
          <Link href="/creator/dashboard" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">📊</span>
            <span className="text-[10px]">Panel</span>
          </Link>
          <div className="flex flex-col items-center gap-1 text-emerald-400">
            <span className="text-xl">💰</span>
            <span className="text-[10px] font-medium">Wallet</span>
          </div>
          <Link href="/creator/messages" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">💬</span>
            <span className="text-[10px]">Mensajes</span>
          </Link>
          <Link href="/creator/profile" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">👤</span>
            <span className="text-[10px]">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-white/20 mx-auto w-32 rounded-full mb-2" />
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />

          <div className="relative w-full max-w-lg bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

            {/* Close */}
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6">Retirar Fondos</h2>

            <div className="space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Monto a retirar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/40">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    max={wallet?.balance || 0}
                    min="10"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-10 text-2xl font-bold focus:outline-none focus:border-emerald-500 placeholder:text-white/20"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-white/40">Disponible: ${wallet?.balance?.toFixed(2)}</span>
                  {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                    <span className="text-emerald-400">
                      Recibes: ${(parseFloat(withdrawAmount) * 0.98).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm text-white/60 mb-3">Método de pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'bank_transfer', label: 'Banco', icon: '🏦' },
                    { id: 'paypal', label: 'PayPal', icon: '💳' },
                    { id: 'crypto_usdt', label: 'USDT', icon: '₮' },
                    { id: 'crypto_usdc', label: 'USDC', icon: '💵' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setWithdrawMethod(m.id as any)}
                      className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                        withdrawMethod === m.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl">{m.icon}</span>
                      <span className="font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleWithdraw}
                disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) < 10 || parseFloat(withdrawAmount) > (wallet?.balance || 0) || !paymentDetails}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirmar Retiro'
                )}
              </button>

              <p className="text-xs text-white/40 text-center">
                Fee de 2% aplicado. Procesamiento en 1-3 días hábiles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
