'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MINIMUM_PAYOUT = 10.20

// Dynamically import Whop components to avoid SSR issues
const WhopPayoutsEmbed = dynamic(() => import('./WhopPayoutsEmbed'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-20 bg-gray-200 rounded-xl mb-4" />
      <div className="h-32 bg-gray-200 rounded-xl mb-4" />
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )
})

export default function CreatorWallet() {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [needsKyc, setNeedsKyc] = useState(false)
  const [balance, setBalance] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [showEmbedded, setShowEmbedded] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      setLoading(true)

      const userStr = localStorage.getItem('sb-user')
      if (!userStr) {
        setNeedsSetup(true)
        setLoading(false)
        return
      }

      const user = JSON.parse(userStr)
      setUserId(user.id)

      const res = await fetch(`/api/whop/creator-balance?userId=${user.id}`)
      const data = await res.json()

      if (data.needsSetup) {
        setNeedsSetup(true)
      } else if (!data.kycComplete) {
        setNeedsKyc(true)
        setCompanyId(data.companyId)
        setShowEmbedded(true)
      } else {
        setCompanyId(data.companyId)
        setBalance(data.balance || 0)
        setTotalBalance(data.totalBalance || 0)
        setShowEmbedded(true)
      }
    } catch (err) {
      console.error('[Wallet] Error:', err)
    }
    setLoading(false)
  }

  // Create Whop company and redirect to KYC
  const startSetup = async () => {
    setActionLoading(true)
    try {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (!userStr || !token) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)

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
        // Open KYC in same window - will redirect back
        window.location.href = data.kycUrl
      } else if (data.companyId) {
        setCompanyId(data.companyId)
        setNeedsSetup(false)
        setNeedsKyc(true)
      }
    } catch (err) {
      console.error('[Wallet] Setup error:', err)
    }
    setActionLoading(false)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header title="Payouts" />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Need to create Whop account
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header title="Payouts" />

        <div className="px-4 pt-6">
          {/* Balance Card - Shows 0 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <p className="text-gray-500 text-sm mb-1">Balance disponible</p>
            <p className="text-3xl font-bold text-gray-900">$0.00 <span className="text-lg font-normal text-gray-400">USD</span></p>
          </div>

          {/* Setup Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Configura tu wallet</h2>
              <p className="text-gray-500 text-sm mb-6">Verifica tu identidad para poder recibir pagos de las marcas</p>

              <button
                onClick={startSetup}
                disabled={actionLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
              >
                {actionLoading ? 'Cargando...' : 'Verificar identidad'}
              </button>
            </div>
          </div>
        </div>

        <BottomNav active="wallet" />
      </div>
    )
  }

  // Need KYC verification OR Verified - Show embedded Whop dashboard
  if ((needsKyc || !needsSetup) && showEmbedded && userId && companyId) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] pb-20">
        <Header title="Verificación" />

        <div className="px-4 pt-6">
          {needsKyc && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800">Completa tu verificación</h3>
                  <p className="text-yellow-700 text-sm">Agrega tu información de pago para poder recibir dinero</p>
                </div>
              </div>
            </div>
          )}

          {/* Whop Embedded Components */}
          <WhopPayoutsEmbed userId={userId} companyId={companyId} />
        </div>

        <BottomNav active="wallet" />
      </div>
    )
  }

  // Fallback - shouldn't reach here normally
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header title="Payouts" />
      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
      <BottomNav active="wallet" />
    </div>
  )
}

function Header({ title }: { title: string }) {
  return (
    <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <Link href="/creator/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
      <div className="w-10" />
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
            className={`flex flex-col items-center py-2 px-4 ${
              active === item.id ? 'text-blue-600' : 'text-gray-400'
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
