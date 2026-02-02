'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface HandleRequest {
  id: string
  application_id: string
  requested_at: string
  submitted_at?: string
  verified_at?: string
  handles?: {
    tiktok?: string
    instagram?: string
    youtube?: string
  }
  status: 'pending' | 'submitted' | 'verified' | 'rejected'
  creator?: {
    id: string
    name: string
    avatar?: string
    email?: string
  }
  gig?: {
    id: string
    title: string
  }
}

type TabType = 'pending' | 'submitted' | 'verified'

export default function HandleRequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<HandleRequest[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [selectedRequest, setSelectedRequest] = useState<HandleRequest | null>(null)

  const getToken = () => localStorage.getItem('sb-access-token')
  const getUserId = () => {
    const userStr = localStorage.getItem('sb-user')
    return userStr ? JSON.parse(userStr).id : null
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    const token = getToken()
    const userId = getUserId()

    if (!token || !userId) {
      router.push('/auth/login')
      return
    }

    try {
      // Get handle requests with application and creator data
      const requestsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/handle_requests?select=*,application:applications!inner(id,creator_id,gig_id,company_id,gig:gigs(id,title))&application.company_id=eq.${userId}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (!requestsRes.ok) {
        // Table might not exist yet, just show empty
        setLoading(false)
        return
      }

      const data = await requestsRes.json()

      // Get creator profiles
      const creatorIds = Array.from(new Set(data.map((r: any) => r.application?.creator_id).filter(Boolean))) as string[]

      if (creatorIds.length > 0) {
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,bio,avatar_url`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )

        const profiles = profilesRes.ok ? await profilesRes.json() : []

        // Map profiles to requests
        const profilesMap = new Map()
        for (const profile of profiles) {
          let name = profile.full_name || 'Creador'
          let avatar = profile.avatar_url

          if (profile.bio) {
            try {
              const bioData = typeof profile.bio === 'string' ? JSON.parse(profile.bio) : profile.bio
              if (bioData.firstName && bioData.lastName) {
                name = `${bioData.firstName} ${bioData.lastName}`
              }
              if (bioData.tiktokAccounts && bioData.tiktokAccounts.length > 0) {
                avatar = avatar || bioData.tiktokAccounts[0].avatarUrl
              }
            } catch (e) {}
          }

          profilesMap.set(profile.user_id, { id: profile.user_id, name, avatar })
        }

        // Build final requests list
        const requestsList: HandleRequest[] = data.map((r: any) => ({
          id: r.id,
          application_id: r.application_id,
          requested_at: r.requested_at,
          submitted_at: r.submitted_at,
          verified_at: r.verified_at,
          handles: r.handles,
          status: r.status,
          creator: r.application?.creator_id ? profilesMap.get(r.application.creator_id) : undefined,
          gig: r.application?.gig
        }))

        setRequests(requestsList)
      }
    } catch (err) {
      console.error('Error loading handle requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const verifyRequest = async (requestId: string) => {
    const token = getToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${requestId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'verified',
            verified_at: new Date().toISOString()
          })
        }
      )

      setRequests(prev => prev.map(r =>
        r.id === requestId
          ? { ...r, status: 'verified', verified_at: new Date().toISOString() }
          : r
      ))
      setSelectedRequest(null)
    } catch (err) {
      console.error('Error verifying request:', err)
    }
  }

  const rejectRequest = async (requestId: string) => {
    const token = getToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${requestId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'rejected' })
        }
      )

      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: 'rejected' } : r
      ))
      setSelectedRequest(null)
    } catch (err) {
      console.error('Error rejecting request:', err)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFilteredRequests = () => {
    return requests.filter(r => r.status === activeTab)
  }

  const getCounts = () => ({
    pending: requests.filter(r => r.status === 'pending').length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    verified: requests.filter(r => r.status === 'verified').length
  })

  const counts = getCounts()
  const filteredRequests = getFilteredRequests()

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando solicitudes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/company/dashboard')}
              className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">Handle Requests</h1>
              <p className="text-xs text-neutral-500">Verificacion de cuentas de creadores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="px-4 py-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🔐</span>
            </div>
            <div>
              <h3 className="font-semibold text-amber-200">Como funciona</h3>
              <p className="text-sm text-amber-300/70 mt-1">
                Cuando aceptas un creador, se le pide que verifique sus cuentas de redes sociales.
                Una vez que envian sus handles, puedes verificarlos antes de comenzar a trabajar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-neutral-900 rounded-xl p-1">
          {[
            { id: 'pending', label: 'Pendientes', count: counts.pending },
            { id: 'submitted', label: 'Enviados', count: counts.submitted },
            { id: 'verified', label: 'Verificados', count: counts.verified }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-neutral-700 text-neutral-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="px-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 text-center">
            <span className="text-4xl block mb-4">
              {activeTab === 'pending' ? '⏳' : activeTab === 'submitted' ? '📝' : '✅'}
            </span>
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'pending' ? 'Sin solicitudes pendientes' :
               activeTab === 'submitted' ? 'Sin handles por revisar' :
               'Sin verificaciones completadas'}
            </h3>
            <p className="text-neutral-500 text-sm">
              {activeTab === 'pending' ? 'Las solicitudes apareceran cuando aceptes creadores' :
               activeTab === 'submitted' ? 'Los creadores aun no han enviado sus handles' :
               'Los handles verificados apareceran aqui'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800"
              >
                <div className="flex items-center gap-3">
                  {/* Creator Avatar */}
                  {request.creator?.avatar ? (
                    <img
                      src={request.creator.avatar}
                      alt={request.creator.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg font-bold">
                      {request.creator?.name?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{request.creator?.name || 'Creador'}</p>
                    <p className="text-xs text-neutral-500 truncate">{request.gig?.title || 'Gig'}</p>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    request.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                    request.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {request.status === 'pending' ? 'Pendiente' :
                     request.status === 'submitted' ? 'Por revisar' :
                     request.status === 'verified' ? 'Verificado' :
                     'Rechazado'}
                  </span>
                </div>

                {/* Handles (if submitted) */}
                {request.handles && request.status !== 'pending' && (
                  <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                    {request.handles.tiktok && (
                      <a
                        href={`https://tiktok.com/@${request.handles.tiktok}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition"
                      >
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">TikTok</p>
                          <p className="text-xs text-neutral-400">@{request.handles.tiktok}</p>
                        </div>
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}

                    {request.handles.instagram && (
                      <a
                        href={`https://instagram.com/${request.handles.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Instagram</p>
                          <p className="text-xs text-neutral-400">@{request.handles.instagram}</p>
                        </div>
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}

                {/* Actions */}
                {request.status === 'submitted' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => verifyRequest(request.id)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-medium transition"
                    >
                      Verificar
                    </button>
                    <button
                      onClick={() => rejectRequest(request.id)}
                      className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-xl text-sm font-medium transition"
                    >
                      Rechazar
                    </button>
                  </div>
                )}

                {/* Timestamps */}
                <div className="mt-3 pt-3 border-t border-neutral-800 flex justify-between text-xs text-neutral-500">
                  <span>Solicitado: {formatDate(request.requested_at)}</span>
                  {request.verified_at && (
                    <span className="text-green-400">Verificado: {formatDate(request.verified_at)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/company/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => router.push('/company/jobs')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">💼</span>
            <span className="text-xs">Mis Gigs</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-amber-500">
            <span className="text-lg">🔐</span>
            <span className="text-xs font-medium">Handles</span>
          </div>
          <button onClick={() => router.push('/company/applicants')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">👥</span>
            <span className="text-xs">Aplicantes</span>
          </button>
        </div>
        <div className="h-1 bg-white mx-auto w-32 rounded-full mb-2" />
      </div>
    </div>
  )
}
