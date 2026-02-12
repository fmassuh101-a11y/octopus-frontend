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
  creator_name?: string
  creator_avatar?: string
  creator_id: string
  gig_id: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Borrador', color: 'text-neutral-400', bg: 'bg-neutral-800', border: 'border-neutral-700' },
  submitted: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  in_review: { label: 'En Revisión', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  approved: { label: 'Aprobado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  revision_needed: { label: 'Cambios Pedidos', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  completed: { label: 'Completado', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
}

export default function CompanyReviewContentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [actionType, setActionType] = useState<'approve' | 'revision'>('approve')
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')
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
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/content_deliveries?company_id=eq.${userId}&select=*&order=submitted_at.desc.nullslast,created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = await response.json()

      const creatorIds = Array.from(new Set(data.map((d: any) => d.creator_id)))
      const gigIds = Array.from(new Set(data.map((d: any) => d.gig_id)))

      let creatorsMap = new Map<string, { name: string; avatar?: string }>()
      let gigsMap = new Map<string, string>()

      if (creatorIds.length > 0) {
        const creatorsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,username,bio`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (creatorsRes.ok) {
          const creators = await creatorsRes.json()
          creators.forEach((c: any) => {
            let name = c.full_name || c.username || 'Creador'
            let avatar = undefined
            if (c.bio) {
              try {
                const bioData = JSON.parse(c.bio)
                if (bioData.firstName && bioData.lastName) {
                  name = `${bioData.firstName} ${bioData.lastName}`
                } else if (bioData.name) {
                  name = bioData.name
                }
                if (bioData.profileImage) {
                  avatar = bioData.profileImage
                }
              } catch (e) {}
            }
            creatorsMap.set(c.user_id, { name, avatar })
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
        creator_name: creatorsMap.get(d.creator_id)?.name || 'Creador',
        creator_avatar: creatorsMap.get(d.creator_id)?.avatar,
        gig_title: gigsMap.get(d.gig_id) || d.title
      }))

      setDeliveries(enrichedDeliveries)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedDelivery) return

    setProcessing(true)
    try {
      const token = localStorage.getItem('sb-access-token')

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
            status: 'approved',
            feedback: feedbackText || null,
            feedback_history: [
              ...selectedDelivery.feedback_history,
              {
                action: 'approved',
                feedback: feedbackText || null,
                created_at: new Date().toISOString(),
                by: 'company'
              }
            ],
            reviewed_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      )

      if (!response.ok) throw new Error('Error al aprobar')

      // Create notification for creator
      await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          delivery_id: selectedDelivery.id,
          recipient_id: selectedDelivery.creator_id,
          type: 'content_approved',
          title: 'Tu contenido fue aprobado!',
          message: `Tu contenido para "${selectedDelivery.gig_title}" fue aprobado.`
        })
      })

      setDeliveries(prev => prev.map(d =>
        d.id === selectedDelivery.id
          ? { ...d, status: 'approved', approved_at: new Date().toISOString() }
          : d
      ))

      setShowFeedbackModal(false)
      setSelectedDelivery(null)
      setFeedbackText('')

    } catch (err) {
      console.error('Error:', err)
      alert('Error al aprobar el contenido')
    } finally {
      setProcessing(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!selectedDelivery || !feedbackText.trim()) {
      alert('Por favor escribe el feedback para el creador')
      return
    }

    if (selectedDelivery.revision_count >= selectedDelivery.max_revisions) {
      alert('Se alcanzó el máximo de revisiones permitidas')
      return
    }

    setProcessing(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      const newRevisionCount = selectedDelivery.revision_count + 1

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
            status: 'revision_needed',
            feedback: feedbackText,
            feedback_history: [
              ...selectedDelivery.feedback_history,
              {
                action: 'revision_requested',
                feedback: feedbackText,
                created_at: new Date().toISOString(),
                by: 'company'
              }
            ],
            revision_count: newRevisionCount,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      )

      if (!response.ok) throw new Error('Error al pedir revision')

      await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          delivery_id: selectedDelivery.id,
          recipient_id: selectedDelivery.creator_id,
          type: 'revision_requested',
          title: 'Se solicitaron cambios',
          message: feedbackText.substring(0, 100) + (feedbackText.length > 100 ? '...' : '')
        })
      })

      setDeliveries(prev => prev.map(d =>
        d.id === selectedDelivery.id
          ? { ...d, status: 'revision_needed', feedback: feedbackText, revision_count: newRevisionCount }
          : d
      ))

      setShowFeedbackModal(false)
      setSelectedDelivery(null)
      setFeedbackText('')

    } catch (err) {
      console.error('Error:', err)
      alert('Error al solicitar revision')
    } finally {
      setProcessing(false)
    }
  }

  const handleReleasePayment = async (delivery: Delivery) => {
    if (!confirm(`¿Liberar pago de $${delivery.payment_amount} a ${delivery.creator_name}?`)) return

    setProcessing(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/content_deliveries?id=eq.${delivery.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            status: 'completed',
            payment_released_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      )

      if (!response.ok) throw new Error('Error al liberar pago')

      await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          delivery_id: delivery.id,
          recipient_id: delivery.creator_id,
          type: 'payment_released',
          title: '¡Pago recibido!',
          message: `Has recibido $${delivery.payment_amount} por tu contenido.`
        })
      })

      setDeliveries(prev => prev.map(d =>
        d.id === delivery.id ? { ...d, status: 'completed' } : d
      ))

      setSelectedDelivery(null)

    } catch (err) {
      console.error('Error:', err)
      alert('Error al liberar el pago')
    } finally {
      setProcessing(false)
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

  const formatRelativeTime = (date?: string) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `hace ${diffMins}m`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return formatDate(date)
  }

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'pending') return ['submitted', 'in_review'].includes(d.status)
    if (filter === 'reviewed') return ['approved', 'revision_needed', 'completed'].includes(d.status)
    return true
  })

  const pendingCount = deliveries.filter(d => ['submitted', 'in_review'].includes(d.status)).length

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando entregas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Elegant Header with Gold Accent */}
      <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border-b border-yellow-500/20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/company/dashboard" className="p-2 hover:bg-neutral-800 rounded-xl transition-colors">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Revisar Contenido
              </h1>
              <p className="text-neutral-400 text-sm mt-1">
                {pendingCount > 0 ? (
                  <span className="text-yellow-400">{pendingCount} entrega{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}</span>
                ) : (
                  'Todas las entregas al día'
                )}
              </p>
            </div>
            {/* Gold Badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
              <span className="text-yellow-500">★</span>
              <span className="text-yellow-400 text-sm font-medium">Premium</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'pending', label: 'Pendientes', badge: pendingCount },
              { id: 'reviewed', label: 'Revisados' },
              { id: 'all', label: 'Todos' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  filter === f.id
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                    : 'bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {f.label}
                {f.badge ? (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    filter === f.id ? 'bg-black/20 text-black' : 'bg-yellow-500 text-black'
                  }`}>
                    {f.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {filteredDeliveries.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-16 text-center">
            <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📭</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">No hay entregas</h3>
            <p className="text-neutral-500">Las entregas de contenido aparecerán aquí</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeliveries.map((delivery) => {
              const status = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.draft

              return (
                <div
                  key={delivery.id}
                  className="group bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-all hover:shadow-xl hover:shadow-yellow-500/5"
                >
                  {/* Creator Header - Elegant Card */}
                  <div className="p-5 border-b border-neutral-800/50 bg-gradient-to-r from-neutral-900 to-neutral-800/50">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        {delivery.creator_avatar ? (
                          <img
                            src={delivery.creator_avatar}
                            alt={delivery.creator_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-yellow-500/30"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center border-2 border-yellow-500/30">
                            <span className="text-black font-bold text-xl">
                              {delivery.creator_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {/* Online indicator */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-neutral-900" />
                      </div>

                      {/* Creator Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{delivery.creator_name}</h3>
                        <p className="text-sm text-neutral-400 truncate">{delivery.gig_title}</p>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Video Preview */}
                  <div className="p-5">
                    <a
                      href={delivery.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl hover:border-yellow-500/50 transition-colors group/link"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white group-hover/link:text-yellow-400 transition-colors">Ver Video</p>
                          <p className="text-xs text-neutral-500 truncate">{delivery.video_url}</p>
                        </div>
                        <svg className="w-5 h-5 text-neutral-500 group-hover/link:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between mt-4 text-sm text-neutral-500">
                      <span>{formatRelativeTime(delivery.submitted_at)}</span>
                      {delivery.payment_amount && (
                        <span className="font-semibold text-yellow-400">${delivery.payment_amount.toLocaleString()}</span>
                      )}
                    </div>

                    {/* Revision Badge */}
                    {delivery.revision_count > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-orange-400">
                        <span>↻</span>
                        <span>Revisión {delivery.revision_count}/{delivery.max_revisions}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-5 pt-0">
                    {delivery.status === 'submitted' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery)
                            setActionType('revision')
                            setFeedbackText('')
                            setShowFeedbackModal(true)
                          }}
                          className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium transition-colors border border-neutral-700"
                        >
                          Pedir Cambios
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery)
                            setActionType('approve')
                            setFeedbackText('')
                            setShowFeedbackModal(true)
                          }}
                          className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black rounded-xl text-sm font-bold transition-all shadow-lg shadow-yellow-500/20"
                        >
                          Aprobar ✓
                        </button>
                      </div>
                    )}

                    {delivery.status === 'approved' && (
                      <button
                        onClick={() => handleReleasePayment(delivery)}
                        disabled={processing}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                      >
                        💰 Liberar Pago (${delivery.payment_amount})
                      </button>
                    )}

                    {delivery.status === 'revision_needed' && delivery.feedback && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                        <p className="text-xs font-medium text-orange-400 mb-1">Feedback enviado:</p>
                        <p className="text-sm text-neutral-300 line-clamp-2">{delivery.feedback}</p>
                      </div>
                    )}

                    {delivery.status === 'completed' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <span className="text-yellow-400 font-semibold">✓ Pago Liberado</span>
                      </div>
                    )}

                    {/* View Details */}
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
                      className="w-full mt-3 py-2 text-sm text-neutral-500 hover:text-yellow-400 transition-colors"
                    >
                      Ver detalles completos →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Feedback Modal - Elegant Black & Gold */}
      {showFeedbackModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-800">
              <h2 className="text-lg font-bold text-white">
                {actionType === 'approve' ? '✓ Aprobar Contenido' : '↻ Solicitar Cambios'}
              </h2>
              <p className="text-sm text-neutral-400 mt-1">{selectedDelivery.creator_name}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Video Preview */}
              <a
                href={selectedDelivery.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl hover:border-yellow-500/50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span className="font-medium text-yellow-400">Ver video antes de decidir</span>
              </a>

              {/* Feedback Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {actionType === 'approve' ? 'Comentarios (opcional)' : 'Describe los cambios necesarios *'}
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={actionType === 'approve' ? '¡Excelente trabajo!' : 'Por favor ajusta...'}
                  rows={4}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                />
              </div>

              {/* Info Box */}
              {actionType === 'approve' ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-sm text-yellow-400">
                    Al aprobar, el creador será notificado y podrás liberar el pago.
                  </p>
                </div>
              ) : (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <p className="text-sm text-orange-400">
                    Revisión {selectedDelivery.revision_count + 1} de {selectedDelivery.max_revisions}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
              <button
                onClick={() => {
                  setShowFeedbackModal(false)
                  setFeedbackText('')
                }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={actionType === 'approve' ? handleApprove : handleRequestRevision}
                disabled={processing || (actionType === 'revision' && !feedbackText.trim())}
                className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  actionType === 'approve'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20'
                }`}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : actionType === 'approve' ? (
                  'Aprobar ✓'
                ) : (
                  'Enviar Feedback'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDelivery && !showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header with Creator Info */}
            <div className="px-6 py-5 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-800">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {selectedDelivery.creator_avatar ? (
                  <img
                    src={selectedDelivery.creator_avatar}
                    alt={selectedDelivery.creator_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center border-2 border-yellow-500/30">
                    <span className="text-black font-bold text-2xl">
                      {selectedDelivery.creator_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedDelivery.creator_name}</h2>
                  <p className="text-neutral-400">{selectedDelivery.gig_title}</p>
                </div>
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Estado:</span>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedDelivery.status]?.bg} ${STATUS_CONFIG[selectedDelivery.status]?.color} border ${STATUS_CONFIG[selectedDelivery.status]?.border}`}>
                  {STATUS_CONFIG[selectedDelivery.status]?.label}
                </span>
              </div>

              {/* Video */}
              <a
                href={selectedDelivery.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-5 bg-neutral-800/50 border border-neutral-700 rounded-xl hover:border-yellow-500/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">Ver Video Completo</p>
                    <p className="text-sm text-neutral-500 truncate">{selectedDelivery.video_url}</p>
                  </div>
                </div>
              </a>

              {/* Description */}
              {selectedDelivery.description && (
                <div>
                  <h4 className="font-medium text-white mb-2">Notas del Creador</h4>
                  <p className="text-neutral-400 bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">{selectedDelivery.description}</p>
                </div>
              )}

              {/* Payment */}
              {selectedDelivery.payment_amount && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                  <p className="text-sm text-yellow-400 mb-1">Pago del Proyecto</p>
                  <p className="text-3xl font-bold text-yellow-400">${selectedDelivery.payment_amount.toLocaleString()}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="text-sm space-y-2">
                <div className="flex justify-between text-neutral-500">
                  <span>Enviado:</span>
                  <span>{formatDate(selectedDelivery.submitted_at)}</span>
                </div>
                {selectedDelivery.approved_at && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Aprobado:</span>
                    <span>{formatDate(selectedDelivery.approved_at)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedDelivery.status === 'submitted' && (
                <div className="flex gap-3 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => {
                      setActionType('revision')
                      setFeedbackText('')
                      setShowFeedbackModal(true)
                    }}
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors border border-neutral-700"
                  >
                    Pedir Cambios
                  </button>
                  <button
                    onClick={() => {
                      setActionType('approve')
                      setFeedbackText('')
                      setShowFeedbackModal(true)
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20"
                  >
                    Aprobar ✓
                  </button>
                </div>
              )}

              {selectedDelivery.status === 'approved' && (
                <button
                  onClick={() => handleReleasePayment(selectedDelivery)}
                  disabled={processing}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  💰 Liberar Pago (${selectedDelivery.payment_amount})
                </button>
              )}

              {/* Message Creator */}
              <Link
                href={`/company/messages?creator=${selectedDelivery.creator_id}`}
                className="block w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium text-center transition-colors border border-neutral-700"
              >
                💬 Enviar Mensaje
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 z-40">
        <div className="flex justify-around py-3">
          <Link href="/company/dashboard" className="flex flex-col items-center p-2 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Inicio</span>
          </Link>
          <div className="flex flex-col items-center p-2 text-yellow-500">
            <span className="text-xl">📦</span>
            <span className="text-xs mt-1 font-medium">Contenido</span>
          </div>
          <Link href="/company/contracts" className="flex flex-col items-center p-2 text-neutral-500">
            <span className="text-xl">📝</span>
            <span className="text-xs mt-1">Contratos</span>
          </Link>
          <Link href="/company/messages" className="flex flex-col items-center p-2 text-neutral-500">
            <span className="text-xl">💬</span>
            <span className="text-xs mt-1">Mensajes</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
