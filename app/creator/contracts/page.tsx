'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LegalContractDocument from '@/components/contracts/LegalContractDocument'
import CreateDeliveryModal from '@/components/deliveries/CreateDeliveryModal'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

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
  company_id?: string
  creator_id?: string
  gig_id?: string
  application_id?: string
  company_name?: string
  gig_title?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  sent: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/20' },
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

export default function CreatorContractsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [user, setUser] = useState<any>(null)
  const [creatorName, setCreatorName] = useState('Creador')
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [contractForDelivery, setContractForDelivery] = useState<Contract | null>(null)
  const [handles, setHandles] = useState<Record<string, string>>({})
  const [accepting, setAccepting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all')

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

    // Fetch creator's name from profile
    try {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=full_name,username,bio`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (profileRes.ok) {
        const [profile] = await profileRes.json()
        if (profile) {
          let name = profile.full_name || profile.username || 'Creador'
          if (profile.bio) {
            try {
              const bioData = JSON.parse(profile.bio)
              if (bioData.name) name = bioData.name
            } catch (e) {}
          }
          setCreatorName(name)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }

    await loadContracts(userData.id, token)
  }

  const loadContracts = async (userId: string, token: string) => {
    try {
      // Fetch contracts
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?creator_id=eq.${userId}&select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!response.ok) {
        console.error('Error fetching contracts')
        setLoading(false)
        return
      }

      const contractsData = await response.json()

      // Fetch company names and gig titles
      const companyIds = Array.from(new Set(contractsData.map((c: any) => c.company_id)))
      const gigIds = Array.from(new Set(contractsData.map((c: any) => c.gig_id)))

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

      // Enrich contracts with company and gig info
      const enrichedContracts = contractsData.map((c: any) => ({
        ...c,
        deliverables: typeof c.deliverables === 'string' ? JSON.parse(c.deliverables) : c.deliverables,
        usage_rights: typeof c.usage_rights === 'string' ? JSON.parse(c.usage_rights) : c.usage_rights,
        creator_handles: typeof c.creator_handles === 'string' ? JSON.parse(c.creator_handles) : c.creator_handles,
        exclusivity_competitors: typeof c.exclusivity_competitors === 'string' ? JSON.parse(c.exclusivity_competitors) : c.exclusivity_competitors,
        company_name: companiesMap.get(c.company_id) || 'Empresa',
        gig_title: gigsMap.get(c.gig_id) || c.title
      }))

      setContracts(enrichedContracts)

      // Mark as viewed if not already
      const unviewedIds = enrichedContracts
        .filter((c: Contract) => c.status === 'sent' && !c.viewed_at)
        .map((c: Contract) => c.id)

      if (unviewedIds.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=in.(${unviewedIds.join(',')})`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            status: 'viewed',
            viewed_at: new Date().toISOString()
          })
        })
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptContract = async () => {
    if (!selectedContract || !user) return

    // Validate handles
    const requiredPlatforms = Array.from(new Set(selectedContract.deliverables.map((d: any) => d.platform)))
    const missingHandles = requiredPlatforms.filter(p => !handles[p]?.trim())

    if (missingHandles.length > 0) {
      alert(`Por favor ingresa tu handle de: ${missingHandles.join(', ')}`)
      return
    }

    setAccepting(true)

    try {
      const token = localStorage.getItem('sb-access-token')

      const creatorHandles = Object.entries(handles).map(([platform, handle]) => ({
        platform,
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        submitted_at: new Date().toISOString()
      }))

      const response = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${selectedContract.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          creator_signed_at: new Date().toISOString(),
          creator_handles: JSON.stringify(creatorHandles)
        })
      })

      if (!response.ok) throw new Error('Error al aceptar contrato')

      // Send notification message to company
      // First get the application_id for the conversation
      const appsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${user.id}&company_id=eq.${selectedContract.company_id}&status=eq.accepted&select=id&limit=1`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (appsRes.ok) {
        const apps = await appsRes.json()
        if (apps.length > 0) {
          const handlesText = creatorHandles.map(h => `${h.platform}: ${h.handle}`).join(', ')
          await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              conversation_id: apps[0].id,
              sender_id: user.id,
              sender_type: 'creator',
              content: `✅ He aceptado el contrato "${selectedContract.title}".\n\nMis handles: ${handlesText}`
            })
          })
        }
      }

      // Update local state
      setContracts(prev => prev.map(c =>
        c.id === selectedContract.id
          ? { ...c, status: 'accepted', accepted_at: new Date().toISOString(), creator_handles: creatorHandles }
          : c
      ))

      setShowAcceptModal(false)
      setSelectedContract(null)
      setHandles({})

    } catch (err) {
      console.error('Error accepting contract:', err)
      alert('Error al aceptar el contrato')
    } finally {
      setAccepting(false)
    }
  }

  const handleRejectContract = async (contractId: string, reason?: string) => {
    try {
      const token = localStorage.getItem('sb-access-token')

      await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason || null
        })
      })

      setContracts(prev => prev.map(c =>
        c.id === contractId ? { ...c, status: 'rejected' } : c
      ))
      setSelectedContract(null)
    } catch (err) {
      console.error('Error rejecting contract:', err)
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

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$', MXN: '$', BRL: 'R$', COP: '$', ARS: '$', PEN: 'S/'
    }
    return `${symbols[currency] || '$'}${amount.toLocaleString()} ${currency}`
  }

  const filteredContracts = contracts.filter(c => {
    if (filter === 'pending') return ['sent', 'viewed'].includes(c.status)
    if (filter === 'active') return ['accepted', 'in_progress'].includes(c.status)
    return true
  })

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
            <Link href="/creator/dashboard" className="p-2 -ml-2 hover:bg-neutral-800 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Mis Contratos</h1>
              {pendingCount > 0 && (
                <p className="text-sm text-amber-400">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'active', label: 'Activos' },
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
            <p className="text-neutral-500 text-sm">Los contratos de las empresas aparecerán aquí</p>
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
                    <p className="text-sm text-neutral-400">{contract.company_name}</p>
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

                {contract.content_due_date && (
                  <div className="mt-2 text-xs text-neutral-500">
                    Fecha límite: {formatDate(contract.content_due_date)}
                  </div>
                )}

                {/* CTA for accepted contracts */}
                {contract.status === 'accepted' && (
                  <div
                    className="mt-3 flex items-center gap-2 text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-xl px-3 py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      setContractForDelivery(contract)
                      setShowDeliveryModal(true)
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Entregar Contenido</span>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Legal Contract Document View */}
      {selectedContract && !showAcceptModal && !showDeliveryModal && (
        <LegalContractDocument
          contract={selectedContract}
          companyName={selectedContract.company_name || 'Empresa'}
          creatorName={creatorName}
          onAccept={() => setShowAcceptModal(true)}
          onReject={() => handleRejectContract(selectedContract.id)}
          onClose={() => setSelectedContract(null)}
          onDeliverContent={selectedContract.status === 'accepted' ? () => {
            setContractForDelivery(selectedContract)
            setShowDeliveryModal(true)
          } : undefined}
          showActions={true}
        />
      )}

      {/* Create Delivery Modal */}
      {showDeliveryModal && contractForDelivery && user && (
        <CreateDeliveryModal
          contract={{
            id: contractForDelivery.id,
            title: contractForDelivery.title,
            application_id: contractForDelivery.application_id || contractForDelivery.id,
            gig_id: contractForDelivery.gig_id || contractForDelivery.id,
            company_id: contractForDelivery.company_id || '',
            creator_id: user.id,
            payment_amount: contractForDelivery.payment_amount,
            payment_currency: contractForDelivery.payment_currency,
            deliverables: contractForDelivery.deliverables,
          }}
          onClose={() => {
            setShowDeliveryModal(false)
            setContractForDelivery(null)
          }}
          onCreated={(delivery) => {
            setShowDeliveryModal(false)
            setContractForDelivery(null)
            setSelectedContract(null)
            alert('Contenido entregado exitosamente! La empresa sera notificada.')
          }}
        />
      )}

      {/* Accept Modal with Handles */}
      {showAcceptModal && selectedContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h2 className="text-lg font-bold">Confirmar y Enviar Handles</h2>
              <p className="text-sm text-neutral-400">Ingresa tus handles para las plataformas requeridas</p>
            </div>

            <div className="p-6 space-y-4">
              {Array.from(new Set(selectedContract.deliverables.map((d: any) => d.platform))).map((platform: string) => {
                const platformUrls: Record<string, string> = {
                  tiktok: 'https://www.tiktok.com/@',
                  instagram: 'https://www.instagram.com/',
                  youtube: 'https://www.youtube.com/@',
                }
                const handleValue = handles[platform] || ''
                const cleanHandle = handleValue.replace('@', '')
                const verifyUrl = platformUrls[platform] ? `${platformUrls[platform]}${cleanHandle}` : null

                return (
                  <div key={platform}>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      {PLATFORM_ICONS[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={handleValue}
                        onChange={(e) => setHandles({ ...handles, [platform]: e.target.value })}
                        placeholder="tu_usuario"
                        className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                      />
                      {verifyUrl && cleanHandle && (
                        <a
                          href={verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-violet-500 transition-colors flex items-center gap-2"
                          title={`Verificar @${cleanHandle} en ${platform}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}

              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                <p className="text-sm text-violet-300">
                  Al aceptar, confirmas que los handles son tuyos y que cumplirás con los términos del contrato.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
              <button
                onClick={() => {
                  setShowAcceptModal(false)
                  setHandles({})
                }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAcceptContract}
                disabled={accepting}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Aceptando...
                  </>
                ) : (
                  'Aceptar y Firmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <Link href="/creator/dashboard" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">📊</span>
            <span className="text-xs">Panel</span>
          </Link>
          <div className="flex flex-col items-center gap-1 px-4 py-1 text-violet-400">
            <span className="text-xl">📋</span>
            <span className="text-xs">Contratos</span>
          </div>
          <Link href="/creator/deliveries" className="flex flex-col items-center gap-1 px-4 py-1 text-neutral-500 hover:text-neutral-300">
            <span className="text-xl">📦</span>
            <span className="text-xs">Entregas</span>
          </Link>
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
