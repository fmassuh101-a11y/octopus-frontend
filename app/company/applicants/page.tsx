'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AcceptAndMessageModal from '@/components/messaging/AcceptAndMessageModal'
import { MessageTemplate } from '@/lib/utils/messageTemplates'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

type TabType = 'new' | 'reviewed' | 'messaged' | 'declined' | 'bookmarked' | 'accepted'

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
  bookmarked?: boolean
  reviewed_at?: string
  messaged_at?: string
  gig?: {
    id: string
    title: string
    budget: string
    category: string
  }
  creator?: CreatorProfile
}

interface Gig {
  id: string
  title: string
  budget: string
  category: string
}

export default function ApplicantsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [gigs, setGigs] = useState<Gig[]>([])
  const [user, setUser] = useState<any>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [applicationToAccept, setApplicationToAccept] = useState<Application | null>(null)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [companyName, setCompanyName] = useState('Mi Empresa')
  const [selectedCreator, setSelectedCreator] = useState<Application | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('new')
  const [selectedGigId, setSelectedGigId] = useState<string>('all')

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
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (response.ok) {
        setTemplates(await response.json())
      }
    } catch (err) {
      console.error('Error loading templates:', err)
    }
  }

  const loadCompanyName = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=full_name`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (response.ok) {
        const data = await response.json()
        if (data[0]?.full_name) setCompanyName(data[0].full_name)
      }
    } catch (err) {
      console.error('Error loading company name:', err)
    }
  }

  const loadApplications = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&select=*&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (response.ok) {
        const data = await response.json()

        if (data.length === 0) {
          setApplications([])
          setLoading(false)
          return
        }

        const gigIds = Array.from(new Set(data.map((app: any) => app.gig_id).filter(Boolean)))
        const creatorIds = Array.from(new Set(data.map((app: any) => app.creator_id).filter(Boolean)))

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

        const gigsData = gigsRes && gigsRes.ok ? await gigsRes.json() : []
        const creators = creatorsRes && creatorsRes.ok ? await creatorsRes.json() : []

        setGigs(gigsData)

        const gigMap = new Map(gigsData.map((g: any) => [g.id, g]))
        const creatorMap = new Map(creators.map((c: any) => {
          let bioData: any = {}
          if (c.bio) {
            try { bioData = JSON.parse(c.bio) } catch (e) {}
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

  // Update application fields
  const updateApplication = async (appId: string, updates: Partial<Application>) => {
    const token = localStorage.getItem('sb-access-token')
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${appId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updates)
        }
      )
      if (response.ok) {
        setApplications(prev => prev.map(app =>
          app.id === appId ? { ...app, ...updates } : app
        ))
        return true
      }
    } catch (err) {
      console.error('Error updating application:', err)
    }
    return false
  }

  // Mark as reviewed when viewing profile
  const handleViewProfile = async (app: Application) => {
    if (!app.reviewed_at && app.status === 'pending') {
      await updateApplication(app.id, { reviewed_at: new Date().toISOString() })
    }
    setSelectedCreator(app)
  }

  // Toggle bookmark
  const handleToggleBookmark = async (app: Application, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdatingId(app.id)
    await updateApplication(app.id, { bookmarked: !app.bookmarked })
    setUpdatingId(null)
  }

  // Decline
  const handleDecline = async (app: Application, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setUpdatingId(app.id)
    await updateApplication(app.id, { status: 'rejected' })
    setUpdatingId(null)
    if (selectedCreator?.id === app.id) setSelectedCreator(null)
  }

  // Send message (opens modal or goes to messages)
  const handleSendMessage = async (app: Application, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (app.status === 'accepted') {
      // Already accepted, go to messages
      router.push(`/company/messages?creator=${app.creator_id}&application=${app.id}`)
    } else {
      // Not accepted yet, open accept modal
      setApplicationToAccept(app)
      setShowAcceptModal(true)
    }
    // Mark as messaged will happen when message is actually sent
  }

  const handleAcceptWithMessage = async (sendMessage: boolean, message: string) => {
    if (!applicationToAccept || !user) return

    setUpdatingId(applicationToAccept.id)
    const token = localStorage.getItem('sb-access-token')

    try {
      // Update status to accepted
      const updates: any = { status: 'accepted' }
      if (sendMessage && message.trim()) {
        updates.messaged_at = new Date().toISOString()
      }

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
          body: JSON.stringify(updates)
        }
      )

      if (response.ok) {
        // Send message if needed
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

        setApplications(prev => prev.map(app =>
          app.id === applicationToAccept.id ? { ...app, ...updates } : app
        ))
        setShowAcceptModal(false)
        setApplicationToAccept(null)
      }
    } catch (err) {
      console.error('Error accepting application:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter applications by tab
  const getFilteredApplications = () => {
    let filtered = applications

    // Filter by gig
    if (selectedGigId !== 'all') {
      filtered = filtered.filter(a => a.gig_id === selectedGigId)
    }

    // Filter by tab
    switch (activeTab) {
      case 'new':
        return filtered.filter(a => a.status === 'pending' && !a.reviewed_at)
      case 'reviewed':
        return filtered.filter(a => a.status === 'pending' && a.reviewed_at && !a.messaged_at)
      case 'messaged':
        return filtered.filter(a => a.messaged_at && a.status !== 'rejected')
      case 'declined':
        return filtered.filter(a => a.status === 'rejected')
      case 'bookmarked':
        return filtered.filter(a => a.bookmarked)
      case 'accepted':
        return filtered.filter(a => a.status === 'accepted')
      default:
        return filtered
    }
  }

  // Count for tabs
  const getCounts = () => {
    const filtered = selectedGigId === 'all' ? applications : applications.filter(a => a.gig_id === selectedGigId)
    return {
      new: filtered.filter(a => a.status === 'pending' && !a.reviewed_at).length,
      reviewed: filtered.filter(a => a.status === 'pending' && a.reviewed_at && !a.messaged_at).length,
      messaged: filtered.filter(a => a.messaged_at && a.status !== 'rejected').length,
      declined: filtered.filter(a => a.status === 'rejected').length,
      bookmarked: filtered.filter(a => a.bookmarked).length,
      accepted: filtered.filter(a => a.status === 'accepted').length,
    }
  }

  const counts = getCounts()
  const filteredApps = getFilteredApplications()

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

    if (diffMins < 60) return `hace ${diffMins}m`
    if (diffHours < 24) return `hace ${diffHours}h`
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

  // Tab Button Component
  const TabButton = ({ tab, label, count }: { tab: TabType, label: string, count: number }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
        activeTab === tab
          ? 'text-purple-600 border-b-2 border-purple-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          activeTab === tab ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  )

  // Applicant Card Component (Sideshift style)
  const ApplicantCard = ({ app }: { app: Application }) => {
    const creator = app.creator
    const tiktok = creator?.tiktokAccounts?.[0]
    const isUpdating = updatingId === app.id

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Aplico {getTimeAgo(app.created_at)}
          </div>
          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {creator?.instagram && (
              <a href={`https://instagram.com/${(creator.instagram || '').replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {tiktok && (
              <a href={`https://tiktok.com/@${(tiktok.username || '').replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </a>
            )}
            {creator?.linkedin && (
              <a href={creator.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            )}
          </div>
        </div>

        {/* Profile Section - Clickable */}
        <button onClick={() => handleViewProfile(app)} className="w-full text-left mb-4">
          <div className="flex items-center gap-3">
            {tiktok?.avatarUrl || creator?.avatar_url ? (
              <img
                src={tiktok?.avatarUrl || creator?.avatar_url}
                alt={getCreatorName(creator)}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{getCreatorName(creator).charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{getCreatorName(creator)}</h3>
                {tiktok?.isVerified && (
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate">
                {creator?.city && creator?.country ? `${creator.city}, ${creator.country}` : tiktok ? `@${tiktok.username}` : ''}
              </p>
            </div>
          </div>
        </button>

        {/* Bio/About */}
        {creator?.about && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{creator.about}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {creator?.niche && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{creator.niche}</span>
          )}
          {tiktok && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{formatNumber(getTotalFollowers(creator))} seguidores</span>
          )}
          {app.gig && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{app.gig.category}</span>
          )}
        </div>

        {/* Action Buttons - Sideshift Style */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {/* Eye - View Profile */}
            <button
              onClick={() => handleViewProfile(app)}
              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              title="Ver perfil"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            {/* Bookmark */}
            <button
              onClick={(e) => handleToggleBookmark(app, e)}
              disabled={isUpdating}
              className={`p-2 rounded-full border transition-colors ${
                app.bookmarked
                  ? 'border-purple-300 bg-purple-50 text-purple-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
              title={app.bookmarked ? 'Quitar bookmark' : 'Guardar'}
            >
              <svg className="w-5 h-5" fill={app.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Send Message */}
            {app.status !== 'rejected' && (
              <button
                onClick={(e) => handleSendMessage(app, e)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {app.status === 'accepted' ? 'Mensaje' : 'Aceptar'}
              </button>
            )}
            {/* Decline */}
            {app.status === 'pending' && (
              <button
                onClick={(e) => handleDecline(app, e)}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rechazar
              </button>
            )}
            {/* Already declined */}
            {app.status === 'rejected' && (
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rechazado
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/company/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Aplicantes</h1>
                <p className="text-sm text-gray-500">Gestiona las aplicaciones a tus trabajos</p>
              </div>
            </div>
            {/* Job Filter */}
            <select
              value={selectedGigId}
              onChange={(e) => setSelectedGigId(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos los trabajos</option>
              {gigs.map(gig => (
                <option key={gig.id} value={gig.id}>{gig.title}</option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-gray-200 -mb-px">
            <TabButton tab="new" label="Nuevos" count={counts.new} />
            <TabButton tab="reviewed" label="Revisados" count={counts.reviewed} />
            <TabButton tab="messaged" label="Contactados" count={counts.messaged} />
            <TabButton tab="accepted" label="Aceptados" count={counts.accepted} />
            <TabButton tab="declined" label="Rechazados" count={counts.declined} />
            <TabButton tab="bookmarked" label="Guardados" count={counts.bookmarked} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {filteredApps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Sin aplicantes</h3>
            <p className="text-gray-500 text-sm">
              {activeTab === 'new' && 'Los nuevos aplicantes apareceran aqui'}
              {activeTab === 'reviewed' && 'Los aplicantes que hayas revisado apareceran aqui'}
              {activeTab === 'messaged' && 'Los aplicantes que hayas contactado apareceran aqui'}
              {activeTab === 'accepted' && 'Los aplicantes aceptados apareceran aqui'}
              {activeTab === 'declined' && 'Los aplicantes rechazados apareceran aqui'}
              {activeTab === 'bookmarked' && 'Guarda aplicantes para verlos despues'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Mostrando {filteredApps.length} de {applications.length} aplicantes
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredApps.map(app => (
                <ApplicantCard key={app.id} app={app} />
              ))}
            </div>
          </>
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
            <span className="text-xs font-medium mt-1">Trabajos</span>
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
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
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

              {/* Social Profiles */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Redes Sociales</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedCreator.creator?.tiktokAccounts?.[0] && (
                    <a
                      href={`https://tiktok.com/@${(selectedCreator.creator.tiktokAccounts[0].username || '').replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                      <div className="text-left">
                        <p className="text-xs opacity-70">TikTok</p>
                        <p className="font-medium text-sm">@{selectedCreator.creator.tiktokAccounts[0].username}</p>
                      </div>
                    </a>
                  )}
                  {selectedCreator.creator?.instagram && (
                    <a
                      href={`https://instagram.com/${(selectedCreator.creator.instagram || '').replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      <div className="text-left">
                        <p className="text-xs opacity-70">Instagram</p>
                        <p className="font-medium text-sm">@{selectedCreator.creator.instagram}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* TikTok Stats */}
              {selectedCreator.creator?.tiktokAccounts?.[0] && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Estadisticas TikTok</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="font-bold text-lg text-gray-900">{formatNumber(selectedCreator.creator.tiktokAccounts[0].followers)}</p>
                      <p className="text-xs text-gray-500">Seguidores</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="font-bold text-lg text-gray-900">{formatNumber(selectedCreator.creator.tiktokAccounts[0].likes)}</p>
                      <p className="text-xs text-gray-500">Likes</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="font-bold text-lg text-gray-900">{selectedCreator.creator.tiktokAccounts[0].videoCount}</p>
                      <p className="text-xs text-gray-500">Videos</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="font-bold text-lg text-gray-900">{selectedCreator.creator.tiktokAccounts[0].engagementRate?.toFixed(1) || '0'}%</p>
                      <p className="text-xs text-gray-500">Engage</p>
                    </div>
                  </div>
                </div>
              )}

              {/* About */}
              {selectedCreator.creator?.about && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Acerca de</h4>
                  <p className="text-gray-600">{selectedCreator.creator.about}</p>
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

              {/* Actions */}
              <div className="flex gap-3">
                {selectedCreator.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleDecline(selectedCreator)
                        setSelectedCreator(null)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Rechazar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCreator(null)
                        setApplicationToAccept(selectedCreator)
                        setShowAcceptModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Aceptar
                    </button>
                  </>
                )}
                {selectedCreator.status === 'accepted' && (
                  <Link
                    href={`/company/messages?creator=${selectedCreator.creator_id}&application=${selectedCreator.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                    onClick={() => setSelectedCreator(null)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Enviar Mensaje
                  </Link>
                )}
                {selectedCreator.status === 'rejected' && (
                  <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazado
                  </div>
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
