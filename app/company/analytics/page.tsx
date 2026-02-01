'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Creator {
  id: string
  name: string
  avatar?: string
  tiktokUsername?: string
  followerCount: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  videoCount: number
  engagementRate: number
}

interface Post {
  id: string
  creatorId: string
  creatorName: string
  title: string
  coverUrl?: string
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  createTime: string
  engagementRate: number
}

interface OverviewStats {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalPosts: number
  avgEngagement: number
  totalCreators: number
  totalSpend: number
}

type TimePeriod = '7d' | '30d' | '90d' | 'all'
type ViewMode = 'overview' | 'creators' | 'posts'

export default function CompanyAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d')
  const [creators, setCreators] = useState<Creator[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [stats, setStats] = useState<OverviewStats>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalPosts: 0,
    avgEngagement: 0,
    totalCreators: 0,
    totalSpend: 0
  })

  const getToken = () => localStorage.getItem('sb-access-token')
  const getUserId = () => {
    const userStr = localStorage.getItem('sb-user')
    return userStr ? JSON.parse(userStr).id : null
  }

  useEffect(() => {
    loadAnalytics()
  }, [timePeriod])

  const loadAnalytics = async () => {
    const token = getToken()
    const userId = getUserId()

    if (!token || !userId) {
      router.push('/auth/login')
      return
    }

    try {
      // Get all accepted applications
      const appsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&status=eq.accepted&select=id,creator_id,gig_id,gig:gigs(title,budget)`,
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

      // Get unique creator IDs
      const creatorIds = [...new Set(applications.map((a: any) => a.creator_id))] as string[]

      // Get creator profiles
      const profilesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,bio,avatar_url`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const profiles = profilesRes.ok ? await profilesRes.json() : []

      // Get TikTok data for each creator
      const tiktokRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tiktok_data?user_id=in.(${creatorIds.join(',')})&select=user_id,videos,metrics,created_at&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const tiktokData = tiktokRes.ok ? await tiktokRes.json() : []

      // Build creator data with aggregated metrics
      const creatorsMap = new Map<string, Creator>()
      const allPosts: Post[] = []

      for (const profile of profiles) {
        let name = profile.full_name || 'Creador'
        let tiktokUsername = ''
        let avatar = profile.avatar_url

        // Parse bio
        if (profile.bio) {
          try {
            const bioData = typeof profile.bio === 'string' ? JSON.parse(profile.bio) : profile.bio
            if (bioData.firstName && bioData.lastName) {
              name = `${bioData.firstName} ${bioData.lastName}`
            }
            if (bioData.tiktokAccounts && bioData.tiktokAccounts.length > 0) {
              tiktokUsername = bioData.tiktokAccounts[0].username
              avatar = avatar || bioData.tiktokAccounts[0].avatarUrl
            }
          } catch (e) {}
        }

        // Get TikTok metrics for this creator
        const creatorTiktok = tiktokData.find((t: any) => t.user_id === profile.user_id)
        let totalViews = 0
        let totalLikes = 0
        let totalComments = 0
        let totalShares = 0
        let videoCount = 0
        let followerCount = 0

        if (creatorTiktok) {
          if (creatorTiktok.metrics) {
            followerCount = creatorTiktok.metrics.followerCount || 0
          }

          if (creatorTiktok.videos && Array.isArray(creatorTiktok.videos)) {
            // Filter by time period
            const cutoffDate = getTimeCutoff(timePeriod)
            const filteredVideos = creatorTiktok.videos.filter((v: any) => {
              const videoDate = new Date(v.create_time * 1000)
              return videoDate >= cutoffDate
            })

            for (const video of filteredVideos) {
              totalViews += video.view_count || 0
              totalLikes += video.like_count || 0
              totalComments += video.comment_count || 0
              totalShares += video.share_count || 0
              videoCount++

              // Add to posts list
              const engagement = video.view_count > 0
                ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
                : 0

              allPosts.push({
                id: video.id,
                creatorId: profile.user_id,
                creatorName: name,
                title: video.title || 'Sin titulo',
                coverUrl: video.cover_url,
                viewCount: video.view_count || 0,
                likeCount: video.like_count || 0,
                commentCount: video.comment_count || 0,
                shareCount: video.share_count || 0,
                createTime: new Date(video.create_time * 1000).toISOString(),
                engagementRate: engagement
              })
            }
          }
        }

        const engagementRate = totalViews > 0
          ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
          : 0

        creatorsMap.set(profile.user_id, {
          id: profile.user_id,
          name,
          avatar,
          tiktokUsername,
          followerCount,
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          videoCount,
          engagementRate
        })
      }

      const creatorsArray = Array.from(creatorsMap.values())

      // Calculate total spend
      let totalSpend = 0
      for (const app of applications) {
        if (app.gig?.budget) {
          const budget = parseFloat(app.gig.budget.replace(/[^0-9.]/g, ''))
          if (!isNaN(budget)) totalSpend += budget
        }
      }

      // Calculate overview stats
      const totalViews = creatorsArray.reduce((sum, c) => sum + c.totalViews, 0)
      const totalLikes = creatorsArray.reduce((sum, c) => sum + c.totalLikes, 0)
      const totalComments = creatorsArray.reduce((sum, c) => sum + c.totalComments, 0)
      const totalShares = creatorsArray.reduce((sum, c) => sum + c.totalShares, 0)
      const totalPosts = allPosts.length

      const avgEngagement = totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
        : 0

      setStats({
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalPosts,
        avgEngagement,
        totalCreators: creatorsArray.length,
        totalSpend
      })

      // Sort creators by total views
      creatorsArray.sort((a, b) => b.totalViews - a.totalViews)
      setCreators(creatorsArray)

      // Sort posts by views
      allPosts.sort((a, b) => b.viewCount - a.viewCount)
      setPosts(allPosts)

    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTimeCutoff = (period: TimePeriod): Date => {
    const now = new Date()
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      case 'all':
      default:
        return new Date(0)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold">Analytics</h1>
                <p className="text-xs text-neutral-500">Metricas de tus creadores</p>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Datos en vivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: '7d', label: '7 dias' },
            { id: '30d', label: '30 dias' },
            { id: '90d', label: '90 dias' },
            { id: 'all', label: 'Todo' }
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => setTimePeriod(period.id as TimePeriod)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                timePeriod === period.id
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-neutral-900 rounded-xl p-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'creators', label: 'Creadores', icon: '👥' },
            { id: 'posts', label: 'Posts', icon: '📱' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                viewMode === tab.id
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {viewMode === 'overview' && (
          <div className="space-y-4">
            {/* Overview Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👁️</span>
                  <span className="text-neutral-400 text-sm">Views</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalViews)}</p>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">❤️</span>
                  <span className="text-neutral-400 text-sm">Likes</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalLikes)}</p>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💬</span>
                  <span className="text-neutral-400 text-sm">Comments</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalComments)}</p>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔄</span>
                  <span className="text-neutral-400 text-sm">Shares</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalShares)}</p>
              </div>
            </div>

            {/* Engagement Card */}
            <div className="bg-gradient-to-br from-sky-900/50 to-purple-900/50 rounded-2xl p-5 border border-sky-500/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-neutral-400 text-sm">Engagement Promedio</p>
                  <p className="text-4xl font-bold">{stats.avgEngagement.toFixed(2)}%</p>
                </div>
                <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📈</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-xl font-bold">{stats.totalCreators}</p>
                  <p className="text-xs text-neutral-400">Creadores</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{stats.totalPosts}</p>
                  <p className="text-xs text-neutral-400">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">${formatNumber(stats.totalSpend)}</p>
                  <p className="text-xs text-neutral-400">Invertido</p>
                </div>
              </div>
            </div>

            {/* Top Creators Preview */}
            {creators.length > 0 && (
              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Top Creadores</h3>
                  <button
                    onClick={() => setViewMode('creators')}
                    className="text-sky-400 text-sm"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="space-y-3">
                  {creators.slice(0, 3).map((creator, index) => (
                    <div key={creator.id} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-neutral-500 w-6">
                        {index + 1}
                      </span>
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                          {creator.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{creator.name}</p>
                        <p className="text-xs text-neutral-500">{formatNumber(creator.totalViews)} views</p>
                      </div>
                      <span className="text-green-400 text-sm font-medium">
                        {creator.engagementRate.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Posts Preview */}
            {posts.length > 0 && (
              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Top Posts</h3>
                  <button
                    onClick={() => setViewMode('posts')}
                    className="text-sky-400 text-sm"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {posts.slice(0, 3).map((post) => (
                    <div key={post.id} className="aspect-[9/16] rounded-xl overflow-hidden relative bg-neutral-800">
                      {post.coverUrl ? (
                        <img
                          src={post.coverUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl">📹</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-xs font-medium">{formatNumber(post.viewCount)} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.totalCreators === 0 && (
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 text-center">
                <span className="text-4xl block mb-4">📊</span>
                <h3 className="text-lg font-semibold mb-2">Sin datos de analytics</h3>
                <p className="text-neutral-500 text-sm">
                  Acepta creadores para comenzar a ver metricas de sus contenidos
                </p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'creators' && (
          <div className="space-y-3">
            {creators.length === 0 ? (
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 text-center">
                <span className="text-4xl block mb-4">👥</span>
                <h3 className="text-lg font-semibold mb-2">Sin creadores</h3>
                <p className="text-neutral-500 text-sm">
                  Acepta creadores para verlos aqui
                </p>
              </div>
            ) : (
              creators.map((creator, index) => (
                <Link
                  key={creator.id}
                  href={`/company/creator/${creator.id}`}
                  className="block bg-neutral-900 rounded-2xl p-4 border border-neutral-800 hover:border-neutral-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-500 w-6">
                      #{index + 1}
                    </span>
                    {creator.avatar ? (
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold">
                        {creator.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{creator.name}</p>
                      {creator.tiktokUsername && (
                        <p className="text-xs text-neutral-500">@{creator.tiktokUsername}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-400">{creator.engagementRate.toFixed(1)}%</p>
                      <p className="text-xs text-neutral-500">engagement</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-neutral-800">
                    <div className="text-center">
                      <p className="font-semibold">{formatNumber(creator.totalViews)}</p>
                      <p className="text-xs text-neutral-500">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{formatNumber(creator.totalLikes)}</p>
                      <p className="text-xs text-neutral-500">Likes</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{formatNumber(creator.totalComments)}</p>
                      <p className="text-xs text-neutral-500">Comments</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{creator.videoCount}</p>
                      <p className="text-xs text-neutral-500">Posts</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {viewMode === 'posts' && (
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 text-center">
                <span className="text-4xl block mb-4">📱</span>
                <h3 className="text-lg font-semibold mb-2">Sin posts</h3>
                <p className="text-neutral-500 text-sm">
                  Los posts de tus creadores apareceran aqui
                </p>
              </div>
            ) : (
              posts.map((post, index) => (
                <div
                  key={post.id}
                  className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="w-24 h-32 flex-shrink-0 bg-neutral-800">
                      {post.coverUrl ? (
                        <img
                          src={post.coverUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl">📹</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-neutral-500">#{index + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          post.engagementRate >= 10 ? 'bg-green-500/20 text-green-400' :
                          post.engagementRate >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-neutral-700 text-neutral-400'
                        }`}>
                          {post.engagementRate.toFixed(1)}% eng
                        </span>
                      </div>

                      <p className="font-medium text-sm line-clamp-2 mb-1">{post.title}</p>
                      <p className="text-xs text-neutral-500 mb-2">
                        Por {post.creatorName} · {formatDate(post.createTime)}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-neutral-400">
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
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          {formatNumber(post.commentCount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
          <div className="flex flex-col items-center space-y-1 text-sky-500">
            <span className="text-lg">📈</span>
            <span className="text-xs font-medium">Analytics</span>
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
