"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Gig {
  id: string
  title: string
  description: string
  budget: string
  category: string
  status: 'active' | 'closed' | 'draft'
  requirements?: string
  deliverables?: string
  deadline?: string
  created_at: string
  applications_count?: number
}

export default function CampaignsPage() {
  const router = useRouter()
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [gigToDelete, setGigToDelete] = useState<Gig | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadGigs()
  }, [])

  const loadGigs = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)

      // Fetch company's gigs
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/gigs?company_id=eq.${userData.id}&select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const data = await response.json()

        // OPTIMIZED: Fetch all application counts in ONE query (not N+1)
        const gigIds = data.map((g: Gig) => g.id)
        if (gigIds.length > 0) {
          try {
            const countRes = await fetch(
              `${SUPABASE_URL}/rest/v1/applications?gig_id=in.(${gigIds.join(',')})&select=gig_id`,
              { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
            )
            if (countRes.ok) {
              const apps = await countRes.json()
              const countMap = new Map<string, number>()
              apps.forEach((a: any) => countMap.set(a.gig_id, (countMap.get(a.gig_id) || 0) + 1))
              data.forEach((gig: Gig) => gig.applications_count = countMap.get(gig.id) || 0)
            }
          } catch (e) {}
        }

        setGigs(data)
      } else {
        setGigs([])
      }
    } catch (err) {
      console.error('Error loading gigs:', err)
      setGigs([])
    } finally {
      setLoading(false)
    }
  }

  // OPTIMIZED: Memoize filtered gigs and counts
  const { filteredGigs, activeCount, draftCount, closedCount } = useMemo(() => {
    const active = gigs.filter(g => g.status === 'active').length
    const draft = gigs.filter(g => g.status === 'draft').length
    const closed = gigs.filter(g => g.status === 'closed').length
    const filtered = gigs.filter(gig => {
      if (filter === 'all') return showArchived ? true : gig.status !== 'closed'
      return gig.status === filter
    })
    return { filteredGigs: filtered, activeCount: active, draftCount: draft, closedCount: closed }
  }, [gigs, filter, showArchived])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} dias`
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  const getPaymentBadge = (budget: string) => {
    if (budget.includes('CPM')) {
      return (
        <span className="px-2 py-1 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 text-xs font-medium rounded-full">
          {budget}
        </span>
      )
    }
    if (budget.includes('/hora')) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          {budget}
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
        {budget}
      </span>
    )
  }

  const openDeleteModal = (gig: Gig) => {
    setGigToDelete(gig)
    setDeleteConfirmText('')
    setShowDeleteModal(true)
  }

  const handleDeleteGig = async () => {
    if (!gigToDelete || deleteConfirmText !== 'confirmar') return

    setDeleting(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      // First delete all applications for this gig
      await fetch(
        `${SUPABASE_URL}/rest/v1/applications?gig_id=eq.${gigToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      // Then delete the gig
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/gigs?id=eq.${gigToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        setGigs(prev => prev.filter(g => g.id !== gigToDelete.id))
        setShowDeleteModal(false)
        setGigToDelete(null)
        setDeleteConfirmText('')
      }
    } catch (err) {
      console.error('Error deleting gig:', err)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Activo</span>
      case 'draft':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Borrador</span>
      case 'closed':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Cerrado</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Skeleton Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                <div>
                  <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-32 bg-purple-200 rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold text-gray-900">Campanas</h1>
                <p className="text-sm text-gray-500">Gestiona y rastrea tus campanas de creadores</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadGigs}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showArchived
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="hidden sm:inline">{showArchived ? 'Ocultar' : 'Mostrar'} Archivados</span>
              </button>

              <Link
                href="/company/jobs/new"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Crear Campana</span>
              </Link>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas ({gigs.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Activas ({activeCount})
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'draft'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Borradores ({draftCount})
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'closed'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cerradas ({closedCount})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {filteredGigs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">No hay campanas todavia</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Las campanas son la forma mas facil de organizar y escalar tus colaboraciones con creadores.
              Configura pagos (CPM, fijo, bonos), define requisitos e invita creadores.
            </p>

            <Link
              href="/company/jobs/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Tu Primera Campana
            </Link>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto">
              <div className="bg-gray-50 rounded-xl p-5 text-left">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Pagos flexibles</h3>
                <p className="text-sm text-gray-500 mt-1">CPM, precio fijo y bonos por rendimiento</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-left">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Requisitos de publicacion</h3>
                <p className="text-sm text-gray-500 mt-1">Define posts minimos, plazos y guias</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-left">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Onboarding facil</h3>
                <p className="text-sm text-gray-500 mt-1">Invita creadores por link o agregalos directamente</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-left">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Pagos y analytics</h3>
                <p className="text-sm text-gray-500 mt-1">Aprueba pagos y monitorea rendimiento en tiempo real</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGigs.map((gig) => (
              <div
                key={gig.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{gig.title}</h3>
                      {getStatusBadge(gig.status)}
                    </div>

                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">{gig.description}</p>

                    <div className="flex flex-wrap items-center gap-3">
                      {getPaymentBadge(gig.budget)}

                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                        {gig.category}
                      </span>

                      <span className="text-xs text-gray-400">
                        Creado {formatDate(gig.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/company/applicants"
                      className="text-right mr-4 hidden sm:block hover:bg-purple-50 p-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-gray-900">{gig.applications_count || 0}</div>
                      <div className="text-xs text-gray-500">Aplicaciones</div>
                    </Link>

                    <button
                      onClick={() => openDeleteModal(gig)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <Link
                      href="/company/applicants"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver aplicantes"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 lg:hidden">
        <div className="flex justify-around py-3">
          <Link href="/company/dashboard" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-xs font-medium">Dashboard</span>
          </Link>

          <div className="flex flex-col items-center space-y-1 text-purple-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Campanas</span>
          </div>

          <Link href="/company/analytics" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            <span className="text-xs font-medium">Analytics</span>
          </Link>

          <Link href="/company/settings" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && gigToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Eliminar Campana</h3>
              <p className="text-gray-500">
                Estas seguro de eliminar <strong>"{gigToDelete.title}"</strong>?
              </p>
              <p className="text-red-500 text-sm mt-2">
                Esto eliminara todas las aplicaciones asociadas. Esta accion no se puede deshacer.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escribe <strong>"confirmar"</strong> para eliminar:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="confirmar"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setGigToDelete(null)
                  setDeleteConfirmText('')
                }}
                disabled={deleting}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGig}
                disabled={deleteConfirmText !== 'confirmar' || deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
