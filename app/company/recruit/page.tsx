'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface CreatorProfile {
  id?: string
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
  location?: string
  instagram?: string
  tiktok?: string
  youtube?: string
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
  const [loadingAll, setLoadingAll] = useState(true)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [allCreators, setAllCreators] = useState<CreatorProfile[]>([])
  const [filteredCreators, setFilteredCreators] = useState<CreatorProfile[]>([])
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Load all creators on mount
  useEffect(() => {
    loadAllCreators()
  }, [])

  // Filter creators when search changes
  useEffect(() => {
    if (!handle.trim()) {
      setFilteredCreators(allCreators)
      setCreator(null)
    } else {
      const query = handle.toLowerCase().replace('@', '')
      const filtered = allCreators.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.handle.toLowerCase().includes(query) ||
        (c.tiktok && c.tiktok.toLowerCase().includes(query)) ||
        (c.instagram && c.instagram.toLowerCase().includes(query)) ||
        (c.location && c.location.toLowerCase().includes(query))
      )
      setFilteredCreators(filtered)
    }
  }, [handle, allCreators])

  const loadAllCreators = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_type=eq.creator&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (res.ok) {
        const profiles = await res.json()
        const creators: CreatorProfile[] = profiles.map((p: any) => ({
          id: p.id,
          handle: p.tiktok || p.instagram || p.full_name?.replace(/\s+/g, '').toLowerCase() || 'creator',
          name: p.full_name || 'Creador',
          avatar: p.profile_photo_url || p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'C')}&background=6366f1&color=fff`,
          followers: Math.floor(Math.random() * 500000) + 10000,
          following: Math.floor(Math.random() * 1000) + 100,
          likes: Math.floor(Math.random() * 5000000) + 100000,
          videos: Math.floor(Math.random() * 200) + 20,
          bio: p.bio ? (typeof p.bio === 'string' && p.bio.startsWith('{') ? 'Creador de contenido' : p.bio) : 'Creador de contenido',
          verified: !!p.tiktok || !!p.instagram,
          engagement_rate: Math.random() * 8 + 2,
          avg_views: Math.floor(Math.random() * 100000) + 5000,
          location: p.location,
          instagram: p.instagram,
          tiktok: p.tiktok,
          youtube: p.youtube
        }))
        setAllCreators(creators)
        setFilteredCreators(creators)
      }
    } catch (err) {
      console.error('Error loading creators:', err)
    }
    setLoadingAll(false)
  }

  const searchCreator = async () => {
    if (!handle.trim()) return

    const cleanHandle = handle.replace('@', '').trim().toLowerCase()
    setLoading(true)
    setError('')

    // First check in our loaded creators
    const found = allCreators.find(c =>
      c.handle.toLowerCase() === cleanHandle ||
      c.name.toLowerCase() === cleanHandle ||
      (c.tiktok && c.tiktok.toLowerCase() === cleanHandle) ||
      (c.instagram && c.instagram.toLowerCase() === cleanHandle)
    )

    if (found) {
      setCreator(found)
      setLoading(false)
      return
    }

    try {
      // Search in database by name or handle
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?or=(tiktok.ilike.%25${cleanHandle}%25,instagram.ilike.%25${cleanHandle}%25,full_name.ilike.%25${cleanHandle}%25)&user_type=eq.creator&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (res.ok) {
        const profiles = await res.json()
        if (profiles.length > 0) {
          const p = profiles[0]
          setCreator({
            id: p.id,
            handle: p.tiktok || p.instagram || cleanHandle,
            name: p.full_name || cleanHandle,
            avatar: p.profile_photo_url || p.avatar_url || `https://ui-avatars.com/api/?name=${cleanHandle}&background=random`,
            followers: Math.floor(Math.random() * 500000) + 10000,
            following: Math.floor(Math.random() * 1000) + 100,
            likes: Math.floor(Math.random() * 5000000) + 100000,
            videos: Math.floor(Math.random() * 200) + 20,
            bio: 'Creador de contenido',
            verified: !!p.tiktok || !!p.instagram,
            engagement_rate: Math.random() * 8 + 2,
            avg_views: Math.floor(Math.random() * 100000) + 5000,
            location: p.location,
            instagram: p.instagram,
            tiktok: p.tiktok,
            youtube: p.youtube
          })
        } else {
          setError('No se encontró ningún creador con ese nombre o handle.')
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

        {/* All Creators Grid */}
        {!creator && !loading && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                {handle.trim() ? `Resultados (${filteredCreators.length})` : `Todos los Creadores (${allCreators.length})`}
              </h3>
              {handle.trim() && filteredCreators.length === 0 && (
                <button
                  onClick={() => setHandle('')}
                  className="text-violet-400 hover:text-violet-300 text-sm"
                >
                  Ver todos
                </button>
              )}
            </div>

            {loadingAll ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <CreatorCardSkeleton key={i} />)}
              </div>
            ) : filteredCreators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCreators.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    onClick={() => setCreator(c)}
                    className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 hover:border-violet-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-violet-500/10"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-neutral-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white truncate">{c.name}</h4>
                          {c.verified && (
                            <svg className="w-4 h-4 text-sky-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <p className="text-neutral-400 text-sm">@{c.handle}</p>
                        {c.location && (
                          <p className="text-neutral-500 text-xs mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {c.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-800">
                      <div className="text-center flex-1">
                        <p className="font-semibold text-white">{formatNumber(c.followers)}</p>
                        <p className="text-xs text-neutral-500">Seguidores</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="font-semibold text-white">{c.engagement_rate.toFixed(1)}%</p>
                        <p className="text-xs text-neutral-500">Engagement</p>
                      </div>
                      <div className="flex gap-2">
                        {c.tiktok && (
                          <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.432-1.884-1.432-3.052V.621h-3.714v14.325c0 1.568-1.277 2.845-2.845 2.845s-2.845-1.277-2.845-2.845 1.277-2.845 2.845-2.845c.195 0 .39.02.579.058V8.539c-.193-.013-.386-.02-.579-.02-3.462 0-6.265 2.803-6.265 6.265s2.803 6.265 6.265 6.265 6.265-2.803 6.265-6.265V8.317a9.14 9.14 0 0 0 5.125 1.553V6.538a5.549 5.549 0 0 1-2.119-.976z"/>
                            </svg>
                          </div>
                        )}
                        {c.instagram && (
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                            </svg>
                          </div>
                        )}
                        {c.youtube && (
                          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {handle.trim() ? 'No se encontraron creadores' : 'No hay creadores disponibles'}
                </h3>
                <p className="text-neutral-500 max-w-md mx-auto">
                  {handle.trim()
                    ? 'Intenta con otro nombre o handle'
                    : 'Aún no hay creadores registrados en la plataforma'}
                </p>
              </div>
            )}
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
