'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

export default function CreatorWallet() {
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // KYC Flow
  if (kycUrl) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header title="Verificación" />
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-lg mx-auto">
          <div className="text-center">
            {/* Icon */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Confirma tu identidad</h1>
            <p className="text-white/60 mb-8 text-sm sm:text-base">
              Te pediremos tu ID y un selfie. Es una forma rápida, segura y en la que confían millones de usuarios.
            </p>

            <button
              onClick={() => window.open(kycUrl, '_blank')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25"
            >
              ¡Comenzar verificación!
            </button>

            <p className="text-xs text-white/40 mt-4">
              Powered by Veriff
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 text-amber-500 hover:text-amber-400 text-sm font-medium"
            >
              Ya completé la verificación →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Needs Setup
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header title="Wallet" />

        {/* Background gradient */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-lg mx-auto">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Setup Card */}
            <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                  <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Configura tu cuenta de pagos</h2>
                <p className="text-white/50 text-sm">Para recibir pagos necesitas verificar tu identidad</p>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  { num: 1, title: 'Información personal', desc: 'Nombre, email, teléfono' },
                  { num: 2, title: 'Verificación de identidad', desc: 'ID + selfie via Veriff' },
                  { num: 3, title: 'Método de pago', desc: 'Banco, PayPal o crypto' },
                ].map((step) => (
                  <div key={step.num} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-sm font-bold text-black shrink-0">
                      {step.num}
                    </div>
                    <div>
                      <p className="font-medium text-white">{step.title}</p>
                      <p className="text-sm text-white/50">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={startSetup}
                disabled={settingUp}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {settingUp ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Comenzar
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/60 text-sm">
                    Este proceso toma aproximadamente 5 minutos. Necesitarás tu documento de identidad (INE, pasaporte, etc.)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <BottomNav active="wallet" />
      </div>
    )
  }

  // Error state
  if (error || !companyId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header title="Wallet" />
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-lg mx-auto">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error || 'Error al cargar'}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
        <BottomNav active="wallet" />
      </div>
    )
  }

  // Main Wallet Dashboard
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <Header title="Wallet" />

      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-amber-500/20 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-white/60 text-sm mb-1">Balance disponible</p>
                <h1 className="text-4xl sm:text-5xl font-bold text-white">$0<span className="text-white/40">.00</span></h1>
              </div>
              <button className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25">
                Retirar
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <p className="text-xs text-white/50 uppercase tracking-wider">Pendiente</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">$0<span className="text-white/40">.00</span></p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <p className="text-xs text-white/50 uppercase tracking-wider">Total ganado</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">$0<span className="text-white/40">.00</span></p>
            </div>
          </div>

          {/* Payout Dashboard */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden mb-6">
            <div className="p-5 sm:p-6 border-b border-white/5">
              <h2 className="font-semibold text-white text-lg">Tu Panel de Pagos</h2>
            </div>

            {/* Payout Methods */}
            <div className="p-5 sm:p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Métodos de retiro</p>
                    <p className="text-sm text-white/50">Agrega cómo quieres recibir tu dinero</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-sm font-medium rounded-lg transition-colors">
                  Agregar
                </button>
              </div>
            </div>

            {/* Contract History */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium text-white">Historial de contratos</p>
                <button className="text-amber-500 hover:text-amber-400 text-sm font-medium">
                  Ver todo
                </button>
              </div>
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">Aún no tienes contratos</p>
              </div>
            </div>
          </div>

          {/* Recent Withdrawals */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-white/5">
              <h2 className="font-semibold text-white text-lg">Retiros recientes</h2>
            </div>
            <div className="p-5 sm:p-6">
              <div className="text-center py-6">
                <p className="text-white/40 text-sm">Aún no has hecho retiros</p>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Fee de retiro', value: '2.7%' },
              { label: 'Mínimo', value: '$10' },
              { label: 'Procesamiento', value: '1-3 días' },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-white font-semibold">{item.value}</p>
                <p className="text-white/40 text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="wallet" />
    </div>
  )
}

function Header({ title }: { title: string }) {
  return (
    <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/creator/dashboard" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/5 transition-colors">
          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <h1 className="font-semibold text-white">{title}</h1>
        </div>
        <div className="w-10" />
      </div>
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { id: 'jobs', href: '/gigs', label: 'Trabajos', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'dashboard', href: '/creator/dashboard', label: 'Panel', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    )},
    { id: 'wallet', href: '/creator/wallet', label: 'Wallet', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'messages', href: '/creator/messages', label: 'Mensajes', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )},
    { id: 'profile', href: '/creator/profile', label: 'Perfil', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 z-20">
      <div className="max-w-2xl mx-auto flex justify-around py-2 sm:py-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
              active === item.id
                ? 'text-amber-500'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {item.icon}
            <span className="text-[10px] sm:text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
