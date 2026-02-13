'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  AddPayoutMethodElement,
  WithdrawButtonElement,
  WithdrawalsElement,
} from '@whop/embedded-components-react-js'
import { loadWhopElements } from '@whop/embedded-components-vanilla-js'

interface WhopPayoutsEmbedProps {
  userId: string
  companyId: string
}

// Initialize elements outside component
let elementsInstance: ReturnType<typeof loadWhopElements> | null = null

function getElements() {
  if (!elementsInstance) {
    elementsInstance = loadWhopElements()
  }
  return elementsInstance
}

export default function WhopPayoutsEmbed({ userId, companyId }: WhopPayoutsEmbedProps) {
  const [error, setError] = useState<string | null>(null)
  const [elements, setElements] = useState<ReturnType<typeof loadWhopElements> | null>(null)

  useEffect(() => {
    try {
      const el = getElements()
      setElements(el)
    } catch (err) {
      console.error('[WhopEmbed] Failed to load elements:', err)
      setError('Error cargando componentes')
    }
  }, [])

  const fetchToken = useCallback(async () => {
    try {
      console.log('[WhopEmbed] Fetching token for userId:', userId)
      const res = await fetch('/api/whop/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await res.json()
      console.log('[WhopEmbed] Token response:', data)

      if (data.error) {
        throw new Error(data.error)
      }

      return data.token
    } catch (err) {
      console.error('[WhopEmbed] Token error:', err)
      throw err
    }
  }, [userId])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (!elements) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/creator/wallet`
    : 'https://octopus-frontend-tau.vercel.app/creator/wallet'

  return (
    <Elements elements={elements}>
      <PayoutsSession
        token={fetchToken}
        companyId={companyId}
        redirectUrl={redirectUrl}
      >
        <div className="space-y-4">
          {/* Balance */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-gray-500 text-sm mb-2">Balance disponible</p>
            <BalanceElement
              fallback={
                <div className="animate-pulse">
                  <div className="h-8 w-32 bg-gray-200 rounded" />
                </div>
              }
            />
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Métodos de pago</h3>
            <AddPayoutMethodElement
              fallback={
                <div className="animate-pulse space-y-3">
                  <div className="h-12 bg-gray-200 rounded-xl" />
                  <div className="h-12 bg-gray-200 rounded-xl" />
                </div>
              }
            />
          </div>

          {/* Withdraw Button */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <WithdrawButtonElement
              fallback={
                <div className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded-xl" />
                </div>
              }
            />
            <p className="text-center text-gray-400 text-sm mt-3">
              Mínimo para retirar: $10.20 USD
            </p>
          </div>

          {/* Withdrawal History */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Historial de retiros</h3>
            <WithdrawalsElement
              fallback={
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              }
            />
          </div>
        </div>
      </PayoutsSession>
    </Elements>
  )
}
