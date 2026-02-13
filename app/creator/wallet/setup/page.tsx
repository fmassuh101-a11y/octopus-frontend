'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

export default function WalletSetup() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'start' | 'creating' | 'kyc' | 'done' | 'error'>('start')
  const [error, setError] = useState<string | null>(null)
  const [kycUrl, setKycUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Check auth on mount
  useEffect(() => {
    const t = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!t || !userStr) {
      setError('No has iniciado sesión')
      setStep('error')
    } else {
      setToken(t)
      const user = JSON.parse(userStr)
      setUserId(user.id)
    }
  }, [])

  const startSetup = async () => {
    if (!userId || !token) {
      setError('No has iniciado sesión')
      setStep('error')
      return
    }

    setLoading(true)
    setError(null)
    setStep('creating')

    try {
      console.log('[WalletSetup] Starting setup for user:', userId)

      // First check if user already has whop_company_id
      const userRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,email,full_name,whop_company_id`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!userRes.ok) {
        throw new Error('Error al obtener datos del usuario')
      }

      const users = await userRes.json()
      if (users.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      const userData = users[0]
      console.log('[WalletSetup] User data:', userData)

      // Call API to create Whop company and get KYC link
      const res = await fetch('/api/whop/setup-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          email: userData.email,
          fullName: userData.full_name,
          existingCompanyId: userData.whop_company_id
        })
      })

      const data = await res.json()
      console.log('[WalletSetup] API Response:', res.status, data)

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear cuenta')
      }

      if (data.kycUrl) {
        setKycUrl(data.kycUrl)
        setStep('kyc')
      } else if (data.alreadySetup) {
        setStep('done')
      } else {
        throw new Error('Respuesta inesperada del servidor')
      }
    } catch (err: any) {
      console.error('[WalletSetup] Error:', err)
      setError(err.message)
      setStep('error')
    }
    setLoading(false)
  }

  const openKYC = () => {
    if (kycUrl) {
      window.open(kycUrl, '_blank')
    }
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="px-5 pt-5">
          <Header />
          <div className="max-w-md mx-auto mt-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400 mb-4">{error || 'Error desconocido'}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setError(null)
                    setStep('start')
                  }}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-2 rounded-lg"
                >
                  Reintentar
                </button>
                <Link
                  href="/creator/wallet"
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg"
                >
                  Volver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="px-5 pt-5">
        <Header />

        <div className="max-w-md mx-auto">
          {step === 'start' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold mb-3">Configura tu cuenta de pagos</h1>
              <p className="text-white/50 mb-8">
                Para recibir pagos de las empresas necesitas verificar tu identidad y agregar un método de retiro.
              </p>

              <div className="bg-white/5 rounded-xl p-5 mb-8 text-left">
                <h3 className="font-semibold mb-4">Lo que necesitarás:</h3>
                <ul className="space-y-3 text-sm text-white/60">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-500/20 rounded flex items-center justify-center text-emerald-400 mt-0.5">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <span>Documento de identidad (INE, pasaporte, etc.)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-500/20 rounded flex items-center justify-center text-emerald-400 mt-0.5">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <span>Información bancaria o cuenta de PayPal</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-500/20 rounded flex items-center justify-center text-emerald-400 mt-0.5">
                      <span className="text-xs font-bold">3</span>
                    </div>
                    <span>5 minutos de tu tiempo</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={startSetup}
                disabled={loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Comenzar configuración
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'creating' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-2">Creando tu cuenta...</h2>
              <p className="text-white/50">Esto solo toma unos segundos</p>
            </div>
          )}

          {step === 'kyc' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold mb-3">Verifica tu identidad</h1>
              <p className="text-white/50 mb-8">
                Haz clic en el botón para completar la verificación KYC. Se abrirá en una nueva ventana.
              </p>

              <button
                onClick={openKYC}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
              >
                Completar verificación
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>

              <Link
                href="/creator/wallet"
                className="block text-white/50 hover:text-white text-sm"
              >
                Ya completé la verificación →
              </Link>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold mb-3">¡Cuenta configurada!</h1>
              <p className="text-white/50 mb-8">
                Tu cuenta de pagos ya está lista. Ahora puedes recibir pagos de las empresas.
              </p>

              <Link
                href="/creator/wallet"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
              >
                Ir a mi wallet
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center justify-between mb-8">
      <Link href="/creator/wallet" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <span className="text-xs text-white/40 uppercase tracking-wider">Configurar Pagos</span>
      <div className="w-10" />
    </div>
  )
}
