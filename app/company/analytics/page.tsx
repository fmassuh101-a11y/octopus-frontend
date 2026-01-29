'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Creator {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string
  isVerified: boolean
  followers: number
  following: number
  likes: number
  videoCount: number
  avgViews: number
  avgLikes: number
  avgComments: number
  engagementRate: number
  recentVideos: any[]
  niche?: string
  location?: string
}

export default function CompanyAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [creators, setCreators] = useState<Creator[]>([])
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([])
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [sortBy, setSortBy] = useState<'followers' | 'engagement' | 'avgViews'>('followers')
  const [filterMinFollowers, setFilterMinFollowers] = useState(0)
  const [savedCreators, setSavedCreators] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [compareList, setCompareList] = useState<Creator[]>([])

  useEffect(() => {
    loadCreators()
    loadSavedCreators()
  }, [])

  useEffect(() => {
    filterAndSortCreators()
  }, [creators, searchQuery, sortBy, filterMinFollowers])

  const loadCreators = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) {
        window.location.href = '/auth/login'
        return
      }

      // Fetch all creator profiles that have TikTok connected
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_type=eq.creator&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        const creatorsWithTikTok: Creator[] = []

        for (const profile of profiles) {
          try {
            const bioData = profile.bio ? JSON.parse(profile.bio) : {}
            const tiktokAccounts = bioData.tiktokAccounts || []

            if (tiktokAccounts.length > 0) {
              // Aggregate stats from all TikTok accounts
              const totalFollowers = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.followers || 0), 0)
              const totalLikes = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.likes || 0), 0)
              const totalVideos = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.videoCount || 0), 0)
              const avgEngagement = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.engagementRate || 0), 0) / tiktokAccounts.length
              const avgViews = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.avgViews || 0), 0) / tiktokAccounts.length

              // Use the first account's details as primary
              const primaryAccount = tiktokAccounts[0]

              creatorsWithTikTok.push({
                id: profile.id,
                userId: profile.user_id,
                username: primaryAccount.username || bioData.tiktok || 'creator',
                displayName: bioData.firstName && bioData.lastName
                  ? `${bioData.firstName} ${bioData.lastName}`
                  : primaryAccount.displayName || profile.full_name || 'Creator',
                avatarUrl: primaryAccount.avatarUrl || profile.avatar_url,
                bio: primaryAccount.bio || bioData.about || '',
                isVerified: primaryAccount.isVerified || false,
                followers: totalFollowers,
                following: tiktokAccounts.reduce((sum: number, a: any) => sum + (a.following || 0), 0),
                likes: totalLikes,
                videoCount: totalVideos,
                avgViews: Math.round(avgViews),
                avgLikes: Math.round(tiktokAccounts.reduce((sum: number, a: any) => sum + (a.avgLikes || 0), 0) / tiktokAccounts.length),
                avgComments: Math.round(tiktokAccounts.reduce((sum: number, a: any) => sum + (a.avgComments || 0), 0) / tiktokAccounts.length),
                engagementRate: parseFloat(avgEngagement.toFixed(2)),
                recentVideos: tiktokAccounts.flatMap((a: any) => a.recentVideos || []).slice(0, 6),
                niche: bioData.niche || bioData.categories?.[0] || null,
                location: bioData.city && bioData.country ? `${bioData.city}, ${bioData.country}` : bioData.country || null,
              })
            }
          } catch (e) {
            // Skip profiles with invalid bio data
          }
        }

        setCreators(creatorsWithTikTok)
      }
    } catch (err) {
      console.error('Error loading creators:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedCreators = () => {
    const saved = localStorage.getItem('octopus_saved_creators')
    if (saved) {
      setSavedCreators(JSON.parse(saved))
    }
  }

  const filterAndSortCreators = () => {
    let filtered = [...creators]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.username.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query) ||
        (c.niche && c.niche.toLowerCase().includes(query)) ||
        (c.location && c.location.toLowerCase().includes(query))
      )
    }

    // Filter by minimum followers
    if (filterMinFollowers > 0) {
      filtered = filtered.filter(c => c.followers >= filterMinFollowers)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return b.followers - a.followers
        case 'engagement':
          return b.engagementRate - a.engagementRate
        case 'avgViews':
          return b.avgViews - a.avgViews
        default:
          return 0
      }
    })

    setFilteredCreators(filtered)
  }

  const handleSaveCreator = (creatorId: string) => {
    const newSaved = savedCreators.includes(creatorId)
      ? savedCreators.filter(id => id !== creatorId)
      : [...savedCreators, creatorId]
    setSavedCreators(newSaved)
    localStorage.setItem('octopus_saved_creators', JSON.stringify(newSaved))
  }

  const handleAddToCompare = (creator: Creator) => {
    if (compareList.find(c => c.id === creator.id)) {
      setCompareList(compareList.filter(c => c.id !== creator.id))
    } else if (compareList.length < 3) {
      setCompareList([...compareList, creator])
    }
  }

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
          <p className="text-gray-600">Cargando creadores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/company/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Descubrir Creadores</h1>
                <p className="text-sm text-gray-500">
                  {creators.length} creadores con TikTok conectado
                </p>
              </div>
            </div>

            {compareList.length > 0 && (
              <button
                onClick={() => setCompareMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Comparar ({compareList.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, username, nicho o ubicacion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="followers">Mas seguidores</option>
              <option value="engagement">Mayor engagement</option>
              <option value="avgViews">Mas views promedio</option>
            </select>

            {/* Min Followers */}
            <select
              value={filterMinFollowers}
              onChange={(e) => setFilterMinFollowers(Number(e.target.value))}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={0}>Todos los tamaños</option>
              <option value={1000}>1K+ seguidores</option>
              <option value={10000}>10K+ seguidores</option>
              <option value={50000}>50K+ seguidores</option>
              <option value={100000}>100K+ seguidores</option>
            </select>
          </div>
        </div>

        {/* Compare Mode */}
        {compareMode && compareList.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Comparar Creadores</h3>
              <button
                onClick={() => { setCompareMode(false); setCompareList([]); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Creador</th>
                    {compareList.map(c => (
                      <th key={c.id} className="text-center py-3 px-4 font-medium text-gray-900">
                        <div className="flex flex-col items-center">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.username} className="w-12 h-12 rounded-full mb-2" />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
                              {c.displayName.charAt(0)}
                            </div>
                          )}
                          <span>@{c.username}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Seguidores</td>
                    {compareList.map(c => (
                      <td key={c.id} className="text-center py-3 px-4 font-bold">{formatNumber(c.followers)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Engagement Rate</td>
                    {compareList.map(c => (
                      <td key={c.id} className="text-center py-3 px-4">
                        <span className={`font-bold px-2 py-1 rounded-full text-sm ${getEngagementColor(c.engagementRate)}`}>
                          {c.engagementRate}%
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Views Promedio</td>
                    {compareList.map(c => (
                      <td key={c.id} className="text-center py-3 px-4 font-bold">{formatNumber(c.avgViews)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Likes Promedio</td>
                    {compareList.map(c => (
                      <td key={c.id} className="text-center py-3 px-4 font-bold">{formatNumber(c.avgLikes)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-600">Total Videos</td>
                    {compareList.map(c => (
                      <td key={c.id} className="text-center py-3 px-4 font-bold">{c.videoCount}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-600">Nicho</td>
                    {compareList.map(c => (
                      <td key={c.id} className="text-center py-3 px-4">{c.niche || '-'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Creator Detail Modal */}
        {selectedCreator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCreator(null)}>
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {selectedCreator.avatarUrl ? (
                      <img src={selectedCreator.avatarUrl} alt={selectedCreator.username} className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                        {selectedCreator.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedCreator.displayName}</h2>
                        {selectedCreator.isVerified && (
                          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-gray-500">@{selectedCreator.username}</p>
                      {selectedCreator.niche && (
                        <span className="inline-block mt-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                          {selectedCreator.niche}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedCreator(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedCreator.followers)}</p>
                    <p className="text-sm text-gray-500">Seguidores</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className={`text-2xl font-bold ${getEngagementColor(selectedCreator.engagementRate).split(' ')[0]}`}>
                      {selectedCreator.engagementRate}%
                    </p>
                    <p className="text-sm text-gray-500">Engagement</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedCreator.avgViews)}</p>
                    <p className="text-sm text-gray-500">Views Prom.</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{selectedCreator.videoCount}</p>
                    <p className="text-sm text-gray-500">Videos</p>
                  </div>
                </div>

                {/* Performance */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Rendimiento por Video</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Views promedio</span>
                      <span className="font-bold">{formatNumber(selectedCreator.avgViews)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Likes promedio</span>
                      <span className="font-bold">{formatNumber(selectedCreator.avgLikes)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Comentarios promedio</span>
                      <span className="font-bold">{formatNumber(selectedCreator.avgComments)}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Videos */}
                {selectedCreator.recentVideos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Videos Recientes</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedCreator.recentVideos.slice(0, 3).map((video, index) => (
                        <div key={index} className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[9/16]">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex items-center justify-between text-white text-xs">
                              <span>{formatNumber(video.views)} views</span>
                              <span>{formatNumber(video.likes)} likes</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">
                    Invitar a Colaborar
                  </button>
                  <button
                    onClick={() => handleSaveCreator(selectedCreator.id)}
                    className={`px-6 py-3 border rounded-xl font-semibold transition ${
                      savedCreators.includes(selectedCreator.id)
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {savedCreators.includes(selectedCreator.id) ? 'Guardado' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Creators Grid */}
        {filteredCreators.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map(creator => (
              <div
                key={creator.id}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedCreator(creator)}
              >
                {/* Creator Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {creator.avatarUrl ? (
                      <img src={creator.avatarUrl} alt={creator.username} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                        {creator.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-semibold text-gray-900">{creator.displayName}</h3>
                        {creator.isVerified && (
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{creator.username}</p>
                    </div>
                  </div>

                  {/* Compare checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddToCompare(creator); }}
                    className={`p-2 rounded-lg transition ${
                      compareList.find(c => c.id === creator.id)
                        ? 'bg-blue-100 text-blue-600'
                        : 'hover:bg-gray-100 text-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                </div>

                {/* Niche & Location */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {creator.niche && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {creator.niche}
                    </span>
                  )}
                  {creator.location && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {creator.location}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{formatNumber(creator.followers)}</p>
                    <p className="text-xs text-gray-500">Seguidores</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className={`text-lg font-bold ${getEngagementColor(creator.engagementRate).split(' ')[0]}`}>
                      {creator.engagementRate}%
                    </p>
                    <p className="text-xs text-gray-500">Engagement</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{formatNumber(creator.avgViews)}</p>
                    <p className="text-xs text-gray-500">Views Prom.</p>
                  </div>
                </div>

                {/* Engagement Quality Indicator */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Calidad de Engagement</span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${getEngagementColor(creator.engagementRate)}`}>
                    {getEngagementLabel(creator.engagementRate)}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedCreator(creator); }}
                    className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Ver Perfil
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveCreator(creator.id); }}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                      savedCreators.includes(creator.id)
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {savedCreators.includes(creator.id) ? '★' : '☆'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No se encontraron creadores' : 'Aun no hay creadores disponibles'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchQuery
                ? 'Intenta con otros terminos de busqueda o ajusta los filtros.'
                : 'Los creadores apareceran aqui cuando conecten su cuenta de TikTok.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
