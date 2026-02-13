'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const MINIMUM_PAYOUT = 10.20

type PayoutStatus = 'completed' | 'canceled' | 'pending'

interface Payout {
  id: string
  amount: number
  status: PayoutStatus
  method: string
  methodIcon: 'bank' | 'paypal' | 'bitcoin' | 'crypto'
  date: string
  type?: 'incoming' | 'withdrawal'
}

export default function CreatorWallet() {
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [balance, setBalance] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      setLoading(true)

      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')

      if (!userStr) {
        setNeedsSetup(true)
        setLoading(false)
        return
      }

      const user = JSON.parse(userStr)
      setUserId(user.id)

      // Fetch balance
      const balanceRes = await fetch(`/api/whop/creator-balance?userId=${user.id}&token=${token || ''}`)
      const balanceData = await balanceRes.json()

      if (balanceData.needsSetup) {
        setNeedsSetup(true)
        setLoading(false)
        return
      }

      // Even if there's an error, show the wallet with 0 balance
      setBalance(balanceData.balance || 0)
      setTotalBalance(balanceData.totalBalance || 0)

      // Fetch payouts
      try {
        const payoutsRes = await fetch(`/api/whop/creator-payouts?userId=${user.id}`)
        const payoutsData = await payoutsRes.json()
        if (payoutsData.payouts) {
          setPayouts(payoutsData.payouts)
        }
      } catch {
        // Ignore payout errors
      }

    } catch (err) {
      console.error('[Wallet] Error:', err)
      // Show wallet anyway with 0 balance
    }
    setLoading(false)
  }

  const startSetup = async () => {
    setLoading(true)

    try {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (!userStr || !token) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)

      // Get profile for full name
      const profileRes = await fetch(
        `https://ftvqoudlmojdxwjxljzr.supabase.co/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'
          }
        }
      )
      const profiles = await profileRes.json()
      const profile = profiles[0] || {}

      const res = await fetch('/api/whop/setup-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: profile.full_name,
          existingCompanyId: profile.whop_company_id
        })
      })

      const data = await res.json()

      if (data.kycUrl) {
        window.location.href = data.kycUrl
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('[Wallet] Setup error:', err)
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!userId) return

    setWithdrawing(true)

    try {
      const res = await fetch('/api/whop/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'portal'
        })
      })

      const data = await res.json()

      if (data.portalUrl) {
        window.location.href = data.portalUrl
      }
    } catch (err) {
      console.error('[Wallet] Withdraw error:', err)
    }
    setWithdrawing(false)
  }

  const canWithdraw = balance >= MINIMUM_PAYOUT

  // Loading state with Sideshift style
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Needs Setup - Beautiful card
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header />

        {/* Balance Section - Shows 0 */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-gray-500 text-sm">Available balance</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">0.00 US$</h2>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-blue-600 text-sm font-medium">Total balance</span>
            <span className="text-gray-900 font-medium">0.00 US$</span>
          </div>
        </div>

        {/* Setup Card */}
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Configura tu cuenta</h2>
            <p className="text-gray-500 text-sm mb-6">Verifica tu identidad para recibir pagos de las marcas</p>

            <button
              onClick={startSetup}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-md"
            >
              Comenzar verificación
            </button>
          </div>
        </div>

        {/* Empty payouts */}
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm">
          <div className="px-5 py-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No tienes retiros aún</p>
            <p className="text-gray-400 text-sm mt-1">Tus retiros aparecerán aquí</p>
          </div>
        </div>

        <div className="h-32" />
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Main Wallet - Sideshift Style
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header showMenu={showMenu} setShowMenu={setShowMenu} onRefresh={loadWalletData} onSetup={startSetup} />

      {/* Balance Card */}
      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-6">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-gray-500 text-sm">Available balance</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{balance.toFixed(2)} US$</h2>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-blue-600 text-sm font-medium">Total balance</span>
          <span className="text-gray-900 font-medium">{totalBalance.toFixed(2)} US$</span>
        </div>
      </div>

      {/* Payouts List */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Historial de retiros</h3>
        </div>
        {payouts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No tienes retiros aún</p>
            <p className="text-gray-400 text-sm mt-1">Tus retiros aparecerán aquí</p>
          </div>
        ) : (
          <div>
            {payouts.map((payout) => (
              <PayoutItem key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </div>

      {/* Fixed Bottom - Withdraw Button */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-4">
        <button
          onClick={handleWithdraw}
          disabled={!canWithdraw || withdrawing}
          className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
            canWithdraw && !withdrawing
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {withdrawing ? 'Abriendo portal...' : 'Withdraw'}
        </button>
        <p className="text-center text-gray-400 text-sm mt-2">
          Minimum payout amount: {MINIMUM_PAYOUT.toFixed(2)} US$
        </p>
      </div>

      <div className="h-40" />
      <BottomNav active="wallet" />
    </div>
  )
}

function Header({ showMenu, setShowMenu, onRefresh, onSetup }: {
  showMenu?: boolean
  setShowMenu?: (v: boolean) => void
  onRefresh?: () => void
  onSetup?: () => void
}) {
  return (
    <>
      <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <Link href="/creator/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">Payouts</h1>
        {setShowMenu ? (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Menu Dropdown */}
      {showMenu && setShowMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
          <div className="absolute right-4 top-14 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-30 min-w-[180px]">
            {onSetup && (
              <button
                onClick={() => {
                  setShowMenu(false)
                  onSetup()
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Métodos de pago
              </button>
            )}
            {onRefresh && (
              <button
                onClick={() => {
                  setShowMenu(false)
                  onRefresh()
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}

function PayoutItem({ payout }: { payout: Payout }) {
  const statusConfig = {
    completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completado' },
    canceled: { bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelado' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Pendiente' }
  }

  const config = statusConfig[payout.status] || statusConfig.pending

  const methodIcons = {
    bank: '🏦',
    paypal: '🅿️',
    bitcoin: '₿',
    crypto: '💰'
  }

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
          {methodIcons[payout.methodIcon]}
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {payout.type === 'incoming' ? '+' : '-'}{payout.amount.toFixed(2)} US$
          </p>
          <p className="text-gray-400 text-xs">{payout.date}</p>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full ${config.bg}`}>
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      </div>
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { id: 'gigs', href: '/gigs', label: 'Gigs', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'analytics', href: '/creator/dashboard', label: 'Analytics', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { id: 'messages', href: '/creator/messages', label: 'Messages', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )},
    { id: 'wallet', href: '/creator/wallet', label: 'Payouts', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center py-2 px-4 transition-colors ${
              active === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
