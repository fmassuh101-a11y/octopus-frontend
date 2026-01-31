'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

export default function GigsPage() {
  const [loading, setLoading] = useState(true)
  const [gigs, setGigs] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadGigs()
  }, [])

  const loadGigs = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')

      // Fetch gigs from database
      const response = await fetch(`${SUPABASE_URL}/rest/v1/gigs?select=*&status=eq.active&order=created_at.desc`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setGigs(data)
      } else {
        // Table might not exist yet, that's ok
        setGigs([])
      }
    } catch (err) {
      console.error('Error loading gigs:', err)
      setGigs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredGigs = gigs.filter(gig => {
    const matchesFilter = filter === 'all' || gig.platform?.toLowerCase() === filter
    const matchesSearch = !searchQuery ||
      gig.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.category?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getPlatformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok': return 'bg-black text-white'
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      case 'youtube': return 'bg-red-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando trabajos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Trabajos Disponibles</h1>
              <p className="text-sm text-gray-500">{filteredGigs.length} oportunidades</p>
            </div>
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar trabajos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'tiktok', 'instagram', 'youtube'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gigs List */}
      <div className="px-4 py-6 pb-24">
        {filteredGigs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No hay trabajos disponibles</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Las empresas publicaran oportunidades muy pronto. Mientras tanto, completa tu perfil para estar listo.
            </p>
            <Link
              href="/creator/profile"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Completar Mi Perfil
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGigs.map((gig) => (
              <div key={gig.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {gig.company_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{gig.title}</h3>
                      <p className="text-sm text-gray-500">{gig.company_name}</p>
                    </div>
                  </div>
                  {gig.platform && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(gig.platform)}`}>
                      {gig.platform}
                    </span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4">{gig.description}</p>

                {gig.requirements && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {gig.requirements.map((req: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {req}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div>
                      {gig.budget?.includes('CPM') ? (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 font-bold rounded-full text-sm">
                          {gig.budget}
                        </span>
                      ) : gig.budget?.includes('/hora') ? (
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 font-bold rounded-full text-sm">
                          {gig.budget}
                        </span>
                      ) : (
                        <p className="text-lg font-bold text-green-600">{gig.budget || gig.payment}</p>
                      )}
                    </div>
                    {gig.deadline && (
                      <div className="text-sm text-gray-500">
                        ⏰ {gig.deadline}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/gigs/${gig.id}`}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Aplicar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="flex justify-around py-3">
          <div className="flex flex-col items-center space-y-1 text-blue-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Trabajos</span>
          </div>

          <Link href="/creator/dashboard" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-xs font-medium">Panel</span>
          </Link>

          <Link href="/creator/earnings" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Ganancias</span>
          </Link>

          <Link href="/creator/profile" className="flex flex-col items-center space-y-1 text-gray-400">
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
