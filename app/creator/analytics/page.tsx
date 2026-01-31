'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Hardcoded credentials
const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'
const TIKTOK_CLIENT_KEY = 'sbawzx5ya0iuu4hs58'

export default function CreatorAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [tiktokAccounts, setTiktokAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

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
    if (TIKTOK_CLIENT_KEY) {
      const redirectUri = `${window.location.origin}/auth/tiktok/callback`
      // Include user.info.stats scope for follower/following/likes counts
      const scope = 'user.info.basic,user.info.stats,user.info.profile,video.list'
      const state = `octopus_${Date.now()}`
      const tiktokAuthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
      window.location.href = tiktokAuthUrl
    } else {
      // Demo mode - simulate adding an account
      const demoUsername = prompt('Ingresa tu username de TikTok (sin @):')
      if (demoUsername) {
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
      if (selectedAccount === accountId) {
        setSelectedAccount('all')
      }
    } catch (err) {
      console.error('Error removing account:', err)
    }
  }

  const handleRefreshData = async () => {
    setRefreshing(true)
    // In production, this would call TikTok API to refresh data
    await new Promise(resolve => setTimeout(resolve, 1500))
    await loadProfile()
    setRefreshing(false)
  }

  // Get stats for selected account(s)
  const getStats = () => {
    if (selectedAccount === 'all') {
      return {
        followers: tiktokAccounts.reduce((sum, a) => sum + (a.followers || 0), 0),
        following: tiktokAccounts.reduce((sum, a) => sum + (a.following || 0), 0),
        likes: tiktokAccounts.reduce((sum, a) => sum + (a.likes || 0), 0),
        videoCount: tiktokAccounts.reduce((sum, a) => sum + (a.videoCount || 0), 0),
        avgViews: tiktokAccounts.length > 0
          ? Math.round(tiktokAccounts.reduce((sum, a) => sum + (a.avgViews || 0), 0) / tiktokAccounts.length)
          : 0,
        avgLikes: tiktokAccounts.length > 0
          ? Math.round(tiktokAccounts.reduce((sum, a) => sum + (a.avgLikes || 0), 0) / tiktokAccounts.length)
          : 0,
        avgComments: tiktokAccounts.length > 0
          ? Math.round(tiktokAccounts.reduce((sum, a) => sum + (a.avgComments || 0), 0) / tiktokAccounts.length)
          : 0,
        engagementRate: tiktokAccounts.length > 0
          ? parseFloat((tiktokAccounts.reduce((sum, a) => sum + (a.engagementRate || 0), 0) / tiktokAccounts.length).toFixed(2))
          : 0,
        recentVideos: tiktokAccounts.flatMap(a => a.recentVideos || []).slice(0, 6),
      }
    } else {
      const account = tiktokAccounts.find(a => a.id === selectedAccount)
      return account || { followers: 0, following: 0, likes: 0, videoCount: 0, avgViews: 0, avgLikes: 0, avgComments: 0, engagementRate: 0, recentVideos: [] }
    }
  }

  const stats = getStats()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getEngagementColor = (rate: number) => {
    if (rate >= 6) return 'text-green-600 bg-green-100'
    if (rate >= 3) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getEngagementLabel = (rate: number) => {
    if (rate >= 6) return 'Excelente'
    if (rate >= 3) return 'Bueno'
    return 'Bajo'
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/creator/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-500">Rendimiento de tu contenido en TikTok</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {tiktokAccounts.length > 0 && (
                <button
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
              )}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition cursor-pointer ${
                    selectedAccount === account.id || selectedAccount === 'all'
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAccount(account.id)}
                >
                  {account.avatarUrl ? (
                    <img src={account.avatarUrl} alt={account.username} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {account.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">@{account.username}</p>
                      {account.isVerified && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {account.isDemo && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500 text-black rounded">Demo</span>
                      )}
                    </div>
                    <p className={`text-xs ${selectedAccount === account.id || selectedAccount === 'all' ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatNumber(account.followers)} seguidores
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveAccount(account.id); }}
                    className={`ml-2 p-1 rounded-full hover:bg-white/20 transition ${
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

        {/* No accounts connected - Hero CTA */}
        {tiktokAccounts.length === 0 && (
          <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 rounded-3xl p-10 mb-6 text-white text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/20 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/20 to-transparent rounded-full blur-3xl"></div>

            <div className="relative">
              <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Conecta tu TikTok</h3>
              <p className="text-white/70 mb-8 max-w-md mx-auto">
                Ve tus estadisticas reales, engagement rate, y el rendimiento de tus videos. Las empresas veran tu perfil completo cuando te busquen.
              </p>
              <button
                onClick={handleConnectTikTok}
                className="px-8 py-4 bg-white text-black rounded-2xl font-semibold hover:bg-gray-100 transition inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
                Conectar TikTok
              </button>
            </div>
          </div>
        )}

        {/* Stats Dashboard */}
        {tiktokAccounts.length > 0 && (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  {selectedAccount === 'all' && <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">TOTAL</span>}
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.followers)}</p>
                <p className="text-sm text-gray-500 mt-1">Seguidores</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.likes)}</p>
                <p className="text-sm text-gray-500 mt-1">Likes Totales</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.videoCount)}</p>
                <p className="text-sm text-gray-500 mt-1">Videos</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getEngagementColor(stats.engagementRate).replace('text-', 'bg-').replace('-600', '-100')}`}>
                    <svg className={`w-5 h-5 ${getEngagementColor(stats.engagementRate).split(' ')[0]}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getEngagementColor(stats.engagementRate)}`}>
                    {getEngagementLabel(stats.engagementRate)}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.engagementRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Engagement Rate</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Average Performance */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  Rendimiento Promedio por Video
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Views</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatNumber(stats.avgViews)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Likes</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatNumber(stats.avgLikes)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Comentarios</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatNumber(stats.avgComments)}</span>
                  </div>
                </div>
              </div>

              {/* Account Summary */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Resumen de Cuenta
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Cuentas conectadas</span>
                    <span className="font-bold text-gray-900">{tiktokAccounts.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Seguidores totales</span>
                    <span className="font-bold text-gray-900">{formatNumber(stats.followers)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Siguiendo</span>
                    <span className="font-bold text-gray-900">{formatNumber(stats.following)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Videos totales</span>
                    <span className="font-bold text-gray-900">{formatNumber(stats.videoCount)}</span>
                  </div>
                </div>

                {/* Engagement Bar Visual */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Engagement Rate</span>
                    <span className={`text-sm font-bold ${getEngagementColor(stats.engagementRate).split(' ')[0]}`}>
                      {stats.engagementRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        stats.engagementRate >= 6 ? 'bg-green-500' :
                        stats.engagementRate >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.engagementRate * 10, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Benchmark: 2-4% bajo, 4-6% bueno, 6%+ excelente
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Videos */}
            {stats.recentVideos && stats.recentVideos.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  Videos Recientes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {stats.recentVideos.map((video: any, index: number) => (
                    <div key={video.id || index} className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-[9/16]">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="flex items-center justify-between text-white text-xs">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              {formatNumber(video.views)}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                              {formatNumber(video.likes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Banner */}
        {tiktokAccounts.some((a: any) => a.isDemo) && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm text-yellow-800 font-medium">Modo Demo Activado</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Algunas cuentas muestran datos de demostracion. Para ver tus estadisticas reales, asegurate de tener tu cuenta de TikTok agregada como Target User en el Sandbox de TikTok Developer Portal.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Trabajos</span>
          </Link>

          <Link href="/creator/dashboard" className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600 transition">
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

          <Link href="/creator/profile" className="flex flex-col items-center space-y-1 text-gray-400 hover:text-gray-600 transition">
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
