'use client'

import { useEffect, useState } from 'react'

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
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    loadToken()
  }, [])

  const loadToken = async () => {
    try {
      const t = await fetchToken()
      if (t) {
        setToken(t)
        // Load Whop embedded components
        initWhopElements(t)
      } else {
        setError('No se pudo obtener el token')
      }
    } catch (err) {
      console.error('Error loading token:', err)
      setError('Error al cargar')
    }
    setLoading(false)
  }

  const initWhopElements = async (accessToken: string) => {
    try {
      // Dynamically import Whop components
      const { loadWhopElements } = await import('@whop/embedded-components-vanilla-js')

      const elements = await loadWhopElements(accessToken)

      // Mount the appropriate elements based on props
      const container = document.getElementById('whop-container')
      if (!container) return

      if (showPayoutMethodsOnly) {
        // Only show payout method form
        const payoutMethodEl = elements.create('payoutMethod', {
          companyId,
          redirectUrl
        })
        container.innerHTML = ''
        payoutMethodEl.mount(container)
      } else if (showWallet) {
        // Show full wallet: balance, withdraw button, history
        container.innerHTML = `
          <div id="whop-balance" class="p-5"></div>
          <div id="whop-withdraw" class="px-5 pb-4"></div>
          <div class="border-t border-gray-100 mt-2">
            <div class="px-5 py-3">
              <h3 class="font-semibold text-gray-900">Historial de retiros</h3>
            </div>
            <div id="whop-withdrawals"></div>
          </div>
        `

        const balanceEl = elements.create('balance', { companyId })
        const withdrawEl = elements.create('withdrawButton', {
          companyId,
          redirectUrl
        })
        const withdrawalsEl = elements.create('withdrawals', { companyId })

        balanceEl.mount('#whop-balance')
        withdrawEl.mount('#whop-withdraw')
        withdrawalsEl.mount('#whop-withdrawals')
      } else {
        // KYC/Setup flow - show payout method form for onboarding
        const payoutMethodEl = elements.create('payoutMethod', {
          companyId,
          redirectUrl,
          onSuccess: () => {
            onComplete?.()
          }
        })
        container.innerHTML = ''
        payoutMethodEl.mount(container)
      }
    } catch (err) {
      console.error('Error initializing Whop elements:', err)
      // Fallback to simpler implementation
      setError('Error al cargar componentes de pago')
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
          onClick={loadToken}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div id="whop-container" className="min-h-[200px]">
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
