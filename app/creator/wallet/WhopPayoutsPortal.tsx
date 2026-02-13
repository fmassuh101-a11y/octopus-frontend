'use client'

import { useEffect, useState, useRef } from 'react'

interface WhopPayoutsPortalProps {
  companyId: string
  fetchToken: () => Promise<string>
  redirectUrl: string
  showWallet?: boolean
  showPayoutMethodsOnly?: boolean
  onComplete?: () => void
}

export default function WhopPayoutsPortal({
  companyId,
  fetchToken,
  redirectUrl,
  showWallet,
  showPayoutMethodsOnly,
  onComplete
}: WhopPayoutsPortalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<any>(null)

  useEffect(() => {
    initWhopElements()
    return () => {
      // Cleanup
      if (sessionRef.current) {
        sessionRef.current.destroy?.()
      }
    }
  }, [])

  const initWhopElements = async () => {
    try {
      // Dynamically import Whop components
      const { loadWhopElements } = await import('@whop/embedded-components-vanilla-js')

      // Load WhopElements (no token here, just appearance options)
      const whopElements = await loadWhopElements({
        appearance: {
          theme: { appearance: 'light' }
        }
      })

      if (!whopElements) {
        setError('No se pudo cargar Whop Elements')
        setLoading(false)
        return
      }

      // Create PayoutsSession with token
      const session = whopElements.createPayoutsSession({
        token: fetchToken,
        companyId,
        redirectUrl
      })

      sessionRef.current = session

      // Wait for session to be ready
      session.on('ready', () => {
        mountElements(session)
      })

      session.on('error', (err: any) => {
        console.error('Whop session error:', err)
        setError('Error en la sesión de pagos')
        setLoading(false)
      })

    } catch (err) {
      console.error('Error initializing Whop elements:', err)
      setError('Error al cargar componentes de pago')
      setLoading(false)
    }
  }

  const mountElements = (session: any) => {
    const container = document.getElementById('whop-container')
    if (!container) {
      setLoading(false)
      return
    }

    try {
      if (showPayoutMethodsOnly) {
        // Only show add payout method form
        container.innerHTML = '<div id="whop-add-payout"></div>'
        const addPayoutEl = session.createElement('add-payout-method-element', {
          onSuccess: () => {
            onComplete?.()
          }
        })
        addPayoutEl.mount('#whop-add-payout')

      } else if (showWallet) {
        // Show full wallet: balance, withdraw button, history
        container.innerHTML = `
          <div id="whop-balance" class="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"></div>
          <div id="whop-withdraw" class="bg-white rounded-2xl shadow-sm p-4 mb-4"></div>
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-100">
              <h3 class="font-semibold text-gray-900">Historial de retiros</h3>
            </div>
            <div id="whop-withdrawals"></div>
          </div>
        `

        const balanceEl = session.createElement('balance-element', {})
        const withdrawEl = session.createElement('withdraw-button-element', {})
        const withdrawalsEl = session.createElement('withdrawals-element', {})

        balanceEl.mount('#whop-balance')
        withdrawEl.mount('#whop-withdraw')
        withdrawalsEl.mount('#whop-withdrawals')

      } else {
        // KYC/Setup flow - show verify element and add payout method
        container.innerHTML = `
          <div id="whop-verify" class="mb-4"></div>
          <div id="whop-add-payout"></div>
        `

        const verifyEl = session.createElement('verify-element', {
          onVerified: () => {
            // After verification, check if complete
            checkCompletion()
          }
        })
        const addPayoutEl = session.createElement('add-payout-method-element', {
          onSuccess: () => {
            onComplete?.()
          }
        })

        verifyEl.mount('#whop-verify')
        addPayoutEl.mount('#whop-add-payout')
      }

      setLoading(false)
    } catch (err) {
      console.error('Error mounting elements:', err)
      setError('Error al mostrar formularios')
      setLoading(false)
    }
  }

  const checkCompletion = async () => {
    try {
      const userStr = localStorage.getItem('sb-user')
      if (!userStr) return

      const userId = JSON.parse(userStr).id
      const res = await fetch(`/api/whop/creator-balance?userId=${userId}`)
      const data = await res.json()

      if (data.kycComplete) {
        onComplete?.()
      }
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true)
            setError(null)
            initWhopElements()
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div id="whop-container" className="min-h-[200px]">
      {/* Whop elements will be mounted here */}
    </div>
  )
}
