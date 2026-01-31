'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface TalentCreator {
  id: string
  handle: string
  displayName: string
  avatarUrl?: string
  followers?: number
  engagementRate?: number
  avgViews?: number
  avgLikes?: number
  avgComments?: number
  videoCount?: number
  totalLikes?: number
  recentVideos?: any[]
  addedAt: string
  notes?: string
  status: 'active' | 'completed' | 'pending'
  gigsCount: number
  isVerified?: boolean
  linkedToProfile?: boolean // true if matches a registered creator
}

export default function CompanyAnalyticsPage() {
  const router = useRouter()
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

  // New states for "Mi Talento" feature
  const [activeTab, setActiveTab] = useState<'discover' | 'talent'>('talent')
  const [myTalent, setMyTalent] = useState<TalentCreator[]>([])
  const [showAddTalentModal, setShowAddTalentModal] = useState(false)
  const [newTalentHandle, setNewTalentHandle] = useState('')
  const [newTalentName, setNewTalentName] = useState('')
  const [newTalentNotes, setNewTalentNotes] = useState('')
  const [addingTalent, setAddingTalent] = useState(false)

  useEffect(() => {
    loadCreators()
    loadSavedCreators()
    loadMyTalent()
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

      // Use API route to fetch creators (bypasses RLS)
      const response = await fetch('/api/creators')

      if (response.ok) {
        const data = await response.json()
        setCreators(data.creators || [])
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

  const loadMyTalent = () => {
    const talent = localStorage.getItem('octopus_my_talent')
    if (talent) {
      setMyTalent(JSON.parse(talent))
    }
  }

  const saveMyTalent = (talent: TalentCreator[]) => {
    localStorage.setItem('octopus_my_talent', JSON.stringify(talent))
    setMyTalent(talent)
  }

  const handleAddTalent = () => {
    if (!newTalentHandle.trim()) return

    setAddingTalent(true)

    // Clean handle (remove @ if present)
    const cleanHandle = newTalentHandle.trim().replace(/^@/, '')

    // Check if already exists
    if (myTalent.some(t => t.handle.toLowerCase() === cleanHandle.toLowerCase())) {
      alert('Este creador ya esta en tu lista de talento')
      setAddingTalent(false)
      return
    }

    // Check if this handle matches a registered creator on the platform
    const matchedCreator = creators.find(c =>
      c.username.toLowerCase() === cleanHandle.toLowerCase()
    )

    // Create new talent entry with data from matched creator if found
    const newTalent: TalentCreator = {
      id: `talent_${Date.now()}`,
      handle: cleanHandle,
      displayName: matchedCreator?.displayName || newTalentName.trim() || cleanHandle,
      avatarUrl: matchedCreator?.avatarUrl || undefined,
      followers: matchedCreator?.followers,
      engagementRate: matchedCreator?.engagementRate,
      avgViews: matchedCreator?.avgViews,
      avgLikes: matchedCreator?.avgLikes,
      avgComments: matchedCreator?.avgComments,
      videoCount: matchedCreator?.videoCount,
      totalLikes: matchedCreator?.likes,
      recentVideos: matchedCreator?.recentVideos,
      addedAt: new Date().toISOString(),
      notes: newTalentNotes.trim() || undefined,
      status: 'active',
      gigsCount: 0,
      isVerified: matchedCreator?.isVerified,
      linkedToProfile: !!matchedCreator
    }

    // Save
    const updatedTalent = [newTalent, ...myTalent]
    saveMyTalent(updatedTalent)

    // Reset form
    setNewTalentHandle('')
    setNewTalentName('')
    setNewTalentNotes('')
    setShowAddTalentModal(false)
    setAddingTalent(false)
  }

  // Function to refresh talent data from platform creators
  const refreshTalentData = () => {
    const updatedTalent = myTalent.map(talent => {
      const matchedCreator = creators.find(c =>
        c.username.toLowerCase() === talent.handle.toLowerCase()
      )

      if (matchedCreator) {
        return {
          ...talent,
          displayName: matchedCreator.displayName,
          avatarUrl: matchedCreator.avatarUrl || undefined,
          followers: matchedCreator.followers,
          engagementRate: matchedCreator.engagementRate,
          avgViews: matchedCreator.avgViews,
          avgLikes: matchedCreator.avgLikes,
          avgComments: matchedCreator.avgComments,
          videoCount: matchedCreator.videoCount,
          totalLikes: matchedCreator.likes,
          recentVideos: matchedCreator.recentVideos,
          isVerified: matchedCreator.isVerified,
          linkedToProfile: true
        }
      }
      return talent
    })

    saveMyTalent(updatedTalent)
  }

  // Refresh talent data when creators are loaded
  useEffect(() => {
    if (creators.length > 0 && myTalent.length > 0) {
      refreshTalentData()
    }
  }, [creators])

  const handleRemoveTalent = (talentId: string) => {
    if (!confirm('Seguro que quieres eliminar este creador de tu lista?')) return
    const updatedTalent = myTalent.filter(t => t.id !== talentId)
    saveMyTalent(updatedTalent)
  }

  const handleUpdateTalentStatus = (talentId: string, status: TalentCreator['status']) => {
    const updatedTalent = myTalent.map(t =>
      t.id === talentId ? { ...t, status } : t
    )
    saveMyTalent(updatedTalent)
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
                <h1 className="text-2xl font-bold text-gray-900">Creadores</h1>
                <p className="text-sm text-gray-500">
                  Gestiona y descubre talento para tu marca
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'talent' && (
                <button
                  onClick={() => setShowAddTalentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Creador
                </button>
              )}
              {compareList.length > 0 && activeTab === 'discover' && (
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

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 rounded-xl p-1 max-w-md">
            <button
              onClick={() => setActiveTab('talent')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
                activeTab === 'talent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Mi Talento
              {myTalent.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                  {myTalent.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
                activeTab === 'discover'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Descubrir
            </button>
          </div>
        </div>
      </div>

      {/* Add Talent Modal */}
      {showAddTalentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddTalentModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Agregar Creador</h2>
              <button onClick={() => setShowAddTalentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handle de TikTok *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                  <input
                    type="text"
                    value={newTalentHandle}
                    onChange={(e) => setNewTalentHandle(e.target.value)}
                    placeholder="username"
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={newTalentName}
                  onChange={(e) => setNewTalentName(e.target.value)}
                  placeholder="Nombre del creador"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={newTalentNotes}
                  onChange={(e) => setNewTalentNotes(e.target.value)}
                  placeholder="Ej: Campana de verano 2024, contrato firmado..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTalentModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTalent}
                disabled={!newTalentHandle.trim() || addingTalent}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingTalent ? 'Agregando...' : 'Agregar Creador'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 lg:pb-6">
        {/* Mi Talento Tab */}
        {activeTab === 'talent' && (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{myTalent.length}</p>
                    <p className="text-sm text-gray-500">Total Creadores</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {myTalent.filter(t => t.status === 'active').length}
                    </p>
                    <p className="text-sm text-gray-500">Activos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {myTalent.reduce((sum, t) => sum + t.gigsCount, 0)}
                    </p>
                    <p className="text-sm text-gray-500">Gigs Totales</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Talent List */}
            {myTalent.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Tu Equipo de Creadores</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {myTalent.map((talent) => (
                    <div key={talent.id} className="p-5 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          {talent.avatarUrl ? (
                            <img
                              src={talent.avatarUrl}
                              alt={talent.displayName}
                              className="w-16 h-16 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                              {talent.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900">{talent.displayName}</h4>
                              {talent.isVerified && (
                                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                talent.status === 'active' ? 'bg-green-100 text-green-700' :
                                talent.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {talent.status === 'active' ? 'Activo' :
                                 talent.status === 'completed' ? 'Completado' : 'Pendiente'}
                              </span>
                              {talent.linkedToProfile && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  En Plataforma
                                </span>
                              )}
                            </div>
                            <a
                              href={`https://tiktok.com/@${talent.handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              @{talent.handle}
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>

                            {/* Metrics - Show if linked to platform */}
                            {talent.linkedToProfile && talent.followers ? (
                              <div className="flex flex-wrap gap-4 mt-3">
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-900">{formatNumber(talent.followers)}</span>
                                  <span className="text-xs text-gray-500">seguidores</span>
                                </div>
                                {talent.engagementRate && (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                    <span className={`text-sm font-medium ${
                                      talent.engagementRate >= 6 ? 'text-green-600' :
                                      talent.engagementRate >= 3 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>{talent.engagementRate}%</span>
                                    <span className="text-xs text-gray-500">engagement</span>
                                  </div>
                                )}
                                {talent.avgViews && (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-900">{formatNumber(talent.avgViews)}</span>
                                    <span className="text-xs text-gray-500">views prom.</span>
                                  </div>
                                )}
                                {talent.avgLikes && (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-900">{formatNumber(talent.avgLikes)}</span>
                                    <span className="text-xs text-gray-500">likes prom.</span>
                                  </div>
                                )}
                              </div>
                            ) : !talent.linkedToProfile && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Este creador aun no esta registrado en Octopus</span>
                              </div>
                            )}

                            {talent.notes && (
                              <p className="text-xs text-gray-500 mt-2 bg-gray-50 px-2 py-1 rounded inline-block">{talent.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Status Dropdown */}
                          <select
                            value={talent.status}
                            onChange={(e) => handleUpdateTalentStatus(talent.id, e.target.value as TalentCreator['status'])}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active">Activo</option>
                            <option value="pending">Pendiente</option>
                            <option value="completed">Completado</option>
                          </select>

                          {/* View TikTok */}
                          <a
                            href={`https://tiktok.com/@${talent.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition"
                            title="Ver TikTok"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                          </a>

                          {/* Delete */}
                          <button
                            onClick={() => handleRemoveTalent(talent.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aun no tienes creadores
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Agrega creadores por su @handle de TikTok para hacer seguimiento de tu equipo de talento.
                </p>
                <button
                  onClick={() => setShowAddTalentModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Primer Creador
                </button>
              </div>
            )}
          </>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <>
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
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around py-2">
          <Link href="/company/dashboard" className="flex flex-col items-center p-2 text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Inicio</span>
          </Link>
          <Link href="/company/recruit" className="flex flex-col items-center p-2 text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs mt-1">Buscar</span>
          </Link>
          <Link href="/company/analytics" className="flex flex-col items-center p-2 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1">Analytics</span>
          </Link>
          <button onClick={() => router.push('/company/profile')} className="flex flex-col items-center p-2 text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </div>
    </div>
  )
}
