'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Application {
  id: string
  gig_id: string
  creator_id: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  gig?: {
    title: string
    budget: string
    category: string
  }
  creator?: {
    full_name: string
    bio: string
    avatar_url?: string
  }
}

export default function ApplicantsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending')
  const [user, setUser] = useState<any>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

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
    await loadApplications(userData.id, token)
  }

  const loadApplications = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&select=*,gig:gigs(title,budget,category),creator:profiles!applications_creator_id_fkey(full_name,bio)&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      } else {
        setApplications([])
      }
    } catch (err) {
      console.error('Error loading applications:', err)
      setApplications([])
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
        setSelectedApplication(null)
      }
    } catch (err) {
      console.error('Error updating application:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true
    return app.status === filter
  })

  const pendingCount = applications.filter(a => a.status === 'pending').length
  const acceptedCount = applications.filter(a => a.status === 'accepted').length
  const rejectedCount = applications.filter(a => a.status === 'rejected').length

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/company/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Aplicantes</h1>
              <p className="text-sm text-gray-500">Gestiona las aplicaciones a tus campanas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center text-white">
              <div className="text-3xl font-bold">{pendingCount}</div>
              <div className="text-sm opacity-80">Pendientes</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center text-white">
              <div className="text-3xl font-bold">{acceptedCount}</div>
              <div className="text-sm opacity-80">Aceptados</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center text-white">
              <div className="text-3xl font-bold">{rejectedCount}</div>
              <div className="text-sm opacity-80">Rechazados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'accepted'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Aceptados ({acceptedCount})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Rechazados ({rejectedCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({applications.length})
            </button>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {filter === 'pending' ? 'No hay aplicaciones pendientes' :
               filter === 'accepted' ? 'No has aceptado aplicaciones' :
               filter === 'rejected' ? 'No has rechazado aplicaciones' :
               'No hay aplicaciones'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {filter === 'pending'
                ? 'Los creadores que apliquen a tus campanas apareceran aqui.'
                : 'Cambia el filtro para ver otras aplicaciones.'}
            </p>
            <Link
              href="/company/campaigns"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
            >
              Ver Mis Campanas
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {app.creator?.full_name?.charAt(0).toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{app.creator?.full_name || 'Creador'}</h3>
                        <p className="text-sm text-gray-500">{app.gig?.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === 'pending' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                          Pendiente
                        </span>
                      )}
                      {app.status === 'accepted' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Aceptado
                        </span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Rechazado
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{getTimeAgo(app.created_at)}</span>
                    </div>
                  </div>

                  {/* Message */}
                  {app.message && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <p className="text-sm text-gray-600 font-medium mb-1">Mensaje del creador:</p>
                      <p className="text-gray-700">{app.message}</p>
                    </div>
                  )}

                  {/* Gig Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {app.gig?.category}
                      </span>
                      <span className="font-semibold text-gray-900">{app.gig?.budget}</span>
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateApplicationStatus(app.id, 'rejected')}
                          disabled={updatingId === app.id}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(app.id, 'accepted')}
                          disabled={updatingId === app.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {updatingId === app.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Aceptar
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {app.status === 'accepted' && (
                      <Link
                        href={`/company/messages?creator=${app.creator_id}`}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Enviar Mensaje
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  )
}
