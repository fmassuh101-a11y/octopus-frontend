'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Application {
  id: string
  gig_id: string
  creator_id: string
  company_id: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  gig?: {
    id: string
    title: string
    budget: string
    category: string
    company_name?: string
    image_url?: string
  }
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const [user, setUser] = useState<any>(null)

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
      // Cargar aplicaciones con info del gig
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${userId}&select=*,gig:gigs(id,title,budget,category,company_name,image_url)&order=created_at.desc`,
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
        // Si la tabla no existe, mostrar vacío
        setApplications([])
      }
    } catch (err) {
      console.error('Error loading applications:', err)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  // OPTIMIZED: Memoize filtered applications and counts
  const { filteredApplications, pendingCount, acceptedCount, rejectedCount } = useMemo(() => {
    const pending = applications.filter(a => a.status === 'pending').length
    const accepted = applications.filter(a => a.status === 'accepted').length
    const rejected = applications.filter(a => a.status === 'rejected').length
    const filtered = filter === 'all' ? applications : applications.filter(app => app.status === filter)
    return { filteredApplications: filtered, pendingCount: pending, acceptedCount: accepted, rejectedCount: rejected }
  }, [applications, filter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Pendiente
          </span>
        )
      case 'accepted':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Aceptado
          </span>
        )
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Rechazado
          </span>
        )
      default:
        return null
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `hace ${diffMins} minutos`
    if (diffHours < 24) return `hace ${diffHours} horas`
    if (diffDays === 1) return 'ayer'
    if (diffDays < 7) return `hace ${diffDays} dias`
    return created.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  const getGradient = (index: number) => {
    const gradients = [
      'from-violet-600 via-purple-600 to-blue-600',
      'from-rose-500 via-pink-500 to-purple-500',
      'from-emerald-500 via-teal-500 to-cyan-500',
      'from-orange-500 via-red-500 to-pink-500',
      'from-blue-600 via-indigo-600 to-purple-600',
    ]
    return gradients[index % gradients.length]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        {/* Skeleton Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 text-white">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg animate-pulse" />
              <div>
                <div className="h-7 w-40 bg-neutral-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-56 bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-neutral-800 rounded-xl p-4 animate-pulse">
                  <div className="h-8 w-12 bg-neutral-700 rounded mx-auto mb-2" />
                  <div className="h-4 w-16 bg-neutral-700 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Skeleton Filter Tabs */}
        <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-10 w-28 bg-neutral-800 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton Applications */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 flex">
              <div className="w-32 md:w-40 bg-neutral-800 animate-pulse" />
              <div className="flex-1 p-4">
                <div className="h-5 w-3/4 bg-neutral-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-neutral-800 rounded animate-pulse mb-4" />
                <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/gigs"
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Mis Aplicaciones</h1>
              <p className="text-neutral-400">Rastrea tus aplicaciones a trabajos</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{pendingCount}</div>
              <div className="text-sm text-neutral-400">Pendientes</div>
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{acceptedCount}</div>
              <div className="text-sm text-neutral-400">Aceptadas</div>
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{rejectedCount}</div>
              <div className="text-sm text-neutral-400">Rechazadas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              Todas ({applications.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'accepted'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              Aceptadas ({acceptedCount})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              Rechazadas ({rejectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📋</div>
            <h3 className="text-xl font-semibold text-white mb-3">
              {filter === 'all' ? 'No tienes aplicaciones' : `No hay aplicaciones ${filter === 'pending' ? 'pendientes' : filter === 'accepted' ? 'aceptadas' : 'rechazadas'}`}
            </h3>
            <p className="text-neutral-400 mb-6 max-w-sm mx-auto">
              {filter === 'all'
                ? 'Aplica a trabajos para comenzar a colaborar con marcas.'
                : 'Cambia el filtro o aplica a mas trabajos.'}
            </p>
            <Link
              href="/gigs"
              className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
              Explorar Trabajos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app, index) => (
              <div
                key={app.id}
                className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all"
              >
                <div className="flex">
                  {/* Image/Gradient Side */}
                  <div className={`w-32 md:w-40 bg-gradient-to-br ${getGradient(index)} flex items-center justify-center`}>
                    {app.gig?.image_url ? (
                      <img src={app.gig.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-4xl opacity-80">
                        {app.gig?.category?.includes('TikTok') ? '🎵' :
                         app.gig?.category?.includes('Instagram') ? '📸' :
                         app.gig?.category?.includes('YouTube') ? '▶️' :
                         app.gig?.category?.includes('UGC') ? '🎬' : '✨'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-1">
                          {app.gig?.title || 'Trabajo'}
                        </h3>
                        <p className="text-sm text-neutral-400">
                          {app.gig?.company_name || 'Empresa'} • {app.gig?.category}
                        </p>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-white">{app.gig?.budget}</span>
                        <span className="text-sm text-neutral-500">{getTimeAgo(app.created_at)}</span>
                      </div>

                      {app.status === 'accepted' && (
                        <Link
                          href={`/creator/messages?company=${app.company_id}`}
                          className="px-4 py-2 bg-neutral-800 text-neutral-300 text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Ver Mensajes
                        </Link>
                      )}
                    </div>

                    {/* Message Preview */}
                    {app.message && (
                      <div className="mt-3 pt-3 border-t border-neutral-800">
                        <p className="text-sm text-neutral-400 line-clamp-2">
                          <span className="font-medium text-neutral-300">Tu mensaje:</span> {app.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-2">
          <Link href="/gigs" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium mt-1">Trabajos</span>
          </Link>

          <Link href="/creator/analytics" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium mt-1">Analytics</span>
          </Link>

          <div className="flex flex-col items-center py-2 px-4 text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium mt-1">Aplicaciones</span>
          </div>

          <Link href="/creator/messages" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium mt-1">Mensajes</span>
          </Link>

          <Link href="/creator/profile" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium mt-1">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>
    </div>
  )
}
