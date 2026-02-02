'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Post {
  id: string
  creatorId: string
  creatorName: string
  creatorAvatar?: string
  title: string
  description?: string
  coverUrl?: string
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  createTime: string
  engagementRate: number
  platform: 'tiktok' | 'instagram' | 'youtube'
}

interface Creator {
  id: string
  name: string
  avatar?: string
}

type FilterPlatform = 'all' | 'tiktok' | 'instagram' | 'youtube'
type FilterCreator = 'all' | string
type SortBy = 'recent' | 'views' | 'engagement' | 'likes'

export default function CompanyPostsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all')
  const [filterCreator, setFilterCreator] = useState<FilterCreator>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const getToken = () => localStorage.getItem('sb-access-token')
  const getUserId = () => {
    const userStr = localStorage.getItem('sb-user')
    return userStr ? JSON.parse(userStr).id : null
  }

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    const token = getToken()
    const userId = getUserId()

    if (!token || !userId) {
      router.push('/auth/login')
      return
    }

    try {
      // Get accepted applications
      const appsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&status=eq.accepted&select=creator_id`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (!appsRes.ok) {
        setLoading(false)
        return
      }

      const applications = await appsRes.json()
      if (applications.length === 0) {
        setLoading(false)
        return
      }

      const creatorIds = Array.from(new Set(applications.map((a: any) => a.creator_id))) as string[]

      // Get profiles
      const profilesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,bio,avatar_url`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const profiles = profilesRes.ok ? await profilesRes.json() : []

      // Get TikTok data
      const tiktokRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tiktok_data?user_id=in.(${creatorIds.join(',')})&select=user_id,videos&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const tiktokData = tiktokRes.ok ? await tiktokRes.json() : []

      // Build posts and creators list
      const allPosts: Post[] = []
      const creatorsMap = new Map<string, Creator>()

      for (const profile of profiles) {
        let name = profile.full_name || 'Creador'
        let avatar = profile.avatar_url

        if (profile.bio) {
          try {
            const bioData = typeof profile.bio === 'string' ? JSON.parse(profile.bio) : profile.bio
            if (bioData.firstName && bioData.lastName) {
              name = `${bioData.firstName} ${bioData.lastName}`
            }
            if (bioData.tiktokAccounts && bioData.tiktokAccounts.length > 0) {
              avatar = avatar || bioData.tiktokAccounts[0].avatarUrl
            }
          } catch (e) {}
        }

        creatorsMap.set(profile.user_id, { id: profile.user_id, name, avatar })

        // Get videos for this creator
        const creatorTiktok = tiktokData.find((t: any) => t.user_id === profile.user_id)
        if (creatorTiktok?.videos && Array.isArray(creatorTiktok.videos)) {
          for (const video of creatorTiktok.videos) {
            const engagement = video.view_count > 0
              ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
              : 0

            allPosts.push({
              id: video.id,
              creatorId: profile.user_id,
              creatorName: name,
              creatorAvatar: avatar,
              title: video.title || 'Sin titulo',
              description: video.description,
              coverUrl: video.cover_url,
              viewCount: video.view_count || 0,
              likeCount: video.like_count || 0,
              commentCount: video.comment_count || 0,
              shareCount: video.share_count || 0,
              createTime: new Date(video.create_time * 1000).toISOString(),
              engagementRate: engagement,
              platform: 'tiktok'
            })
          }
        }
      }

      setCreators(Array.from(creatorsMap.values()))
      setPosts(allPosts)
    } catch (err) {
      console.error('Error loading posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredPosts = () => {
    let filtered = [...posts]

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform === filterPlatform)
    }

    if (filterCreator !== 'all') {
      filtered = filtered.filter(p => p.creatorId === filterCreator)
    }

    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
        break
      case 'views':
        filtered.sort((a, b) => b.viewCount - a.viewCount)
        break
      case 'engagement':
        filtered.sort((a, b) => b.engagementRate - a.engagementRate)
        break
      case 'likes':
        filtered.sort((a, b) => b.likeCount - a.likeCount)
        break
    }

    return filtered
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} dias`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const filteredPosts = getFilteredPosts()

  // Calculate stats
  const totalViews = filteredPosts.reduce((sum, p) => sum + p.viewCount, 0)
  const totalLikes = filteredPosts.reduce((sum, p) => sum + p.likeCount, 0)
  const avgEngagement = filteredPosts.length > 0
    ? filteredPosts.reduce((sum, p) => sum + p.engagementRate, 0) / filteredPosts.length
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/company/dashboard')}
              className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">Posts de Creadores</h1>
              <p className="text-xs text-neutral-500">{filteredPosts.length} posts de {creators.length} creadores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800 text-center">
            <p className="text-lg font-bold">{formatNumber(totalViews)}</p>
            <p className="text-xs text-neutral-500">Views Totales</p>
          </div>
          <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800 text-center">
            <p className="text-lg font-bold">{formatNumber(totalLikes)}</p>
            <p className="text-xs text-neutral-500">Likes Totales</p>
          </div>
          <div className="bg-neutral-900 rounded-xl p-3 border border-neutral-800 text-center">
            <p className="text-lg font-bold text-green-400">{avgEngagement.toFixed(1)}%</p>
            <p className="text-xs text-neutral-500">Engagement Prom</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* Platform Filter */}
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value as FilterPlatform)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todas las plataformas</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </select>

          {/* Creator Filter */}
          <select
            value={filterCreator}
            onChange={(e) => setFilterCreator(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los creadores</option>
            {creators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="recent">Mas recientes</option>
            <option value="views">Mas views</option>
            <option value="engagement">Mayor engagement</option>
            <option value="likes">Mas likes</option>
          </select>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="px-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 text-center">
            <span className="text-4xl block mb-4">📱</span>
            <h3 className="text-lg font-semibold mb-2">Sin posts</h3>
            <p className="text-neutral-500 text-sm">
              Los posts de tus creadores aceptados apareceran aqui
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 cursor-pointer hover:border-neutral-700 transition"
              >
                {/* Thumbnail */}
                <div className="aspect-[9/16] relative bg-neutral-800">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">📹</span>
                    </div>
                  )}

                  {/* Platform Badge */}
                  <div className="absolute top-2 left-2">
                    <div className="w-6 h-6 bg-black/70 rounded-full flex items-center justify-center">
                      {post.platform === 'tiktok' && (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Engagement Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.engagementRate >= 10 ? 'bg-green-500/90 text-white' :
                      post.engagementRate >= 5 ? 'bg-yellow-500/90 text-black' :
                      'bg-neutral-700/90 text-white'
                    }`}>
                      {post.engagementRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* Stats Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        {formatNumber(post.viewCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        {formatNumber(post.likeCount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Creator Info */}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    {post.creatorAvatar ? (
                      <img
                        src={post.creatorAvatar}
                        alt={post.creatorName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                        {post.creatorName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.creatorName}</p>
                      <p className="text-[10px] text-neutral-500">{formatDate(post.createTime)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-neutral-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                {selectedPost.creatorAvatar ? (
                  <img
                    src={selectedPost.creatorAvatar}
                    alt={selectedPost.creatorName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                    {selectedPost.creatorName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedPost.creatorName}</p>
                  <p className="text-xs text-neutral-500">{formatDate(selectedPost.createTime)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-neutral-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Thumbnail */}
            <div className="aspect-video relative bg-neutral-800">
              {selectedPost.coverUrl ? (
                <img
                  src={selectedPost.coverUrl}
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl">📹</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-neutral-800 rounded-xl">
                  <p className="text-lg font-bold">{formatNumber(selectedPost.viewCount)}</p>
                  <p className="text-xs text-neutral-500">Views</p>
                </div>
                <div className="text-center p-3 bg-neutral-800 rounded-xl">
                  <p className="text-lg font-bold">{formatNumber(selectedPost.likeCount)}</p>
                  <p className="text-xs text-neutral-500">Likes</p>
                </div>
                <div className="text-center p-3 bg-neutral-800 rounded-xl">
                  <p className="text-lg font-bold">{formatNumber(selectedPost.commentCount)}</p>
                  <p className="text-xs text-neutral-500">Comments</p>
                </div>
                <div className="text-center p-3 bg-neutral-800 rounded-xl">
                  <p className="text-lg font-bold">{formatNumber(selectedPost.shareCount)}</p>
                  <p className="text-xs text-neutral-500">Shares</p>
                </div>
              </div>

              {/* Engagement Rate */}
              <div className={`p-4 rounded-xl ${
                selectedPost.engagementRate >= 10 ? 'bg-green-500/20 border border-green-500/30' :
                selectedPost.engagementRate >= 5 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                'bg-neutral-800 border border-neutral-700'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Engagement Rate</span>
                  <span className={`text-xl font-bold ${
                    selectedPost.engagementRate >= 10 ? 'text-green-400' :
                    selectedPost.engagementRate >= 5 ? 'text-yellow-400' :
                    'text-neutral-300'
                  }`}>
                    {selectedPost.engagementRate.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {selectedPost.engagementRate >= 10 ? 'Excelente rendimiento!' :
                   selectedPost.engagementRate >= 5 ? 'Buen rendimiento' :
                   'Rendimiento promedio'}
                </p>
              </div>

              {/* Title */}
              {selectedPost.title && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-400 mb-1">Titulo</p>
                  <p className="text-sm">{selectedPost.title}</p>
                </div>
              )}

              {/* View on TikTok */}
              <a
                href={`https://tiktok.com/@username/video/${selectedPost.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full py-3 bg-white text-black rounded-xl font-semibold text-center hover:bg-neutral-200 transition"
              >
                Ver en TikTok
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/company/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => router.push('/company/jobs')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">💼</span>
            <span className="text-xs">Mis Gigs</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-purple-500">
            <span className="text-lg">📱</span>
            <span className="text-xs font-medium">Posts</span>
          </div>
          <button onClick={() => router.push('/company/applicants')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">👥</span>
            <span className="text-xs">Aplicantes</span>
          </button>
        </div>
        <div className="h-1 bg-white mx-auto w-32 rounded-full mb-2" />
      </div>
    </div>
  )
}
