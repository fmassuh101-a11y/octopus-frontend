'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// TikTok App credentials - will be set in .env
const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || ''

export default function CreatorAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [tiktokAccounts, setTiktokAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0) {
          const bio = profiles[0].bio ? JSON.parse(profiles[0].bio) : {}
          setProfile({ ...profiles[0], ...bio })
          setTiktokAccounts(bio.tiktokAccounts || [])
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectTikTok = () => {
    // TikTok OAuth URL
    // For now, simulate with a demo flow
    // In production, this would be the real TikTok OAuth URL

    if (TIKTOK_CLIENT_KEY) {
      const redirectUri = `${window.location.origin}/auth/tiktok/callback`
      const scope = 'user.info.basic,video.list'
      const tiktokAuthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=octopus`
      window.location.href = tiktokAuthUrl
    } else {
      // Demo mode - simulate adding an account
      const demoUsername = prompt('Ingresa tu username de TikTok (sin @):')
      if (demoUsername) {
        // Redirect to callback with demo data
        window.location.href = `/auth/tiktok/callback?code=demo_${Date.now()}&username=${demoUsername}&display_name=${demoUsername}`
      }
    }
  }

  const handleRemoveAccount = async (accountId: string) => {
    if (!confirm('¿Seguro que quieres desconectar esta cuenta?')) return

    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) return

      const user = JSON.parse(userStr)
      const updatedAccounts = tiktokAccounts.filter(a => a.id !== accountId)

      const bioData = { ...profile }
      delete bioData.id
      delete bioData.user_id
      delete bioData.user_type
      delete bioData.full_name
      delete bioData.avatar_url
      delete bioData.created_at
      delete bioData.updated_at

      bioData.tiktokAccounts = updatedAccounts
      bioData.tiktokConnected = updatedAccounts.length > 0

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

      setTiktokAccounts(updatedAccounts)
    } catch (err) {
      console.error('Error removing account:', err)
    }
  }

  // Calculate combined stats
  const getCombinedStats = () => {
    if (selectedAccount === 'all') {
      return {
        followers: tiktokAccounts.reduce((sum, a) => sum + (a.followers || 0), 0),
        following: tiktokAccounts.reduce((sum, a) => sum + (a.following || 0), 0),
        likes: tiktokAccounts.reduce((sum, a) => sum + (a.likes || 0), 0),
        videoCount: tiktokAccounts.reduce((sum, a) => sum + (a.videoCount || 0), 0),
      }
    } else {
      const account = tiktokAccounts.find(a => a.id === selectedAccount)
      return account || { followers: 0, following: 0, likes: 0, videoCount: 0 }
    }
  }

  const stats = getCombinedStats()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/creator/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-500">Rendimiento de tu contenido</p>
              </div>
            </div>

            <button
              onClick={handleConnectTikTok}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
              {tiktokAccounts.length > 0 ? 'Agregar Cuenta' : 'Conectar TikTok'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Connected Accounts */}
        {tiktokAccounts.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Cuentas Conectadas</h3>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las cuentas ({tiktokAccounts.length})</option>
                {tiktokAccounts.map((account) => (
                  <option key={account.id} value={account.id}>@{account.username}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              {tiktokAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition ${
                    selectedAccount === account.id || selectedAccount === 'all'
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {account.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">@{account.username}</p>
                    <p className={`text-xs ${selectedAccount === account.id || selectedAccount === 'all' ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatNumber(account.followers)} seguidores
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveAccount(account.id)}
                    className={`ml-2 p-1 rounded-full hover:bg-white/20 ${
                      selectedAccount === account.id || selectedAccount === 'all' ? 'text-white/70' : 'text-gray-400'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No accounts connected */}
        {tiktokAccounts.length === 0 && (
          <div className="bg-gradient-to-r from-black to-gray-800 rounded-2xl p-8 mb-6 text-white text-center">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Conecta tu cuenta de TikTok</h3>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Conecta tus cuentas de TikTok para ver analytics reales de tu contenido. Puedes agregar multiples cuentas.
            </p>
            <button
              onClick={handleConnectTikTok}
              className="px-8 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition"
            >
              Conectar TikTok
            </button>
          </div>
        )}

        {/* Stats Overview */}
        {tiktokAccounts.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Seguidores</span>
                  {selectedAccount === 'all' && <span className="text-xs text-blue-600 font-medium">TOTAL</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.followers)}</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Siguiendo</span>
                  {selectedAccount === 'all' && <span className="text-xs text-blue-600 font-medium">TOTAL</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.following)}</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Likes Totales</span>
                  {selectedAccount === 'all' && <span className="text-xs text-blue-600 font-medium">TOTAL</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.likes)}</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Videos</span>
                  {selectedAccount === 'all' && <span className="text-xs text-blue-600 font-medium">TOTAL</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.videoCount)}</p>
              </div>
            </div>

            {/* Engagement & Growth */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Engagement Estimado</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tasa de Engagement</span>
                    <span className="font-bold text-blue-600">
                      {stats.followers > 0 ? ((stats.likes / stats.followers) * 100 / stats.videoCount).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min((stats.likes / stats.followers) * 10, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">Basado en likes/seguidores por video</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Resumen de Cuentas</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuentas conectadas</span>
                    <span className="font-bold">{tiktokAccounts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Promedio seguidores/cuenta</span>
                    <span className="font-bold">{formatNumber(Math.round(stats.followers / tiktokAccounts.length))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Promedio videos/cuenta</span>
                    <span className="font-bold">{Math.round(stats.videoCount / tiktokAccounts.length)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">
                {tiktokAccounts.length > 0
                  ? 'Datos de demostracion - Integracion con TikTok API en desarrollo'
                  : 'Conecta tu TikTok para ver tus estadisticas reales'
                }
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Cuando conectes tu cuenta real de TikTok, veras tus estadisticas actualizadas aqui.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Trabajos</span>
          </Link>

          <Link href="/creator/dashboard" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-xs font-medium">Panel</span>
          </Link>

          <div className="flex flex-col items-center space-y-1 text-blue-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            <span className="text-xs font-medium">Analytics</span>
          </div>

          <Link href="/creator/profile" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>
    </div>
  )
}
