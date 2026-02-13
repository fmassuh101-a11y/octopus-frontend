'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

export default function CreatorWallet() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kycUrl, setKycUrl] = useState<string | null>(null)
  const [settingUp, setSettingUp] = useState(false)

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
        setError('Error al cargar perfil')
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
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const startSetup = async () => {
    setSettingUp(true)
    setError(null)

    try {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (!userStr || !token) throw new Error('No autenticado')

      const user = JSON.parse(userStr)

      // Get profile data
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
        setKycUrl(data.kycUrl)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setSettingUp(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  // KYC Flow - Similar to Sideshift
  if (kycUrl) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Verificación" />
        <div className="px-5 py-8 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Confirma tu identidad</h1>
            <p className="text-gray-500 mb-8">
              Te pediremos tu ID y un selfie. Es una forma rápida, segura y en la que confían millones de usuarios.
            </p>
            <button
              onClick={() => window.open(kycUrl, '_blank')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-colors"
            >
              ¡Vamos!
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Powered by Veriff
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 text-gray-500 hover:text-gray-700 text-sm"
            >
              Ya completé la verificación →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Needs Setup - Clean Sideshift style
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Payouts" />
        <div className="px-5 py-8 max-w-md mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Create payments account</h2>
            <p className="text-gray-500 text-sm mb-6">Set up your account to receive payouts</p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">1</div>
                <div>
                  <p className="font-medium text-gray-900">Personal information</p>
                  <p className="text-sm text-gray-500">Name, email, phone</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">2</div>
                <div>
                  <p className="font-medium text-gray-900">Identity verification</p>
                  <p className="text-sm text-gray-500">ID + selfie via Veriff</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">3</div>
                <div>
                  <p className="font-medium text-gray-900">Payout method</p>
                  <p className="text-sm text-gray-500">Bank, PayPal, or crypto</p>
                </div>
              </div>
            </div>

            <button
              onClick={startSetup}
              disabled={settingUp}
              className="w-full py-3.5 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
            >
              {settingUp ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Get started'
              )}
            </button>
          </div>
        </div>
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Error state
  if (error || !companyId) {
    return (
      <div className="min-h-screen bg-white">
        <Header title="Payouts" />
        <div className="px-5 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Error al cargar'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 rounded-full text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Main Wallet Dashboard - Sideshift Style
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Payouts" />

      <div className="px-5 py-6">
        {/* Balance Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm text-gray-500 mb-1">Available Balance</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">$0.00</h1>
          <button
            onClick={() => {/* TODO: Open withdraw flow */}}
            className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-colors"
          >
            Withdraw
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-xl font-semibold text-gray-900">$0.00</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Earned</p>
            <p className="text-xl font-semibold text-gray-900">$0.00</p>
          </div>
        </div>

        {/* Your Payout Dashboard */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Your Payout Dashboard</h2>
          </div>

          {/* Payout Methods */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Payout Methods</p>
                <p className="text-sm text-gray-500">Add how you want to receive money</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Add +
              </button>
            </div>
          </div>

          {/* Contract History */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-gray-900">Contract History</p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all
              </button>
            </div>
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No contracts yet</p>
            </div>
          </div>
        </div>

        {/* Recent Withdrawals */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Withdrawals</h2>
          </div>
          <div className="p-5">
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No withdrawals yet</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="wallet" />
    </div>
  )
}

function Header({ title }: { title: string }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/creator/dashboard" className="w-10 h-10 flex items-center justify-center -ml-2">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-semibold text-gray-900">{title}</h1>
        <div className="w-10" />
      </div>
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { id: 'jobs', href: '/gigs', label: 'Jobs', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'dashboard', href: '/creator/dashboard', label: 'Dashboard', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    )},
    { id: 'wallet', href: '/creator/wallet', label: 'Wallet', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'messages', href: '/creator/messages', label: 'Messages', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )},
    { id: 'profile', href: '/creator/profile', label: 'Profile', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
            className={`flex flex-col items-center py-2 px-3 ${
              active === item.id ? 'text-black' : 'text-gray-400'
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
