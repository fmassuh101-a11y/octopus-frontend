'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AcceptAndMessageModal from '@/components/messaging/AcceptAndMessageModal'
import { MessageTemplate } from '@/lib/utils/messageTemplates'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface TikTokAccount {
  username: string
  displayName?: string
  avatarUrl?: string
  followers: number
  following?: number
  likes: number
  videoCount: number
  avgViews?: number
  engagementRate?: number
  isVerified?: boolean
}

interface CreatorProfile {
  user_id: string
  full_name: string
  avatar_url?: string
  firstName?: string
  lastName?: string
  email?: string
  about?: string
  city?: string
  country?: string
  niche?: string
  categories?: string[]
  tiktokAccounts?: TikTokAccount[]
  instagram?: string
  linkedin?: string
}

interface Application {
  id: string
  gig_id: string
  creator_id: string
  company_id: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  gig?: {
    title: string
    budget: string
    category: string
  }
  creator?: CreatorProfile
}

export default function ApplicantsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [user, setUser] = useState<any>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [applicationToAccept, setApplicationToAccept] = useState<Application | null>(null)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [companyName, setCompanyName] = useState('Mi Empresa')
  const [selectedCreator, setSelectedCreator] = useState<Application | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const userData = JSON.parse(userStr)
    setUser(userData)
    // Load everything in parallel for speed
    await Promise.all([
      loadApplications(userData.id, token),
      loadTemplates(token),
      loadCompanyName(userData.id, token)
    ])
  }

  const loadTemplates = async (token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/message_templates?select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (err) {
      console.error('Error loading templates:', err)
    }
  }

  const loadCompanyName = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=full_name`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        if (data[0]?.full_name) {
          setCompanyName(data[0].full_name)
        }
      }
    } catch (err) {
      console.error('Error loading company name:', err)
    }
  }

  const loadApplications = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const data = await response.json()

        if (data.length === 0) {
          setApplications([])
          return
        }

        // Collect unique IDs for batch fetching
        const gigIds = [...new Set(data.map((app: any) => app.gig_id).filter(Boolean))]
        const creatorIds = [...new Set(data.map((app: any) => app.creator_id).filter(Boolean))]

        // Fetch all gigs and creators in parallel (batch requests)
        const [gigsRes, creatorsRes] = await Promise.all([
          gigIds.length > 0 ? fetch(
            `${SUPABASE_URL}/rest/v1/gigs?id=in.(${gigIds.join(',')})&select=id,title,budget,category`,
            { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
          ) : Promise.resolve(null),
          creatorIds.length > 0 ? fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=*`,
            { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
          ) : Promise.resolve(null)
        ])

        // Parse responses
        const gigs = gigsRes && gigsRes.ok ? await gigsRes.json() : []
        const creators = creatorsRes && creatorsRes.ok ? await creatorsRes.json() : []

        // Create lookup maps for O(1) access
        const gigMap = new Map(gigs.map((g: any) => [g.id, g]))
        const creatorMap = new Map(creators.map((c: any) => {
          // Parse bio JSON to get full data
          let bioData: any = {}
          if (c.bio) {
            try {
              bioData = JSON.parse(c.bio)
            } catch (e) {
              // bio is plain text
            }
          }
          return [c.user_id, {
            user_id: c.user_id,
            full_name: c.full_name,
            avatar_url: c.avatar_url,
            firstName: bioData.firstName,
            lastName: bioData.lastName,
            email: bioData.email,
            about: bioData.about,
            city: bioData.city,
            country: bioData.country,
            niche: bioData.niche,
            categories: bioData.categories,
            tiktokAccounts: bioData.tiktokAccounts || [],
            instagram: bioData.instagram,
            linkedin: bioData.linkedin
          }]
        }))

        // Enrich applications with pre-fetched data (no more API calls)
        const enrichedApps = data.map((app: any) => ({
          ...app,
          gig: gigMap.get(app.gig_id) || null,
          creator: creatorMap.get(app.creator_id) || null
        }))

        setApplications(enrichedApps)
      }
    } catch (err) {
      console.error('Error loading applications:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId: string, status: 'accepted' | 'rejected') => {
    setUpdatingId(applicationId)
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ status })
        }
      )

      if (response.ok) {
        setApplications(prev =>
          prev.map(app =>
            app.id === applicationId ? { ...app, status } : app
          )
        )
      }
    } catch (err) {
      console.error('Error updating application:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const openAcceptModal = (app: Application) => {
    setApplicationToAccept(app)
    setShowAcceptModal(true)
  }

  const handleAcceptWithMessage = async (sendMessage: boolean, message: string) => {
    if (!applicationToAccept || !user) return

    setUpdatingId(applicationToAccept.id)
    try {
      const token = localStorage.getItem('sb-access-token')

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationToAccept.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ status: 'accepted' })
        }
      )

      if (response.ok) {
        if (sendMessage && message.trim()) {
          await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              conversation_id: applicationToAccept.id,
              sender_id: user.id,
              sender_type: 'company',
              content: message.trim()
            })
          })
        }

        setApplications(prev =>
          prev.map(app =>
            app.id === applicationToAccept.id ? { ...app, status: 'accepted' } : app
          )
        )
        setShowAcceptModal(false)
        setApplicationToAccept(null)
      }
    } catch (err) {
      console.error('Error accepting application:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Group applications by status
  const acceptedApps = applications.filter(a => a.status === 'accepted')
  const pendingApps = applications.filter(a => a.status === 'pending')
  const rejectedApps = applications.filter(a => a.status === 'rejected')

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays === 1) return 'ayer'
    if (diffDays < 7) return `hace ${diffDays}d`
    return created.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  const getCreatorName = (creator?: CreatorProfile) => {
    if (!creator) return 'Creador'
    if (creator.firstName && creator.lastName) return `${creator.firstName} ${creator.lastName}`
    return creator.full_name || 'Creador'
  }

  const getTotalFollowers = (creator?: CreatorProfile) => {
    if (!creator?.tiktokAccounts?.length) return 0
    return creator.tiktokAccounts.reduce((sum, acc) => sum + (acc.followers || 0), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicantes...</p>
        </div>
      </div>
    )
  }

  // Creator Card Component
  const CreatorCard = ({ app, showActions = true }: { app: Application, showActions?: boolean }) => {
    const creator = app.creator
    const tiktok = creator?.tiktokAccounts?.[0]

    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="p-4">
          {/* Creator Header - Clickable */}
          <button
            onClick={() => setSelectedCreator(app)}
            className="w-full text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              {tiktok?.avatarUrl || creator?.avatar_url ? (
                <img
                  src={tiktok?.avatarUrl || creator?.avatar_url}
                  alt={getCreatorName(creator)}
                  className="w-14 h-14 rounded-full object-cover border-2 border-purple-100"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {getCreatorName(creator).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{getCreatorName(creator)}</h3>
                  {tiktok?.isVerified && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {tiktok && (
                  <p className="text-sm text-gray-500">@{tiktok.username}</p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* TikTok Stats */}
          {tiktok && (
            <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-50 rounded-xl p-3">
              <div className="text-center">
                <div className="font-bold text-gray-900">{formatNumber(getTotalFollowers(creator))}</div>
                <div className="text-xs text-gray-500">Seguidores</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{formatNumber(tiktok.likes || 0)}</div>
                <div className="text-xs text-gray-500">Likes</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{tiktok.videoCount || 0}</div>
                <div className="text-xs text-gray-500">Videos</div>
              </div>
            </div>
          )}

          {/* Gig info and time */}
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              {app.gig?.category || 'Gig'}
            </span>
            <span className="text-gray-400 text-xs">{getTimeAgo(app.created_at)}</span>
          </div>

          {/* Actions */}
          {showActions && app.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                disabled={updatingId === app.id}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                Rechazar
              </button>
              <button
                onClick={() => openAcceptModal(app)}
                disabled={updatingId === app.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
              >
                Aceptar
              </button>
            </div>
          )}

          {app.status === 'accepted' && (
            <Link
              href={`/company/messages?creator=${app.creator_id}&application=${app.id}`}
              className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors text-sm"
            >
              Escribir a {creator?.firstName || getCreatorName(creator).split(' ')[0]}
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/company/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mis Creadores</h1>
              <p className="text-sm text-gray-500">{applications.length} aplicaciones totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* ACEPTADOS */}
        {acceptedApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900">Aceptados ({acceptedApps.length})</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {acceptedApps.map(app => (
                <CreatorCard key={app.id} app={app} showActions={false} />
              ))}
            </div>
          </section>
        )}

        {/* PENDIENTES */}
        {pendingApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-bold text-gray-900">Pendientes ({pendingApps.length})</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pendingApps.map(app => (
                <CreatorCard key={app.id} app={app} />
              ))}
            </div>
          </section>
        )}

        {/* RECHAZADOS */}
        {rejectedApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900">Rechazados ({rejectedApps.length})</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {rejectedApps.map(app => (
                <CreatorCard key={app.id} app={app} showActions={false} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {applications.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Sin aplicaciones</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Los creadores que apliquen a tus campanas apareceran aqui.
            </p>
            <Link
              href="/company/campaigns"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
            >
              Ver Mis Campanas
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <Link href="/company/dashboard" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium mt-1">Dashboard</span>
          </Link>
          <Link href="/company/campaigns" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium mt-1">Campanas</span>
          </Link>
          <Link href="/company/messages" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium mt-1">Mensajes</span>
          </Link>
          <div className="flex flex-col items-center py-2 px-4 text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="text-xs font-medium mt-1">Aplicantes</span>
          </div>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>

      {/* Creator Profile Modal */}
      {selectedCreator && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Perfil del Creador</h2>
              <button
                onClick={() => setSelectedCreator(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Profile Header */}
              <div className="text-center mb-6">
                {selectedCreator.creator?.tiktokAccounts?.[0]?.avatarUrl || selectedCreator.creator?.avatar_url ? (
                  <img
                    src={selectedCreator.creator?.tiktokAccounts?.[0]?.avatarUrl || selectedCreator.creator?.avatar_url}
                    alt={getCreatorName(selectedCreator.creator)}
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-purple-100"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-3xl">
                      {getCreatorName(selectedCreator.creator).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900">{getCreatorName(selectedCreator.creator)}</h3>
                {selectedCreator.creator?.city && selectedCreator.creator?.country && (
                  <p className="text-gray-500">{selectedCreator.creator.city}, {selectedCreator.creator.country}</p>
                )}
                {selectedCreator.creator?.niche && (
                  <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {selectedCreator.creator.niche}
                  </span>
                )}
              </div>

              {/* About */}
              {selectedCreator.creator?.about && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Acerca de</h4>
                  <p className="text-gray-600">{selectedCreator.creator.about}</p>
                </div>
              )}

              {/* TikTok Accounts */}
              {selectedCreator.creator?.tiktokAccounts && selectedCreator.creator.tiktokAccounts.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                    Cuentas de TikTok
                  </h4>
                  {selectedCreator.creator.tiktokAccounts.map((account, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3">
                      <div className="flex items-center gap-3 mb-3">
                        {account.avatarUrl && (
                          <img src={account.avatarUrl} alt={account.username} className="w-10 h-10 rounded-full" />
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">@{account.username}</span>
                            {account.isVerified && (
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          {account.displayName && (
                            <span className="text-sm text-gray-500">{account.displayName}</span>
                          )}
                        </div>
                        <a
                          href={`https://tiktok.com/@${account.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-purple-600 hover:text-purple-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="font-bold text-gray-900">{formatNumber(account.followers)}</div>
                          <div className="text-xs text-gray-500">Seguidores</div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{formatNumber(account.likes)}</div>
                          <div className="text-xs text-gray-500">Likes</div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{account.videoCount}</div>
                          <div className="text-xs text-gray-500">Videos</div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{account.engagementRate?.toFixed(1) || '0'}%</div>
                          <div className="text-xs text-gray-500">Engagement</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Application Info */}
              <div className="mb-6 bg-purple-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Aplico para:</h4>
                <p className="text-purple-700 font-medium">{selectedCreator.gig?.title}</p>
                <p className="text-sm text-gray-600">{selectedCreator.gig?.category} - {selectedCreator.gig?.budget}</p>
                {selectedCreator.message && (
                  <div className="mt-3 pt-3 border-t border-purple-100">
                    <p className="text-sm text-gray-600 font-medium">Mensaje:</p>
                    <p className="text-gray-700">{selectedCreator.message}</p>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {(selectedCreator.creator?.instagram || selectedCreator.creator?.linkedin) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Otras Redes</h4>
                  <div className="flex gap-3">
                    {selectedCreator.creator.instagram && (
                      <a
                        href={`https://instagram.com/${selectedCreator.creator.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium"
                      >
                        Instagram
                      </a>
                    )}
                    {selectedCreator.creator.linkedin && (
                      <a
                        href={selectedCreator.creator.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {selectedCreator.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        updateApplicationStatus(selectedCreator.id, 'rejected')
                        setSelectedCreator(null)
                      }}
                      className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCreator(null)
                        openAcceptModal(selectedCreator)
                      }}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                    >
                      Aceptar
                    </button>
                  </>
                )}
                {selectedCreator.status === 'accepted' && (
                  <Link
                    href={`/company/messages?creator=${selectedCreator.creator_id}&application=${selectedCreator.id}`}
                    className="flex-1 text-center px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                    onClick={() => setSelectedCreator(null)}
                  >
                    Escribir Mensaje
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && applicationToAccept && (
        <AcceptAndMessageModal
          creatorName={getCreatorName(applicationToAccept.creator)}
          gigTitle={applicationToAccept.gig?.title || 'Gig'}
          gigBudget={applicationToAccept.gig?.budget}
          gigCategory={applicationToAccept.gig?.category}
          companyName={companyName}
          templates={templates}
          onAccept={handleAcceptWithMessage}
          onCancel={() => {
            setShowAcceptModal(false)
            setApplicationToAccept(null)
          }}
          loading={updatingId === applicationToAccept.id}
        />
      )}
    </div>
  )
}
