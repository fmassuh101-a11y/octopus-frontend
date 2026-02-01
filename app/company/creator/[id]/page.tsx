'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface CreatorProfile {
  user_id: string
  full_name: string
  bio: any
  avatar_url?: string
  skills?: string[]
  experiences?: any[]
  created_at: string
}

interface TikTokAccount {
  username: string
  followerCount?: number
  followingCount?: number
  likesCount?: number
  videoCount?: number
  bio?: string
  avatarUrl?: string
  verified?: boolean
}

interface TikTokVideo {
  id: string
  title: string
  cover_url: string
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  create_time: number
}

interface Application {
  id: string
  gig_id: string
  status: string
  created_at: string
  bookmarked: boolean
  gig?: {
    title: string
    budget: string
  }
}

export default function CreatorProfilePage() {
  const router = useRouter()
  const params = useParams()
  const creatorId = params.id as string

  const [loading, setLoading] = useState(true)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [tiktokAccount, setTiktokAccount] = useState<TikTokAccount | null>(null)
  const [tiktokVideos, setTiktokVideos] = useState<TikTokVideo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'applications'>('overview')
  const [bookmarked, setBookmarked] = useState(false)

  const getToken = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    loadCreatorData()
  }, [creatorId])

  const loadCreatorData = async () => {
    const token = getToken()
    if (!token) {
      router.push('/auth/login')
      return
    }

    try {
      // Load creator profile
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${creatorId}&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (profileRes.ok) {
        const profiles = await profileRes.json()
        if (profiles.length > 0) {
          const profile = profiles[0]
          // Parse bio if it's a JSON string
          if (profile.bio && typeof profile.bio === 'string') {
            try {
              profile.bio = JSON.parse(profile.bio)
            } catch (e) {
              profile.bio = { about: profile.bio }
            }
          }
          setCreator(profile)

          // Extract TikTok account from bio
          if (profile.bio?.tiktokAccounts && profile.bio.tiktokAccounts.length > 0) {
            const tiktok = profile.bio.tiktokAccounts[0]
            setTiktokAccount({
              username: tiktok.username || tiktok.handle,
              followerCount: tiktok.followerCount || tiktok.metrics?.followerCount,
              followingCount: tiktok.followingCount || tiktok.metrics?.followingCount,
              likesCount: tiktok.likesCount || tiktok.metrics?.likesCount,
              videoCount: tiktok.videoCount || tiktok.metrics?.videoCount,
              bio: tiktok.bio || tiktok.displayName,
              avatarUrl: tiktok.avatarUrl || tiktok.avatar,
              verified: tiktok.verified
            })
          }

          // Check if any TikTok data in tiktok_data table
          const tiktokRes = await fetch(
            `${SUPABASE_URL}/rest/v1/tiktok_data?user_id=eq.${creatorId}&select=*&order=created_at.desc&limit=1`,
            { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
          )
          if (tiktokRes.ok) {
            const tiktokData = await tiktokRes.json()
            if (tiktokData.length > 0 && tiktokData[0].videos) {
              setTiktokVideos(tiktokData[0].videos.slice(0, 6))
            }
          }
        }
      }

      // Load applications from this creator
      const userStr = localStorage.getItem('sb-user')
      if (userStr) {
        const user = JSON.parse(userStr)
        const appsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${creatorId}&company_id=eq.${user.id}&select=*,gig:gigs(title,budget)`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (appsRes.ok) {
          const apps = await appsRes.json()
          setApplications(apps)
          // Check if any application is bookmarked
          setBookmarked(apps.some((a: Application) => a.bookmarked))
        }
      }

    } catch (err) {
      console.error('Error loading creator:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleBookmark = async () => {
    const token = getToken()
    if (!token || applications.length === 0) return

    const newBookmarked = !bookmarked
    setBookmarked(newBookmarked)

    // Update all applications from this creator
    for (const app of applications) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${app.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ bookmarked: newBookmarked })
        }
      )
    }
  }

  const handleSendMessage = () => {
    router.push(`/company/messages?creator=${creatorId}`)
  }

  const handleAccept = async (applicationId: string) => {
    const token = getToken()
    if (!token) return

    await fetch(
      `${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'accepted' })
      }
    )

    setApplications(prev => prev.map(a =>
      a.id === applicationId ? { ...a, status: 'accepted' } : a
    ))
  }

  const handleDecline = async (applicationId: string) => {
    const token = getToken()
    if (!token) return

    await fetch(
      `${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected' })
      }
    )

    setApplications(prev => prev.map(a =>
      a.id === applicationId ? { ...a, status: 'rejected' } : a
    ))
  }

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getCreatorName = () => {
    if (!creator) return 'Creador'
    if (creator.bio?.firstName && creator.bio?.lastName) {
      return `${creator.bio.firstName} ${creator.bio.lastName}`
    }
    return creator.full_name || 'Creador'
  }

  const getCreatorLocation = () => {
    if (!creator?.bio) return null
    if (creator.bio.city && creator.bio.country) {
      return `${creator.bio.city}, ${creator.bio.country}`
    }
    return creator.bio.location || creator.bio.country || null
  }

  const getCreatorBio = () => {
    if (!creator?.bio) return null
    return creator.bio.about || creator.bio.description || null
  }

  const getSkills = () => {
    if (creator?.skills && creator.skills.length > 0) return creator.skills
    if (creator?.bio?.skills) return creator.bio.skills
    if (creator?.bio?.interests) return creator.bio.interests
    return []
  }

  const getAvatar = () => {
    if (creator?.avatar_url) return creator.avatar_url
    if (tiktokAccount?.avatarUrl) return tiktokAccount.avatarUrl
    if (creator?.bio?.avatarUrl) return creator.bio.avatarUrl
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Creador no encontrado</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/50 to-neutral-950 pt-4 pb-8">
        <div className="px-4">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-neutral-800/50 backdrop-blur rounded-full flex items-center justify-center mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Profile Header */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {getAvatar() ? (
                <img
                  src={getAvatar()!}
                  alt={getCreatorName()}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-purple-500/50"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold">
                  {getCreatorName().charAt(0).toUpperCase()}
                </div>
              )}
              {tiktokAccount?.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{getCreatorName()}</h1>
              {getCreatorLocation() && (
                <p className="text-neutral-400 text-sm flex items-center gap-1 mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {getCreatorLocation()}
                </p>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-lg transition ${
                    bookmarked
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button
                  onClick={handleSendMessage}
                  className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Mensaje
                </button>
              </div>
            </div>
          </div>

          {/* Bio */}
          {getCreatorBio() && (
            <p className="text-neutral-300 mt-4 text-sm leading-relaxed">
              {getCreatorBio()}
            </p>
          )}
        </div>
      </div>

      {/* Social Profiles */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold mb-3">Redes Sociales</h2>
        <div className="space-y-3">
          {/* TikTok */}
          {tiktokAccount && (
            <a
              href={`https://tiktok.com/@${tiktokAccount.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-neutral-900 rounded-2xl p-4 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">TikTok</span>
                    {tiktokAccount.verified && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-neutral-400 text-sm">@{tiktokAccount.username}</p>
                </div>
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>

              {/* TikTok Stats */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-neutral-800">
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(tiktokAccount.followerCount)}</p>
                  <p className="text-xs text-neutral-500">Seguidores</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(tiktokAccount.followingCount)}</p>
                  <p className="text-xs text-neutral-500">Siguiendo</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(tiktokAccount.likesCount)}</p>
                  <p className="text-xs text-neutral-500">Likes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(tiktokAccount.videoCount)}</p>
                  <p className="text-xs text-neutral-500">Videos</p>
                </div>
              </div>
            </a>
          )}

          {/* Instagram */}
          {creator.bio?.instagram && (
            <a
              href={`https://instagram.com/${creator.bio.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-neutral-900 rounded-2xl p-4 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-semibold">Instagram</span>
                  <p className="text-neutral-400 text-sm">@{creator.bio.instagram}</p>
                </div>
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          )}

          {/* LinkedIn */}
          {creator.bio?.linkedin && (
            <a
              href={creator.bio.linkedin.startsWith('http') ? creator.bio.linkedin : `https://linkedin.com/in/${creator.bio.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-neutral-900 rounded-2xl p-4 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-semibold">LinkedIn</span>
                  <p className="text-neutral-400 text-sm">Ver perfil profesional</p>
                </div>
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          )}

          {!tiktokAccount && !creator.bio?.instagram && !creator.bio?.linkedin && (
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-center">
              <p className="text-neutral-500">No hay redes sociales conectadas</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Posts */}
      {tiktokVideos.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold mb-3">Top Videos</h2>
          <div className="grid grid-cols-3 gap-2">
            {tiktokVideos.map((video) => (
              <div
                key={video.id}
                className="aspect-[9/16] rounded-xl overflow-hidden relative bg-neutral-800 group"
              >
                {video.cover_url && (
                  <img
                    src={video.cover_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {formatNumber(video.view_count)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {getSkills().length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold mb-3">Skills & Intereses</h2>
          <div className="flex flex-wrap gap-2">
            {getSkills().map((skill: string, index: number) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {creator.bio?.experiences && creator.bio.experiences.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold mb-3">Experiencia</h2>
          <div className="space-y-3">
            {creator.bio.experiences.map((exp: any, index: number) => (
              <div key={index} className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
                <h3 className="font-medium">{exp.title || exp.role}</h3>
                <p className="text-neutral-400 text-sm">{exp.company || exp.platform}</p>
                {exp.duration && (
                  <p className="text-neutral-500 text-xs mt-1">{exp.duration}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications from this creator */}
      {applications.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold mb-3">Aplicaciones</h2>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{app.gig?.title || 'Gig'}</h3>
                    <p className="text-neutral-400 text-sm">{app.gig?.budget}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                    app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {app.status === 'accepted' ? 'Aceptado' :
                     app.status === 'rejected' ? 'Rechazado' :
                     'Pendiente'}
                  </span>
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAccept(app.id)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleDecline(app.id)}
                      className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium transition"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Rate Card */}
      {tiktokAccount && tiktokAccount.followerCount && tiktokAccount.likesCount && (
        <div className="px-4 py-4">
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-5 border border-purple-500/30">
            <h3 className="font-semibold mb-2">Engagement Estimado</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">
                {((tiktokAccount.likesCount / Math.max(tiktokAccount.followerCount, 1)) * 100).toFixed(1)}%
              </span>
              <span className="text-neutral-400 mb-1">likes/follower ratio</span>
            </div>
            <p className="text-neutral-400 text-sm mt-2">
              Basado en {formatNumber(tiktokAccount.likesCount)} likes totales y {formatNumber(tiktokAccount.followerCount)} seguidores
            </p>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4">
        <div className="flex gap-3">
          <button
            onClick={toggleBookmark}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
              bookmarked
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            <svg className="w-6 h-6" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button
            onClick={handleSendMessage}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Enviar Mensaje
          </button>
        </div>
      </div>
    </div>
  )
}
