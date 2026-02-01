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
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'bank_transfer' | 'paypal' | 'crypto_usdt' | 'crypto_usdc'>('bank_transfer')
  const [paymentDetails, setPaymentDetails] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'withdrawals'>('overview')

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

      // Load withdrawal requests
      const wdRes = await fetch(
        `${SUPABASE_URL}/rest/v1/withdrawal_requests?user_id=eq.${userId}&select=*&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const wds = wdRes.ok ? await wdRes.json() : []
      setWithdrawals(wds)

      setLoading(false)
    } catch (err) {
      console.error('Error loading wallet:', err)
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

    // Calculate fee (2% for simplicity)
    const fee = amount * 0.02
    const netAmount = amount - fee

    try {
      // Create withdrawal request
      const res = await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          wallet_id: wallet.id,
          amount: amount,
          fee: fee,
          net_amount: netAmount,
          method: withdrawMethod,
          status: 'pending',
          payment_details: { details: paymentDetails }
        })
      })

      if (res.ok) {
        // Update wallet balance (move to pending)
        await fetch(`${SUPABASE_URL}/rest/v1/wallets?id=eq.${wallet.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            balance: wallet.balance - amount,
            pending_balance: (wallet.pending_balance || 0) + amount,
            updated_at: new Date().toISOString()
          })
        })

        alert('✅ Solicitud de retiro creada. Un admin la revisará pronto.')
        setShowWithdrawModal(false)
        setWithdrawAmount('')
        setPaymentDetails('')
        await loadWalletData()
      } else {
        alert('Error al crear la solicitud')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al procesar')
    }
    setProcessing(false)
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-700',
      'approved': 'bg-blue-100 text-blue-700',
      'processing': 'bg-purple-100 text-purple-700',
      'completed': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'approved': 'Aprobado',
      'processing': 'Procesando',
      'completed': 'Completado',
      'rejected': 'Rechazado'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      'payment_received': '💰',
      'bonus': '🎁',
      'withdrawal': '📤',
      'refund': '↩️'
    }
    return icons[type] || '💵'
  }

  const getMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      'bank_transfer': '🏦',
      'paypal': '💳',
      'crypto_usdt': '₮',
      'crypto_usdc': '💵'
    }
    return icons[method] || '💵'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              onClick={() => router.push('/creator/dashboard')}
              className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold">💰 Mi Wallet</h1>
              <p className="text-xs text-neutral-500">Balance y retiros</p>
            </div>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="text-center mb-6">
            <p className="text-sm text-green-100 mb-2">Balance Disponible</p>
            <p className="text-5xl font-black">${wallet?.balance?.toFixed(2) || '0.00'}</p>
            {wallet && wallet.pending_balance > 0 && (
              <p className="text-sm text-green-200 mt-2">
                + ${wallet.pending_balance.toFixed(2)} pendiente de aprobación
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">${wallet?.total_earned?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-green-100">Total Ganado</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">${wallet?.total_withdrawn?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-green-100">Total Retirado</p>
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!wallet || wallet.balance <= 0}
            className="w-full py-4 bg-white text-green-600 rounded-2xl font-bold text-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📤 Retirar Fondos
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-900 rounded-2xl p-1">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'transactions', label: 'Transacciones' },
            { id: 'withdrawals', label: 'Retiros' }
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
            {/* Quick Info */}
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
              <h3 className="font-semibold mb-4">📊 Resumen Rápido</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Transacciones este mes</span>
                  <span className="font-semibold">{transactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Retiros pendientes</span>
                  <span className="font-semibold text-amber-400">
                    {withdrawals.filter(w => w.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Fee de retiro</span>
                  <span className="font-semibold">2%</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
              <h3 className="font-semibold mb-4">💳 Métodos de Retiro</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'bank_transfer', label: 'Transferencia', icon: '🏦' },
                  { id: 'paypal', label: 'PayPal', icon: '💳' },
                  { id: 'crypto_usdt', label: 'USDT', icon: '₮' },
                  { id: 'crypto_usdc', label: 'USDC', icon: '💵' }
                ].map((method) => (
                  <div key={method.id} className="bg-neutral-800 rounded-xl p-4 text-center">
                    <span className="text-2xl block mb-2">{method.icon}</span>
                    <span className="text-sm text-neutral-400">{method.label}</span>
                  </div>
                ))}
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
                        <p className="font-medium">{tx.description || tx.type}</p>
                        <p className="text-sm text-neutral-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.type === 'withdrawal' ? '-' : '+'}${tx.net_amount.toFixed(2)}
                      </p>
                      {tx.fee > 0 && (
                        <p className="text-xs text-neutral-500">Fee: ${tx.fee.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center">
                <span className="text-4xl block mb-4">📤</span>
                <p className="text-neutral-500">No has solicitado retiros aún</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {withdrawals.map((wd) => (
                  <div key={wd.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{getMethodIcon(wd.method)}</span>
                        <span className="font-medium">${wd.amount.toFixed(2)}</span>
                      </div>
                      {getStatusBadge(wd.status)}
                    </div>
                    <div className="flex justify-between text-sm text-neutral-500">
                      <span>Fee: ${wd.fee.toFixed(2)} • Neto: ${wd.net_amount.toFixed(2)}</span>
                      <span>{formatDate(wd.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          />
          <div className="relative bg-neutral-900 rounded-2xl p-6 w-full max-w-md border border-neutral-800">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-6">📤 Solicitar Retiro</h2>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Monto (máx: ${wallet?.balance?.toFixed(2) || '0.00'})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    max={wallet?.balance || 0}
                    min="1"
                    step="0.01"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 pl-8 text-lg font-semibold focus:outline-none focus:border-green-500"
                  />
                </div>
                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <p className="text-sm text-neutral-500 mt-2">
                    Fee (2%): ${(parseFloat(withdrawAmount) * 0.02).toFixed(2)} •
                    Recibirás: ${(parseFloat(withdrawAmount) * 0.98).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Método de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bank_transfer', label: 'Banco', icon: '🏦' },
                    { id: 'paypal', label: 'PayPal', icon: '💳' },
                    { id: 'crypto_usdt', label: 'USDT', icon: '₮' },
                    { id: 'crypto_usdc', label: 'USDC', icon: '💵' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setWithdrawMethod(m.id as any)}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                        withdrawMethod === m.id
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span className="text-sm font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
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
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleWithdraw}
                disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !paymentDetails}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>📤 Solicitar Retiro</>
                )}
              </button>

              <p className="text-xs text-neutral-500 text-center">
                Las solicitudes son revisadas manualmente. Tiempo estimado: 1-3 días hábiles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/gigs')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">💼</span>
            <span className="text-xs">Jobs</span>
          </button>
          <button onClick={() => router.push('/creator/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs">Dashboard</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-green-500">
            <span className="text-lg">💰</span>
            <span className="text-xs font-medium">Wallet</span>
          </div>
          <button onClick={() => router.push('/creator/profile')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">👤</span>
            <span className="text-xs">Profile</span>
          </button>
        </div>
        <div className="h-1 bg-white mx-auto w-32 rounded-full mb-2" />
      </div>
    </div>
  )
}
