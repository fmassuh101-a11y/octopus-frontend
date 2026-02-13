'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Minimum payout amount in USD
const MINIMUM_PAYOUT = 10.20

type PayoutStatus = 'completed' | 'canceled' | 'pending'

interface Payout {
  id: string
  amount: number
  status: PayoutStatus
  method: string
  methodIcon: 'bank' | 'paypal' | 'bitcoin' | 'crypto'
  date: string
}

export default function CreatorWallet() {
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    checkUserSetup()
  }, [])

  const checkUserSetup = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        setError('No has iniciado sesión')
        setLoading(false)
        return
      }

      const user = JSON.parse(userStr)

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Wallet] Profile fetch error:', res.status, errorText)
        if (res.status === 401) {
          setError('Sesión expirada. Por favor inicia sesión de nuevo.')
        } else {
          setError(`Error al cargar perfil (${res.status})`)
        }
        setLoading(false)
        return
      }

      const profiles = await res.json()
      if (profiles.length === 0) {
        setError('Perfil no encontrado')
        setLoading(false)
        return
      }

      const profile = profiles[0]

      if (!profile.whop_company_id) {
        setNeedsSetup(true)
      } else {
        setCompanyId(profile.whop_company_id)
        // TODO: Fetch real balance and payouts from Whop API
        setBalance(0)
        setTotalBalance(0)
        setPayouts([])
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const startSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (!userStr || !token) throw new Error('No autenticado')

      const user = JSON.parse(userStr)

      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
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

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear cuenta')
      }

      if (data.kycUrl) {
        // Open KYC in same window for better mobile experience
        window.location.href = data.kycUrl
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const canWithdraw = balance >= MINIMUM_PAYOUT

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Needs Setup - Show setup prompt
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <Link href="/creator/dashboard" className="p-2 -ml-2">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900">Payouts</h1>
          <div className="w-10" />
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Configura tu cuenta de pagos</h2>
              <p className="text-gray-500 text-sm">Verifica tu identidad para poder recibir pagos</p>
            </div>

            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Cargando...' : 'Comenzar verificación'}
            </button>
          </div>
        </div>

        <BottomNav active="wallet" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <Link href="/creator/dashboard" className="p-2 -ml-2">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-900">Payouts</h1>
          <div className="w-10" />
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-5 py-2 rounded-lg text-sm font-medium"
              >
                Reintentar
              </button>
              <Link
                href="/auth/login"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Main Wallet - Sideshift Style
  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10">
        <Link href="/creator/dashboard" className="p-2 -ml-2">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-semibold text-gray-900">Payouts</h1>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 -mr-2"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
          <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
            Configuración
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
            Ayuda
          </button>
        </div>
      )}

      {/* Balance Section */}
      <div className="bg-white px-5 py-6 border-b border-gray-200">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-gray-500 text-sm">Available balance</span>
          <button className="text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {balance.toFixed(2)} US$
        </h2>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-blue-600 text-sm font-medium">Total balance</span>
          <span className="text-gray-900 font-medium">{totalBalance.toFixed(2)} US$</span>
        </div>
      </div>

      {/* Payouts List */}
      <div className="bg-white mt-2">
        {payouts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500">No tienes retiros aún</p>
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
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4">
        <button
          disabled={!canWithdraw}
          className={`w-full py-4 rounded-xl font-semibold text-base transition-colors ${
            canWithdraw
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Withdraw
        </button>
        <p className="text-center text-gray-400 text-sm mt-2">
          Minimum payout amount: {MINIMUM_PAYOUT.toFixed(2)} US$
        </p>
      </div>

      <BottomNav active="wallet" />
    </div>
  )
}

function PayoutItem({ payout }: { payout: Payout }) {
  const statusColors = {
    completed: 'bg-green-50 text-green-500',
    canceled: 'bg-red-50 text-red-500',
    pending: 'bg-yellow-50 text-yellow-500'
  }

  const statusIcons = {
    completed: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    canceled: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    pending: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const methodIcons = {
    bank: '🏦',
    paypal: '🅿️',
    bitcoin: '₿',
    crypto: '💰'
  }

  return (
    <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1 text-left">
        <p className="font-semibold text-gray-900">
          {payout.amount.toFixed(2)} US$ <span className="font-normal text-gray-500">{payout.status}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg">{methodIcons[payout.methodIcon]}</span>
          <span className="text-gray-500 text-sm">{payout.method}</span>
        </div>
        <p className="text-gray-400 text-xs mt-1">{payout.date}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${statusColors[payout.status]}`}>
          {statusIcons[payout.status]}
        </div>
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center py-2 px-4 ${
              active === item.id ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
