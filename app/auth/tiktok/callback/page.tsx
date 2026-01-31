'use client'

import { useEffect, useState } from 'react'

// Hardcoded credentials
const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

export default function TikTokCallbackPage() {
  const [status, setStatus] = useState('Conectando con TikTok...')
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      // Get the authorization code from URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const errorParam = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      if (errorParam) {
        setError(true)
        setStatus(errorDescription || 'Conexion cancelada')
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

      setProgress(20)
      setStatus('Verificando autorizacion...')

      // Get user token and info
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)

      setProgress(40)
      setStatus('Obteniendo datos de TikTok...')

      // Call our API route to exchange code for token and get user data
      const redirectUri = `${window.location.origin}/auth/tiktok/callback`
      const response = await fetch('/api/tiktok/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      })

      setProgress(60)

      let accountData: any

      console.log('API Response status:', response.status, response.statusText)
      const responseText = await response.text()
      console.log('API Response raw text:', responseText)

      if (response.ok) {
        let result
        try {
          result = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse response:', e)
          throw new Error('Respuesta inválida del servidor')
        }
        console.log('Full API response:', JSON.stringify(result, null, 2))

        if (!result.success) {
          console.error('API returned error:', result.error, result.details)
          throw new Error(result.error || 'Error del servidor')
        }

        const data = result.data
        console.log('TikTok data:', JSON.stringify(data, null, 2))

        // If we have a valid openId, use the real data from TikTok
        // Stats might be 0 if user.info.stats scope is not approved
        if (data && data.openId) {
          accountData = {
            id: `tiktok_${data.openId}`,
            openId: data.openId,
            username: data.username || data.displayName || 'Usuario TikTok',
            displayName: data.displayName || data.username || 'Usuario TikTok',
            avatarUrl: data.avatarUrl,
            bio: data.bio || '',
            isVerified: data.isVerified || false,
            followers: data.followers || 0,
            following: data.following || 0,
            likes: data.likes || 0,
            videoCount: data.videoCount || 0,
            avgViews: data.avgViews || 0,
            avgLikes: data.avgLikes || 0,
            avgComments: data.avgComments || 0,
            avgShares: data.avgShares || 0,
            engagementRate: data.engagementRate || 0,
            recentVideos: data.recentVideos || [],
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            connectedAt: data.connectedAt || new Date().toISOString(),
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            // Track scope limitations
            hasStatsScope: data.hasStatsScope || false,
            grantedScopes: data.grantedScopes || [],
            isLimited: !data.hasStatsScope || (data.followers === 0 && data.likes === 0 && data.videoCount === 0),
          }

          // Set appropriate status message
          if (!data.hasStatsScope) {
            setStatus('Conexión exitosa (scope user.info.stats pendiente)')
            console.warn('Missing user.info.stats scope - stats will be 0. Need to enable this scope in TikTok Developer Portal.')
          } else if (data.followers > 0 || data.likes > 0) {
            setStatus('Datos obtenidos correctamente!')
          } else {
            setStatus('Conexión exitosa (sandbox mode)')
          }
        } else {
          // API returned but no valid data
          console.error('No openId in response. Full data:', data)
          throw new Error('TikTok no devolvió datos válidos (sin openId)')
        }
      } else {
        // API call failed completely - show error, don't use demo
        console.error('TikTok API error:', response.status, responseText)
        // Try to parse error details
        try {
          const errorData = JSON.parse(responseText)
          throw new Error(errorData.error || errorData.details || `Error de TikTok: ${response.status}`)
        } catch (e) {
          throw new Error(`Error de TikTok: ${response.status}`)
        }
      }

      setProgress(80)
      setStatus('Guardando conexion...')

      // Get current profile
      const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (!profileResponse.ok) {
        console.error('Profile fetch failed:', profileResponse.status)
        throw new Error('No se pudo obtener el perfil')
      }

      const profiles = await profileResponse.json()

      if (profiles.length === 0) {
        console.error('No profile found for user')
        throw new Error('No se encontró el perfil del usuario')
      }

      const profile = profiles[0]
      let bioData: any = {}

      try {
        bioData = profile.bio ? JSON.parse(profile.bio) : {}
      } catch (e) {
        bioData = {}
      }

      // Add TikTok connection
      const tiktokAccounts = bioData.tiktokAccounts || []

      // Check if account already exists (by openId or username)
      const existingIndex = tiktokAccounts.findIndex((a: any) =>
        a.openId === accountData.openId || a.username === accountData.username
      )

      if (existingIndex >= 0) {
        // Update existing account
        tiktokAccounts[existingIndex] = accountData
      } else {
        // Add new account
        tiktokAccounts.push(accountData)
      }

      bioData.tiktokAccounts = tiktokAccounts
      bioData.tiktokConnected = true

      // Save to profile
      const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          bio: JSON.stringify(bioData),
          updated_at: new Date().toISOString()
        })
      })

      if (!saveResponse.ok) {
        console.error('Profile save failed:', saveResponse.status)
        throw new Error('No se pudo guardar la conexión')
      }

      setProgress(100)
      setStatus('¡Cuenta conectada exitosamente!')

      setTimeout(() => {
        window.location.href = '/creator/analytics'
      }, 1500)

    } catch (err: any) {
      console.error('TikTok callback error:', err)
      setError(true)
      setStatus(err.message || 'Error al conectar con TikTok')
      setTimeout(() => {
        window.location.href = '/creator/analytics'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-sm w-full mx-4 text-center">
        {/* TikTok Logo */}
        <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
        </div>

        <h2 className={`text-lg font-bold mb-4 ${error ? 'text-red-600' : 'text-gray-800'}`}>
          {status}
        </h2>

        {!error && (
          <>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-black h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Spinner */}
            <div className="flex justify-center">
              <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          </>
        )}

        {error && (
          <p className="text-gray-500 text-sm">Redirigiendo...</p>
        )}
      </div>
    </div>
  )
}
