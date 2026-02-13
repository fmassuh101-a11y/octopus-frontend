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

  useEffect(() => {
    initWhopElements()
  }, [])

  const initWhopElements = async () => {
    try {
      const accessToken = await fetchToken()
      if (!accessToken) {
        setError('No se pudo obtener el token')
        setLoading(false)
        return
      }

      // Dynamically import Whop components
      const whopModule = await import('@whop/embedded-components-vanilla-js')
      const loadWhopElements = whopModule.loadWhopElements

      // Load elements with proper options object
      const elements = await loadWhopElements({
        token: accessToken
      })

      // Mount the appropriate elements based on props
      const container = document.getElementById('whop-container')
      if (!container) {
        setLoading(false)
        return
      }

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
          redirectUrl
        })
        container.innerHTML = ''
        payoutMethodEl.mount(container)

        // Check for completion periodically
        if (onComplete) {
          const checkInterval = setInterval(async () => {
            try {
              // Check if user has added payout methods
              const res = await fetch(`/api/whop/creator-balance?userId=${localStorage.getItem('sb-user') ? JSON.parse(localStorage.getItem('sb-user')!).id : ''}`)
              const data = await res.json()
              if (data.kycComplete) {
                clearInterval(checkInterval)
                onComplete()
              }
            } catch {
              // Ignore errors
            }
          }, 5000)

          // Cleanup on unmount
          return () => clearInterval(checkInterval)
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Error initializing Whop elements:', err)
      setError('Error al cargar componentes de pago')
      setLoading(false)
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
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
