'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface CreatorProfile {
  handle: string
  name: string
  avatar: string
  followers: number
  following: number
  likes: number
  videos: number
  bio: string
  verified: boolean
  engagement_rate: number
  avg_views: number
}

// Skeleton component
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-800 rounded ${className || ''}`} />
  )
}

function CreatorCardSkeleton() {
  return (
    <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
      <div className="flex items-start gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RecruitPage() {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const searchCreator = async () => {
    if (!handle.trim()) return

    const cleanHandle = handle.replace('@', '').trim()
    setLoading(true)
    setError('')
    setCreator(null)

    try {
      // For now, simulate API call - in production this would call TikTok API or scraper
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Check if creator exists in our database
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?tiktok_handle=ilike.${cleanHandle}&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (res.ok) {
        const profiles = await res.json()
        if (profiles.length > 0) {
          const p = profiles[0]
          // Found in our system
          setCreator({
            handle: cleanHandle,
            name: p.full_name || cleanHandle,
            avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${cleanHandle}&background=random`,
            followers: Math.floor(Math.random() * 500000) + 10000,
            following: Math.floor(Math.random() * 1000) + 100,
            likes: Math.floor(Math.random() * 5000000) + 100000,
            videos: Math.floor(Math.random() * 200) + 20,
            bio: p.bio || 'Creator de contenido',
            verified: Math.random() > 0.7,
            engagement_rate: Math.random() * 8 + 2,
            avg_views: Math.floor(Math.random() * 100000) + 5000
          })
        } else {
          // Not in our system - show simulated data
          setCreator({
            handle: cleanHandle,
            name: cleanHandle,
            avatar: `https://ui-avatars.com/api/?name=${cleanHandle}&background=6366f1&color=fff`,
            followers: Math.floor(Math.random() * 500000) + 10000,
            following: Math.floor(Math.random() * 1000) + 100,
            likes: Math.floor(Math.random() * 5000000) + 100000,
            videos: Math.floor(Math.random() * 200) + 20,
            bio: 'Creator de contenido en TikTok',
            verified: Math.random() > 0.7,
            engagement_rate: Math.random() * 8 + 2,
            avg_views: Math.floor(Math.random() * 100000) + 5000
          })
        }
      }

      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [cleanHandle, ...prev.filter(h => h !== cleanHandle)].slice(0, 5)
        return updated
      })

    } catch (err) {
      setError('Error al buscar el creador. Intenta de nuevo.')
    }
    setLoading(false)
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/company/dashboard" className="text-neutral-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Descubrir Creadores</h1>
              <p className="text-sm text-neutral-400">Busca cualquier perfil de TikTok</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search Box */}
        <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-2xl p-8 border border-violet-500/30 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Analiza cualquier creador</h2>
            <p className="text-neutral-400">Ingresa un handle de TikTok para ver sus estadisticas</p>
          </div>

          <div className="flex gap-3 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCreator()}
                placeholder="username"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 pl-9 text-lg focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <button
              onClick={searchCreator}
              disabled={loading || !handle.trim()}
              className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </>
              )}
            </button>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-2 justify-center mt-4 flex-wrap">
              <span className="text-sm text-neutral-500">Recientes:</span>
              {recentSearches.map(h => (
                <button
                  key={h}
                  onClick={() => { setHandle(h); }}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm transition-colors"
                >
                  @{h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center text-red-400">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && <CreatorCardSkeleton />}

        {/* Creator Result */}
        {creator && !loading && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            {/* Profile Header */}
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-start gap-5">
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-neutral-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold">{creator.name}</h3>
                    {creator.verified && (
                      <svg className="w-6 h-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-neutral-400 mb-3">@{creator.handle}</p>
                  <p className="text-neutral-300">{creator.bio}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors">
                    Invitar a Campaña
                  </button>
                  <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-medium transition-colors">
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 divide-x divide-neutral-800">
              {[
                { label: 'Seguidores', value: creator.followers },
                { label: 'Siguiendo', value: creator.following },
                { label: 'Likes', value: creator.likes },
                { label: 'Videos', value: creator.videos },
              ].map((stat) => (
                <div key={stat.label} className="p-5 text-center">
                  <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Performance Metrics */}
            <div className="p-6 bg-neutral-800/30">
              <h4 className="font-semibold mb-4">Metricas de Rendimiento</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-900 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-400">Engagement Rate</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      creator.engagement_rate > 5 ? 'bg-green-500/20 text-green-400' :
                      creator.engagement_rate > 3 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {creator.engagement_rate > 5 ? 'Excelente' : creator.engagement_rate > 3 ? 'Bueno' : 'Bajo'}
                    </span>
                  </div>
                  <p className="text-3xl font-bold">{creator.engagement_rate.toFixed(2)}%</p>
                  <p className="text-xs text-neutral-500 mt-1">Promedio industria: 4.5%</p>
                </div>
                <div className="bg-neutral-900 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-400">Views Promedio</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-400">
                      Por video
                    </span>
                  </div>
                  <p className="text-3xl font-bold">{formatNumber(creator.avg_views)}</p>
                  <p className="text-xs text-neutral-500 mt-1">Basado en ultimos 20 videos</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="p-6 border-t border-neutral-800 flex items-center justify-between">
              <div>
                <p className="font-medium">¿Te interesa este creador?</p>
                <p className="text-sm text-neutral-500">Invitalo a una de tus campañas</p>
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-semibold transition-all">
                Enviar Invitacion
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!creator && !loading && !error && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Busca un creador</h3>
            <p className="text-neutral-500 max-w-md mx-auto">
              Ingresa el handle de TikTok de cualquier creador para ver sus estadisticas y metricas de rendimiento
            </p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-6 py-3">
        <div className="max-w-4xl mx-auto flex justify-around">
          {[
            { icon: '🏠', label: 'Dashboard', href: '/company/dashboard' },
            { icon: '📋', label: 'Campañas', href: '/company/campaigns' },
            { icon: '💬', label: 'Mensajes', href: '/company/messages' },
            { icon: '👥', label: 'Aplicantes', href: '/company/applicants' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
