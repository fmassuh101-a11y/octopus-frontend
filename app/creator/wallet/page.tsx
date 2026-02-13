'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawButtonElement,
  WithdrawalsElement,
  AddPayoutMethodElement,
  StatusBannerElement,
} from "@whop/embedded-components-react-js"
import { loadWhopElements } from "@whop/embedded-components-vanilla-js"

// IMPORTANTE: Llamar FUERA del componente
const elements = loadWhopElements({
  appearance: {
    theme: {
      appearance: 'dark',
      accentColor: 'green',
    },
  },
})

export default function CreatorWallet() {
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'balance' | 'withdraw' | 'history'>('balance')

  useEffect(() => {
    checkUserSetup()
  }, [])

  const checkUserSetup = async () => {
    try {
      // Get auth from localStorage (same pattern as dashboard)
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      console.log('[CreatorWallet] Auth check:', { hasToken: !!token, hasUser: !!userStr })

      if (!token || !userStr) {
        setError('No has iniciado sesión. Por favor inicia sesión primero.')
        setLoading(false)
        return
      }

      const user = JSON.parse(userStr)
      console.log('[CreatorWallet] User ID:', user.id)

      // Query users table directly like dashboard does
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}&select=id,email,whop_company_id,role`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      console.log('[CreatorWallet] Supabase response:', res.status)

      if (!res.ok) {
        if (res.status === 401) {
          setError('Sesión expirada. Por favor inicia sesión de nuevo.')
        } else {
          setError(`Error del servidor (${res.status})`)
        }
        setLoading(false)
        return
      }

      const users = await res.json()
      console.log('[CreatorWallet] Users found:', users)

      if (users.length === 0) {
        setError('Usuario no encontrado en la base de datos')
        setLoading(false)
        return
      }

      const userData = users[0]
      console.log('[CreatorWallet] User data:', userData)

      if (!userData.whop_company_id) {
        console.log('[CreatorWallet] No whop_company_id, needs setup')
        setNeedsSetup(true)
      } else {
        console.log('[CreatorWallet] Has whop_company_id:', userData.whop_company_id)
        setCompanyId(userData.whop_company_id)
      }
    } catch (err: any) {
      console.error('[CreatorWallet] Error:', err)
      setError(`Error: ${err.message}`)
    }
    setLoading(false)
  }

  // Función para obtener token (se pasa a PayoutsSession)
  const getToken = async () => {
    if (!companyId) return null
    try {
      const res = await fetch(`/api/whop/token?companyId=${companyId}`)
      const data = await res.json()
      return data.token
    } catch (err) {
      console.error('[CreatorWallet] Error getting token:', err)
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Cargando wallet...</p>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="px-5 pt-5">
          <Header />
          <div className="mt-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">Configura tu cuenta de pagos</h2>
            <p className="text-white/50 mb-8 max-w-sm mx-auto">
              Para recibir pagos necesitas verificar tu identidad y agregar un método de retiro.
            </p>
            <Link
              href="/creator/wallet/setup"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
            >
              Configurar ahora
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error || !companyId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="px-5 pt-5">
          <Header />
          <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-4">{error || 'Error al cargar wallet'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-2 rounded-lg"
              >
                Reintentar
              </button>
              <Link
                href="/auth/login"
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/creator/wallet`
    : 'https://octopus-frontend-tau.vercel.app/creator/wallet'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 px-5 pt-5">
        <Header />

        <Elements elements={elements}>
          <PayoutsSession
            token={getToken}
            companyId={companyId}
            redirectUrl={redirectUrl}
          >
            {/* Status Banner */}
            <div className="mb-6">
              <StatusBannerElement fallback={<div className="h-12 bg-white/5 rounded-lg animate-pulse" />} />
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-6 mb-6 border border-emerald-500/20">
              <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Tu Balance</p>
              <BalanceElement fallback={
                <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
              } />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
              {[
                { id: 'balance', label: 'Resumen' },
                { id: 'withdraw', label: 'Retirar' },
                { id: 'history', label: 'Historial' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'balance' && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Retirar Fondos</h3>
                  <WithdrawButtonElement fallback={
                    <div className="h-12 bg-emerald-500/20 rounded-lg animate-pulse" />
                  } />
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Métodos de Retiro</h3>
                  <AddPayoutMethodElement fallback={
                    <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
                  } />
                </div>

                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h4 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">Información</h4>
                  <ul className="space-y-3 text-sm text-white/50">
                    <li className="flex items-center gap-3">
                      <CheckIcon />
                      Fee de retiro: 2.7% + $0.30 (Whop)
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckIcon />
                      Métodos: Banco, PayPal, Crypto
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckIcon />
                      Procesamiento: 1-3 días hábiles
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Nuevo Retiro</h3>
                  <WithdrawButtonElement fallback={
                    <div className="h-12 bg-emerald-500/20 rounded-lg animate-pulse" />
                  } />
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Agregar Método de Pago</h3>
                  <AddPayoutMethodElement fallback={
                    <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
                  } />
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Historial de Retiros</h3>
                <WithdrawalsElement fallback={
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                  </div>
                } />
              </div>
            )}
          </PayoutsSession>
        </Elements>
      </div>

      <BottomNav />
    </div>
  )
}

function CheckIcon() {
  return (
    <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center justify-between mb-8">
      <Link href="/creator/dashboard" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
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
  )
}

function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex justify-around py-3">
        {[
          { href: '/gigs', label: 'Trabajos', icon: '💼', active: false },
          { href: '/creator/dashboard', label: 'Panel', icon: '📊', active: false },
          { href: '/creator/wallet', label: 'Wallet', icon: '💰', active: true },
          { href: '/creator/messages', label: 'Mensajes', icon: '💬', active: false },
          { href: '/creator/profile', label: 'Perfil', icon: '👤', active: false },
        ].map((item) => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 ${item.active ? 'text-emerald-400' : 'text-white/30'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
