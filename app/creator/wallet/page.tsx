'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MINIMUM_PAYOUT = 10.20
const APP_URL = 'https://octopus-frontend-tau.vercel.app'

// Dynamically import Whop components to avoid SSR issues
const WhopPayoutsPortal = dynamic(() => import('./WhopPayoutsPortal'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
})

export default function CreatorWallet() {
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [needsKyc, setNeedsKyc] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showPayoutMethods, setShowPayoutMethods] = useState(false)

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

      // Check balance/KYC status
      const res = await fetch(`/api/whop/creator-balance?userId=${user.id}`)
      const data = await res.json()

      if (data.needsSetup) {
        setNeedsSetup(true)
      } else if (!data.kycComplete) {
        setNeedsKyc(true)
        setCompanyId(data.companyId)
      } else {
        setCompanyId(data.companyId)
      }

    } catch (err) {
      console.error('[Wallet] Error:', err)
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

      // Get profile
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

      // Create Whop company
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

      if (data.companyId) {
        setCompanyId(data.companyId)
        setNeedsSetup(false)
        setNeedsKyc(true)
      }
    } catch (err) {
      console.error('[Wallet] Setup error:', err)
    }
    setLoading(false)
  }

  // Fetch token for Whop components
  const fetchToken = useCallback(async () => {
    if (!userId) return ''

    const res = await fetch('/api/whop/access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    return data.token || ''
  }, [userId])

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

  // Need to create Whop account first
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header />

        <div className="mx-4 mt-6 bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configura tu Wallet</h2>
            <p className="text-gray-500 mb-6">Para recibir pagos necesitas verificar tu identidad y agregar un método de pago</p>

            <button
              onClick={startSetup}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-md"
            >
              Comenzar
            </button>
          </div>
        </div>

        <BottomNav active="wallet" />
      </div>
    )
  }

  // Need KYC verification - Show embedded Whop components
  if (needsKyc && companyId) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header title="Verificación" />

        <div className="mx-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Completa tu verificación</h2>
            <p className="text-gray-500 text-sm">Agrega tu información de pago para poder recibir dinero</p>
          </div>

          {/* Whop Embedded Payout Portal */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <WhopPayoutsPortal
              companyId={companyId}
              fetchToken={fetchToken}
              redirectUrl={`${APP_URL}/creator/wallet`}
              onComplete={() => {
                setNeedsKyc(false)
                checkStatus()
              }}
            />
          </div>
        </div>

        <BottomNav active="wallet" />
      </div>
    )
  }

  // Main Wallet - Verified user
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header
        showMenu
        onPayoutMethods={() => setShowPayoutMethods(true)}
        onRefresh={checkStatus}
      />

      {/* Payout Methods Modal */}
      {showPayoutMethods && companyId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Métodos de pago</h3>
              <button
                onClick={() => setShowPayoutMethods(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              <WhopPayoutsPortal
                companyId={companyId}
                fetchToken={fetchToken}
                redirectUrl={`${APP_URL}/creator/wallet`}
                showPayoutMethodsOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* Whop Embedded Balance & Payouts */}
      <div className="mx-4 mt-4">
        {companyId && (
          <WhopPayoutsPortal
            companyId={companyId}
            fetchToken={fetchToken}
            redirectUrl={`${APP_URL}/creator/wallet`}
            showWallet
          />
        )}
      </div>

      {/* Fixed Bottom - Withdraw info */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
        <p className="text-center text-gray-400 text-sm">
          Mínimo para retirar: {MINIMUM_PAYOUT.toFixed(2)} US$
        </p>
      </div>

      <div className="h-32" />
      <BottomNav active="wallet" />
    </div>
  )
}

function Header({
  title = "Payouts",
  showMenu,
  onPayoutMethods,
  onRefresh
}: {
  title?: string
  showMenu?: boolean
  onPayoutMethods?: () => void
  onRefresh?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <Link href="/creator/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
        {showMenu ? (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
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

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-4 top-14 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-30 min-w-[180px]">
            {onPayoutMethods && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onPayoutMethods()
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Métodos de pago
              </button>
            )}
            {onRefresh && (
              <button
                onClick={() => {
                  setMenuOpen(false)
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
