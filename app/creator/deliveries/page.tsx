'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Delivery {
  id: string
  title: string
  description?: string
  video_url: string
  thumbnail_url?: string
  status: string
  revision_count: number
  max_revisions: number
  feedback?: string
  feedback_history: any[]
  submitted_at?: string
  approved_at?: string
  payment_amount?: number
  gig_title?: string
  company_name?: string
  company_id: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Borrador', color: 'text-neutral-400', bg: 'bg-neutral-500/20', icon: '📝' },
  submitted: { label: 'Enviado', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: '📤' },
  in_review: { label: 'En Revision', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '👁' },
  approved: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-500/20', icon: '✓' },
  revision_needed: { label: 'Cambios Pedidos', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '↻' },
  completed: { label: 'Completado', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '💰' },
}

export default function CreatorDeliveriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    video_url: '',
    thumbnail_url: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'needs_action'>('all')
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
    await loadDeliveries(userData.id, token)
  }

  const loadDeliveries = async (userId: string, token: string) => {
    try {
      // Fetch deliveries with related info
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/content_deliveries?creator_id=eq.${userId}&select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!response.ok) {
        console.error('Error fetching deliveries')
        setLoading(false)
        return
      }

      const data = await response.json()

      // Fetch company names and gig titles
      const companyIds = Array.from(new Set(data.map((d: any) => d.company_id)))
      const gigIds = Array.from(new Set(data.map((d: any) => d.gig_id)))

      let companiesMap = new Map<string, string>()
      let gigsMap = new Map<string, string>()

      if (companyIds.length > 0) {
        const companiesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${companyIds.join(',')})&select=user_id,company_name,bio`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (companiesRes.ok) {
          const companies = await companiesRes.json()
          companies.forEach((c: any) => {
            let name = c.company_name || 'Empresa'
            if (c.bio) {
              try {
                const bioData = JSON.parse(c.bio)
                if (bioData.companyName) name = bioData.companyName
              } catch (e) {}
            }
            companiesMap.set(c.user_id, name)
          })
        }
      }

      if (gigIds.length > 0) {
        const gigsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/gigs?id=in.(${gigIds.join(',')})&select=id,title`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (gigsRes.ok) {
          const gigs = await gigsRes.json()
          gigs.forEach((g: any) => gigsMap.set(g.id, g.title))
        }
      }

      const enrichedDeliveries = data.map((d: any) => ({
        ...d,
        feedback_history: typeof d.feedback_history === 'string' ? JSON.parse(d.feedback_history) : d.feedback_history || [],
        company_name: companiesMap.get(d.company_id) || 'Empresa',
        gig_title: gigsMap.get(d.gig_id) || d.title
      }))

      setDeliveries(enrichedDeliveries)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitContent = async () => {
    if (!selectedDelivery || !uploadForm.video_url) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      // Update delivery with submitted content
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/content_deliveries?id=eq.${selectedDelivery.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            video_url: uploadForm.video_url,
            thumbnail_url: uploadForm.thumbnail_url || null,
            description: uploadForm.description || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      )

      if (!response.ok) throw new Error('Error al enviar contenido')

      // Create notification for company
      await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          delivery_id: selectedDelivery.id,
          recipient_id: selectedDelivery.company_id,
          type: 'content_submitted',
          title: 'Nuevo contenido recibido',
          message: `Has recibido contenido para "${selectedDelivery.title}"`
        })
      })

      // Update local state
      setDeliveries(prev => prev.map(d =>
        d.id === selectedDelivery.id
          ? { ...d, ...uploadForm, status: 'submitted', submitted_at: new Date().toISOString() }
          : d
      ))

      setShowUploadModal(false)
      setSelectedDelivery(null)
      setUploadForm({ video_url: '', thumbnail_url: '', description: '' })
      alert('Contenido enviado exitosamente!')

    } catch (err) {
      console.error('Error:', err)
      alert('Error al enviar el contenido')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'pending') return ['draft', 'submitted', 'in_review'].includes(d.status)
    if (filter === 'needs_action') return ['draft', 'revision_needed'].includes(d.status)
    return true
  })

  const needsActionCount = deliveries.filter(d => ['draft', 'revision_needed'].includes(d.status)).length
  const pendingCount = deliveries.filter(d => ['submitted', 'in_review'].includes(d.status)).length

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando entregas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/creator/dashboard" className="p-2 -ml-2 hover:bg-neutral-800 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Mis Entregas</h1>
              <p className="text-sm text-neutral-400">
                {needsActionCount > 0 && <span className="text-orange-400">{needsActionCount} requieren accion</span>}
                {needsActionCount > 0 && pendingCount > 0 && ' · '}
                {pendingCount > 0 && <span>{pendingCount} en revision</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'needs_action', label: 'Requieren Accion', badge: needsActionCount },
            { id: 'pending', label: 'En Revision' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                filter === f.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {f.label}
              {f.badge ? (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                  {f.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <div className="p-4 space-y-4">
        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay entregas</h3>
            <p className="text-neutral-500 text-sm">Las entregas de tus contratos apareceran aqui</p>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => {
            const status = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.draft

            return (
              <button
                key={delivery.id}
                onClick={() => setSelectedDelivery(delivery)}
                className="w-full bg-neutral-900 rounded-2xl p-4 text-left hover:bg-neutral-800/70 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{delivery.gig_title}</h3>
                    <p className="text-sm text-neutral-400">{delivery.company_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </div>

                {/* Show feedback alert if revision needed */}
                {delivery.status === 'revision_needed' && delivery.feedback && (
                  <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <p className="text-sm text-orange-300 font-medium mb-1">Cambios solicitados:</p>
                    <p className="text-sm text-orange-200/80 line-clamp-2">{delivery.feedback}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  {delivery.payment_amount ? (
                    <span className="text-green-400 font-semibold">
                      ${delivery.payment_amount.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                  <div className="flex items-center gap-3 text-neutral-500">
                    {delivery.revision_count > 0 && (
                      <span>Revision {delivery.revision_count}/{delivery.max_revisions}</span>
                    )}
                    <span>{formatDate(delivery.created_at)}</span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Delivery Detail Modal */}
      {selectedDelivery && !showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-neutral-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedDelivery.gig_title}</h2>
                <p className="text-sm text-neutral-400">{selectedDelivery.company_name}</p>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="p-2 hover:bg-neutral-800 rounded-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Estado:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedDelivery.status]?.bg} ${STATUS_CONFIG[selectedDelivery.status]?.color}`}>
                  {STATUS_CONFIG[selectedDelivery.status]?.icon} {STATUS_CONFIG[selectedDelivery.status]?.label}
                </span>
              </div>

              {/* Payment */}
              {selectedDelivery.payment_amount && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-sm text-green-400 mb-1">Pago</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${selectedDelivery.payment_amount.toLocaleString()}
                  </p>
                  {selectedDelivery.status === 'approved' && (
                    <p className="text-xs text-green-400/70 mt-1">Sera liberado pronto</p>
                  )}
                  {selectedDelivery.status === 'completed' && (
                    <p className="text-xs text-green-400/70 mt-1">Pago completado</p>
                  )}
                </div>
              )}

              {/* Revision Alert */}
              {selectedDelivery.status === 'revision_needed' && selectedDelivery.feedback && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">↻</span>
                    <div>
                      <p className="font-semibold text-orange-300 mb-1">Cambios Solicitados</p>
                      <p className="text-sm text-orange-200/80">{selectedDelivery.feedback}</p>
                      <p className="text-xs text-orange-400/60 mt-2">
                        Revision {selectedDelivery.revision_count} de {selectedDelivery.max_revisions}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Video */}
              {selectedDelivery.video_url && (
                <div>
                  <h4 className="font-semibold mb-3">Contenido Actual</h4>
                  <div className="bg-neutral-800 rounded-xl p-4">
                    <a
                      href={selectedDelivery.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-violet-400 hover:text-violet-300"
                    >
                      <span className="text-2xl">🎬</span>
                      <div className="flex-1">
                        <p className="font-medium">Ver Video</p>
                        <p className="text-xs text-neutral-500 truncate">{selectedDelivery.video_url}</p>
                      </div>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {/* Feedback History */}
              {selectedDelivery.feedback_history && selectedDelivery.feedback_history.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Historial de Feedback</h4>
                  <div className="space-y-3">
                    {selectedDelivery.feedback_history.map((item: any, i: number) => (
                      <div key={i} className="bg-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.action === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {item.action === 'approved' ? 'Aprobado' : 'Revision'}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        {item.feedback && (
                          <p className="text-sm text-neutral-300">{item.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h4 className="font-semibold mb-3">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-400">
                    <span>Creado:</span>
                    <span>{formatDate(selectedDelivery.created_at)}</span>
                  </div>
                  {selectedDelivery.submitted_at && (
                    <div className="flex justify-between text-neutral-400">
                      <span>Enviado:</span>
                      <span>{formatDate(selectedDelivery.submitted_at)}</span>
                    </div>
                  )}
                  {selectedDelivery.approved_at && (
                    <div className="flex justify-between text-green-400">
                      <span>Aprobado:</span>
                      <span>{formatDate(selectedDelivery.approved_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {['draft', 'revision_needed'].includes(selectedDelivery.status) && (
                <button
                  onClick={() => {
                    setUploadForm({
                      video_url: selectedDelivery.video_url || '',
                      thumbnail_url: selectedDelivery.thumbnail_url || '',
                      description: selectedDelivery.description || ''
                    })
                    setShowUploadModal(true)
                  }}
                  className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {selectedDelivery.status === 'revision_needed' ? 'Subir Nueva Version' : 'Subir Contenido'}
                </button>
              )}

              {/* Approved message */}
              {selectedDelivery.status === 'approved' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <span className="text-3xl block mb-2">✓</span>
                  <p className="text-green-400 font-semibold">Contenido Aprobado</p>
                  <p className="text-sm text-green-400/70">El pago sera liberado pronto</p>
                </div>
              )}

              {/* Completed message */}
              {selectedDelivery.status === 'completed' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <span className="text-3xl block mb-2">💰</span>
                  <p className="text-emerald-400 font-semibold">Entrega Completada</p>
                  <p className="text-sm text-emerald-400/70">Pago recibido en tu wallet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h2 className="text-lg font-bold">
                {selectedDelivery.status === 'revision_needed' ? 'Subir Nueva Version' : 'Subir Contenido'}
              </h2>
              <p className="text-sm text-neutral-400">{selectedDelivery.gig_title}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  URL del Video *
                </label>
                <input
                  type="url"
                  value={uploadForm.video_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, video_url: e.target.value })}
                  placeholder="https://drive.google.com/... o https://dropbox.com/..."
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Soportamos Google Drive, Dropbox, WeTransfer, etc.
                </p>
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  URL del Thumbnail (opcional)
                </label>
                <input
                  type="url"
                  value={uploadForm.thumbnail_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Cualquier nota o contexto sobre el contenido..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Revision warning */}
              {selectedDelivery.status === 'revision_needed' && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <p className="text-sm text-orange-300">
                    <strong>Recuerda:</strong> {selectedDelivery.feedback}
                  </p>
                  <p className="text-xs text-orange-400/60 mt-2">
                    Revision {selectedDelivery.revision_count} de {selectedDelivery.max_revisions}
                  </p>
                </div>
              )}

              {/* Info box */}
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                <p className="text-sm text-violet-300">
                  Asegurate de que el link sea publico o tenga permisos de visualizacion.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadForm({ video_url: '', thumbnail_url: '', description: '' })
                }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitContent}
                disabled={submitting || !uploadForm.video_url}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Contenido'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">💼</span>
            <span className="text-xs">Trabajos</span>
          </Link>
          <Link href="/creator/dashboard" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">📊</span>
            <span className="text-xs">Panel</span>
          </Link>
          <div className="flex flex-col items-center gap-1 px-4 py-1 text-violet-400">
            <span className="text-xl">📦</span>
            <span className="text-xs">Entregas</span>
          </div>
          <Link href="/creator/messages" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">💬</span>
            <span className="text-xs">Mensajes</span>
          </Link>
          <Link href="/creator/profile" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">👤</span>
            <span className="text-xs">Perfil</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
