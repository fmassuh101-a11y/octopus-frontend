'use client'

import { useEffect, useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function TikTokCallbackPage() {
  const [status, setStatus] = useState('Conectando con TikTok...')
  const [error, setError] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      // Get the authorization code from URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const errorParam = urlParams.get('error')

      if (errorParam) {
        setError(true)
        setStatus('Conexion cancelada')
        setTimeout(() => {
          window.location.href = '/creator/analytics'
        }, 2000)
        return
      }

      if (!code) {
        setError(true)
        setStatus('No se recibio codigo de autorizacion')
        setTimeout(() => {
          window.location.href = '/creator/analytics'
        }, 2000)
        return
      }

      setStatus('Obteniendo datos de TikTok...')

      // Get user token and info
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)

      // In a real implementation, we would:
      // 1. Exchange code for access token with TikTok API
      // 2. Fetch user profile from TikTok
      // 3. Store the connection in our database

      // For now, simulate the connection and store in profile
      const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (profileResponse.ok) {
        const profiles = await profileResponse.json()
        if (profiles.length > 0) {
          const profile = profiles[0]
          let bioData: any = {}

          try {
            bioData = profile.bio ? JSON.parse(profile.bio) : {}
          } catch (e) {
            bioData = {}
          }

          // Add TikTok connection (simulated for now)
          const tiktokAccounts = bioData.tiktokAccounts || []

          // Simulated TikTok account data - will be replaced with real API data
          const newAccount = {
            id: `tiktok_${Date.now()}`,
            username: urlParams.get('username') || 'usuario_tiktok',
            displayName: urlParams.get('display_name') || 'Usuario TikTok',
            followers: Math.floor(Math.random() * 100000) + 1000,
            following: Math.floor(Math.random() * 1000) + 100,
            likes: Math.floor(Math.random() * 1000000) + 10000,
            videoCount: Math.floor(Math.random() * 500) + 10,
            connectedAt: new Date().toISOString(),
            accessToken: code // In real implementation, this would be the actual access token
          }

          tiktokAccounts.push(newAccount)
          bioData.tiktokAccounts = tiktokAccounts
          bioData.tiktokConnected = true

          // Save to profile
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY || '',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              bio: JSON.stringify(bioData),
              updated_at: new Date().toISOString()
            })
          })

          setStatus('¡Cuenta conectada exitosamente!')
          setTimeout(() => {
            window.location.href = '/creator/analytics'
          }, 1500)
        }
      }

    } catch (err) {
      console.error('TikTok callback error:', err)
      setError(true)
      setStatus('Error al conectar con TikTok')
      setTimeout(() => {
        window.location.href = '/creator/analytics'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
        </div>

        <h2 className={`text-lg font-bold mb-4 ${error ? 'text-red-600' : 'text-gray-800'}`}>
          {status}
        </h2>

        {!error && (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <p className="text-gray-500 text-sm">Redirigiendo...</p>
        )}
      </div>
    </div>
  )
}
