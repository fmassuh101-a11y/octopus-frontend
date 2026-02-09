'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LegalContractDocument from '@/components/contracts/LegalContractDocument'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Contract {
  id: string
  title: string
  description?: string
  deliverables: any[]
  payment_amount: number
  payment_currency: string
  payment_terms?: string
  content_due_date?: string
  hashtags?: string[]
  mentions?: string[]
  brand_guidelines?: string
  usage_rights?: any
  exclusivity_enabled?: boolean
  exclusivity_days?: number
  exclusivity_competitors?: string[]
  additional_terms?: string
  status: string
  sent_at?: string
  viewed_at?: string
  accepted_at?: string
  creator_handles?: any[]
  creator_signed_at?: string
  company_signed_at?: string
  creator_name?: string
  creator_id: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-neutral-400', bg: 'bg-neutral-500/20' },
  sent: { label: 'Enviado', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  viewed: { label: 'Visto', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  accepted: { label: 'Aceptado', color: 'text-green-400', bg: 'bg-green-500/20' },
  rejected: { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/20' },
  in_progress: { label: 'En Progreso', color: 'text-violet-400', bg: 'bg-violet-500/20' },
  completed: { label: 'Completado', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵',
  instagram: '📸',
  youtube: '▶️',
  ugc: '🎬',
}

// Helper to build correct profile URLs
const buildProfileUrl = (platform: string, handle: string): string => {
  // Clean the handle - remove @ if present for URL building
  const cleanHandle = handle.replace(/^@/, '')

  switch (platform.toLowerCase()) {
    case 'tiktok':
      return `https://tiktok.com/@${cleanHandle}`
    case 'instagram':
      return `https://instagram.com/${cleanHandle}`
    case 'youtube':
      // YouTube handles can be @username or channel URLs
      if (cleanHandle.includes('/')) return cleanHandle
      return `https://youtube.com/@${cleanHandle}`
    default:
      return '#'
  }
}

// Simple analytics display based on handle
const HandleAnalytics = ({ platform, handle }: { platform: string; handle: string }) => {
  const profileUrl = buildProfileUrl(platform, handle)

  return (
    <div className="mt-2 p-3 bg-neutral-800/50 rounded-lg">
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-400">Perfil público:</span>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300"
        >
          Ver perfil →
        </a>
      </div>
      <p className="text-xs text-neutral-500 mt-1">
        Estadísticas avanzadas disponibles si el creador conectó su cuenta via OAuth
      </p>
    </div>
  )
}

export default function CompanyContractsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showLegalDoc, setShowLegalDoc] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [companyName, setCompanyName] = useState('Empresa')
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all')

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

    // Fetch company name from profile
    try {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=company_name,bio`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (profileRes.ok) {
        const [profile] = await profileRes.json()
        if (profile) {
          let name = profile.company_name || 'Empresa'
          if (profile.bio) {
            try {
              const bioData = JSON.parse(profile.bio)
              if (bioData.companyName) name = bioData.companyName
            } catch (e) {}
          }
          setCompanyName(name)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }

    await loadContracts(userData.id, token)
  }

  const loadContracts = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?company_id=eq.${userId}&select=*&order=created_at.desc`,
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

      const contractsData = await response.json()

      // Fetch creator names
      const creatorIds = Array.from(new Set(contractsData.map((c: any) => c.creator_id)))
      let creatorsMap = new Map<string, string>()

      if (creatorIds.length > 0) {
        const creatorsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,username,bio`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (creatorsRes.ok) {
          const creators = await creatorsRes.json()
          creators.forEach((c: any) => {
            let name = 'Creador'

            // Try bio first
            if (c.bio) {
              try {
                const bioData = JSON.parse(c.bio)
                if (bioData.firstName && bioData.lastName) {
                  name = `${bioData.firstName} ${bioData.lastName}`
                } else if (bioData.name) {
                  name = bioData.name
                } else if (bioData.fullName) {
                  name = bioData.fullName
                }
              } catch (e) {}
            }

            // Fallbacks
            if (name === 'Creador' && c.full_name && c.full_name.trim()) {
              name = c.full_name
            }
            if (name === 'Creador' && c.username && c.username.trim()) {
              name = c.username
            }

            creatorsMap.set(c.user_id, name)
          })
        }
      }

      const enrichedContracts = contractsData.map((c: any) => ({
        ...c,
        deliverables: typeof c.deliverables === 'string' ? JSON.parse(c.deliverables) : c.deliverables,
        usage_rights: typeof c.usage_rights === 'string' ? JSON.parse(c.usage_rights) : c.usage_rights,
        creator_handles: typeof c.creator_handles === 'string' ? JSON.parse(c.creator_handles) : c.creator_handles,
        exclusivity_competitors: typeof c.exclusivity_competitors === 'string' ? JSON.parse(c.exclusivity_competitors) : c.exclusivity_competitors,
        creator_name: creatorsMap.get(c.creator_id) || 'Creador'
      }))

      setContracts(enrichedContracts)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
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

  const cancelContract = async (contractId: string, reason: string) => {
    setCancelling(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token || !user?.id) throw new Error('No autorizado')

      // Update contract status to cancelled
      const response = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}&company_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
          updated_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Cancel contract error:', response.status, errorText)
        throw new Error(`Error al cancelar contrato: ${response.status}`)
      }

      // Send notification message to creator
      const contract = selectedContract
      if (contract) {
        // Find the application ID for this creator-company conversation
        const appsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${user.id}&creator_id=eq.${contract.creator_id}&status=eq.accepted&select=id&limit=1`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (appsRes.ok) {
          const [app] = await appsRes.json()
          if (app) {
            await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
              },
              body: JSON.stringify({
                conversation_id: app.id,
                sender_id: user.id,
                sender_type: 'company',
                content: `❌ El contrato "${contract.title}" ha sido cancelado por la empresa.${reason ? ` Razón: ${reason}` : ''}`
              })
            })
          }
        }
      }

      // Update local state
      setContracts(prev => prev.map(c =>
        c.id === contractId ? { ...c, status: 'cancelled' } : c
      ))

      setShowCancelModal(false)
      setSelectedContract(null)
      setCancelReason('')
    } catch (err) {
      console.error('Error cancelling contract:', err)
      alert('Error al cancelar el contrato')
    } finally {
      setCancelling(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$', MXN: '$', BRL: 'R$', COP: '$', ARS: '$', PEN: 'S/'
    }
    return `${symbols[currency] || '$'}${amount.toLocaleString()} ${currency}`
  }

  const filteredContracts = contracts.filter(c => {
    if (filter === 'pending') return ['sent', 'viewed'].includes(c.status)
    if (filter === 'accepted') return ['accepted', 'in_progress', 'completed'].includes(c.status)
    return true
  })

  const acceptedCount = contracts.filter(c => c.status === 'accepted').length
  const pendingCount = contracts.filter(c => ['sent', 'viewed'].includes(c.status)).length

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando contratos...</p>
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
            <Link href="/company/dashboard" className="p-2 -ml-2 hover:bg-neutral-800 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Mis Contratos</h1>
              <p className="text-sm text-neutral-400">
                {acceptedCount} aceptados · {pendingCount} pendientes
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'accepted', label: 'Aceptados' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts List */}
      <div className="p-4 space-y-4">
        {filteredContracts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay contratos</h3>
            <p className="text-neutral-500 text-sm mb-4">Crea contratos desde el chat con creadores</p>
            <Link
              href="/company/messages"
              className="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors"
            >
              Ir a Mensajes
            </Link>
          </div>
        ) : (
          filteredContracts.map((contract) => {
            const statusInfo = STATUS_LABELS[contract.status] || STATUS_LABELS.sent

            return (
              <button
                key={contract.id}
                onClick={() => setSelectedContract(contract)}
                className="w-full bg-neutral-900 rounded-2xl p-4 text-left hover:bg-neutral-800/70 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{contract.title}</h3>
                    <p className="text-sm text-neutral-400">{contract.creator_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-400">
                    <span className="font-semibold">{formatCurrency(contract.payment_amount, contract.payment_currency)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-500">
                    <span>
                      {contract.deliverables.map((d: any) => PLATFORM_ICONS[d.platform] || '📱').join(' ')}
                    </span>
                    <span>{contract.deliverables.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0)} entregables</span>
                  </div>
                </div>

                {/* Show handles if accepted */}
                {contract.status === 'accepted' && contract.creator_handles && contract.creator_handles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contract.creator_handles.map((h: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded-lg text-xs">
                        {PLATFORM_ICONS[h.platform]} {h.handle}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-neutral-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedContract.title}</h2>
                <p className="text-sm text-neutral-400">{selectedContract.creator_name}</p>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_LABELS[selectedContract.status]?.bg} ${STATUS_LABELS[selectedContract.status]?.color}`}>
                  {STATUS_LABELS[selectedContract.status]?.label}
                </span>
              </div>

              {/* Payment */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-sm text-green-400 mb-1">Pago Acordado</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(selectedContract.payment_amount, selectedContract.payment_currency)}
                </p>
              </div>

              {/* Creator Handles - THE KEY SECTION */}
              {selectedContract.creator_handles && selectedContract.creator_handles.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span>Handles del Creador</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Verificados</span>
                  </h4>
                  <div className="space-y-3">
                    {selectedContract.creator_handles.map((h: any, i: number) => (
                      <div key={i} className="bg-neutral-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{PLATFORM_ICONS[h.platform] || '📱'}</span>
                            <div>
                              <p className="font-semibold">{h.handle}</p>
                              <p className="text-xs text-neutral-500 capitalize">{h.platform}</p>
                            </div>
                          </div>
                          <a
                            href={buildProfileUrl(h.platform, h.handle)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Ver Perfil
                          </a>
                        </div>
                        <HandleAnalytics platform={h.platform} handle={h.handle} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              <div>
                <h4 className="font-semibold mb-3">Entregables</h4>
                <div className="space-y-2">
                  {selectedContract.deliverables.map((del: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-neutral-800 rounded-xl p-3">
                      <span className="text-2xl">{PLATFORM_ICONS[del.platform] || '📱'}</span>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{del.platform}</p>
                        <p className="text-sm text-neutral-400">{del.quantity} {del.content_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-semibold mb-3">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-400">
                    <span>Enviado:</span>
                    <span>{formatDate(selectedContract.sent_at)}</span>
                  </div>
                  {selectedContract.accepted_at && (
                    <div className="flex justify-between text-green-400">
                      <span>Aceptado:</span>
                      <span>{formatDate(selectedContract.accepted_at)}</span>
                    </div>
                  )}
                  {selectedContract.content_due_date && (
                    <div className="flex justify-between text-amber-400">
                      <span>Fecha límite:</span>
                      <span>{formatDate(selectedContract.content_due_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Legal Document Button */}
              <button
                onClick={() => setShowLegalDoc(true)}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Documento Legal Completo
              </button>

              {/* Actions */}
              <div className="flex gap-3">
                <Link
                  href={`/company/messages?creator=${selectedContract.creator_id}`}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium text-center transition-colors"
                >
                  Enviar Mensaje
                </Link>
                <Link
                  href={`/company/creator/${selectedContract.creator_id}`}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium text-center transition-colors"
                >
                  Ver Perfil
                </Link>
              </div>

              {/* Cancel Contract Button - Only show if not already cancelled */}
              {!['cancelled', 'rejected', 'completed'].includes(selectedContract.status) && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar Contrato
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Contract Modal */}
      {showCancelModal && selectedContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-red-400">Cancelar Contrato</h2>
              <p className="text-sm text-neutral-400">Esta acción no se puede deshacer</p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-neutral-300">
                ¿Estás seguro que deseas cancelar el contrato <strong>"{selectedContract.title}"</strong> con <strong>{selectedContract.creator_name}</strong>?
              </p>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Razón de cancelación (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explica brevemente por qué cancelas el contrato..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-300">
                  El creador recibirá una notificación de que el contrato ha sido cancelado.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
              >
                No, mantener
              </button>
              <button
                onClick={() => cancelContract(selectedContract.id, cancelReason)}
                disabled={cancelling}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Sí, cancelar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Document View */}
      {showLegalDoc && selectedContract && (
        <LegalContractDocument
          contract={selectedContract}
          companyName={companyName}
          creatorName={selectedContract.creator_name || 'Creador'}
          onClose={() => setShowLegalDoc(false)}
          showActions={false}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <Link href="/company/dashboard" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">🏠</span>
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link href="/company/campaigns" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">📋</span>
            <span className="text-xs">Campañas</span>
          </Link>
          <div className="flex flex-col items-center gap-1 px-4 py-1 text-violet-400">
            <span className="text-xl">📝</span>
            <span className="text-xs">Contratos</span>
          </div>
          <Link href="/company/messages" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">💬</span>
            <span className="text-xs">Mensajes</span>
          </Link>
          <Link href="/company/applicants" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">👥</span>
            <span className="text-xs">Aplicantes</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
