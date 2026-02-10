'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Gig {
  id: string
  title: string
  description: string
  budget: string
  category: string
  company_id: string
  company_name?: string
  company_logo?: string
  image_url?: string
  requirements?: string
  status: string
  created_at: string
  applicants_count?: number
}

export default function GigsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [filter, setFilter] = useState('para_ti')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [appliedGigs, setAppliedGigs] = useState<Set<string>>(new Set())
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [isVerified, setIsVerified] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  useEffect(() => {
    checkAuth()
    loadGigs()
    loadAppliedGigs()
    checkVerification()
  }, [])

  // Countdown effect for success toast
  useEffect(() => {
    if (showSuccessToast && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setShowSuccessToast(false)
      setCountdown(5)
    }
  }, [showSuccessToast, countdown])

  const checkAuth = () => {
    const userStr = localStorage.getItem('sb-user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }

  // Check if user has verified at least one social account
  const checkVerification = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) return

      const userData = JSON.parse(userStr)

      // Check Supabase for verification status
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=bio`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0 && profiles[0].bio) {
          try {
            const bioData = JSON.parse(profiles[0].bio)
            // User is verified if they have tiktokConnected=true AND at least one account
            const hasTikTok = bioData.tiktokConnected && bioData.tiktokAccounts?.length > 0
            setIsVerified(hasTikTok)
            console.log('[Gigs] Verification status:', hasTikTok)
          } catch (e) {
            console.log('[Gigs] Could not parse bio')
            setIsVerified(false)
          }
        }
      }
    } catch (err) {
      console.error('[Gigs] Error checking verification:', err)
    }
  }

  const loadGigs = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')

      const response = await fetch(`${SUPABASE_URL}/rest/v1/gigs?select=*&status=eq.active&order=created_at.desc`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const data = await response.json()
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

  const loadAppliedGigs = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) return

      const userData = JSON.parse(userStr)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?select=gig_id&creator_id=eq.${userData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAppliedGigs(new Set(data.map((a: any) => a.gig_id)))
      }
    } catch (err) {
      console.error('Error loading applied gigs:', err)
    }
  }

  const handleApply = async (gig: Gig) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Check if user is verified before allowing application
    if (!isVerified) {
      setSelectedGig(null) // Close gig detail modal first
      setTimeout(() => setShowVerificationModal(true), 100) // Then show verification modal
      return
    }

    setIsApplying(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          gig_id: gig.id,
          creator_id: user.id,
          company_id: gig.company_id,
          message: applicationMessage || 'Me interesa esta oportunidad',
          proposal_text: applicationMessage || 'Me interesa esta oportunidad',
          status: 'pending'
        })
      })

      if (response.ok) {
        setAppliedGigs(prev => new Set([...Array.from(prev), gig.id]))
        setSelectedGig(null)
        setApplicationMessage('')
        // Show success toast
        setShowSuccessToast(true)
        setCountdown(5)
      } else {
        const error = await response.text()
        console.error('Error applying:', response.status, error)
        // Show specific error to help debug
        if (error.includes('duplicate')) {
          alert('Ya aplicaste a este trabajo.')
        } else if (error.includes('violates row-level security')) {
          alert('Error de permisos. Contacta soporte. (RLS)')
        } else {
          alert(`Error al aplicar: ${error}`)
        }
      }
    } catch (err) {
      console.error('Error applying to gig:', err)
      alert('Error al aplicar. Intenta de nuevo.')
    } finally {
      setIsApplying(false)
    }
  }

  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = !searchQuery ||
      gig.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.category?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const sortedGigs = [...filteredGigs].sort((a, b) => {
    if (filter === 'mejor_pago') {
      const priceA = parseInt(a.budget?.replace(/\D/g, '') || '0')
      const priceB = parseInt(b.budget?.replace(/\D/g, '') || '0')
      return priceB - priceA
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const getGradient = (index: number) => {
    const gradients = [
      'from-violet-600 via-purple-600 to-blue-600',
      'from-rose-500 via-pink-500 to-purple-500',
      'from-emerald-500 via-teal-500 to-cyan-500',
      'from-orange-500 via-red-500 to-pink-500',
      'from-blue-600 via-indigo-600 to-purple-600',
      'from-amber-500 via-orange-500 to-red-500',
    ]
    return gradients[index % gradients.length]
  }

  const formatBudget = (budget: string) => {
    if (!budget) return '$0'
    return budget
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `hace ${diffMins}m`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return `hace ${Math.floor(diffDays / 7)}sem`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Cargando oportunidades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-emerald-500 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-emerald-400">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg">Aplicacion Enviada</p>
              <p className="text-white/80 text-sm">Este mensaje desaparecera en {countdown}s</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-xl">
              {countdown}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-neutral-900 sticky top-0 z-20 border-b border-neutral-800">
        <div className="px-4 py-3 pl-16">
          {/* Search Bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Explorar Trabajos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-neutral-800 rounded-full text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-neutral-700"
              />
            </div>
            <Link href="/creator/profile" className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              {user ? (
                <span className="text-white font-bold">{user.email?.charAt(0).toUpperCase()}</span>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('para_ti')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'para_ti'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Para Ti
            </button>
            <button
              onClick={() => setFilter('mejor_pago')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'mejor_pago'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Mejor Pago
            </button>
            <button
              onClick={() => setFilter('tendencia')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'tendencia'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Tendencia
            </button>
          </div>
        </div>
      </div>

      {/* Gigs Grid */}
      <div className="px-4 py-4 pb-28">
        {sortedGigs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-neutral-800 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">No hay trabajos disponibles</h3>
            <p className="text-neutral-400 mb-6 max-w-sm mx-auto">
              Las empresas publicaran oportunidades muy pronto. Completa tu perfil para estar listo.
            </p>
            <Link
              href="/creator/profile"
              className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-full font-semibold hover:bg-emerald-600 transition-colors"
            >
              Completar Mi Perfil
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGigs.map((gig, index) => (
              <div
                key={gig.id}
                onClick={() => setSelectedGig(gig)}
                className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-emerald-500/50 transition-all cursor-pointer group"
              >
                {/* Card Image */}
                <div className={`h-52 relative bg-gradient-to-br ${getGradient(index)}`}>
                  {gig.image_url && gig.image_url.startsWith('http') ? (
                    <img
                      src={gig.image_url}
                      alt={gig.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken image
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Company Logo */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                      {gig.company_logo ? (
                        <img src={gig.company_logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-gray-800 font-bold text-sm">
                          {(gig.company_name || gig.title)?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-white font-semibold text-sm drop-shadow-lg">
                      {gig.company_name || 'Empresa'}
                    </span>
                  </div>

                  {/* Title Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="text-white font-bold text-lg leading-tight">{gig.title}</h3>
                  </div>

                  {/* Applied Badge */}
                  {appliedGigs.has(gig.id) && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Aplicado
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-emerald-400">{formatBudget(gig.budget)}</span>
                    <span className="text-sm text-neutral-500">{getTimeAgo(gig.created_at)}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (appliedGigs.has(gig.id)) {
                        router.push('/creator/applications')
                      } else if (!user) {
                        router.push('/auth/login')
                      } else if (!isVerified) {
                        setShowVerificationModal(true)
                      } else {
                        setSelectedGig(gig)
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      appliedGigs.has(gig.id)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {appliedGigs.has(gig.id) ? 'Ver Aplicacion' : 'Aplicar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 safe-area-bottom">
        <div className="flex justify-around py-2">
          <div className="flex flex-col items-center py-2 px-4 text-emerald-400">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs font-medium mt-1">Trabajos</span>
          </div>

          <Link href="/creator/analytics" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium mt-1">Analytics</span>
          </Link>

          <Link href="/creator/applications" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium mt-1">Aplicaciones</span>
          </Link>

          <Link href="/creator/messages" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium mt-1">Mensajes</span>
          </Link>

          <Link href="/creator/profile" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium mt-1">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-emerald-500 mx-auto w-32 rounded-full mb-2"></div>
      </div>

      {/* Verification Required Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6 border border-neutral-800">
            {/* Icon */}
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Verificacion Requerida</h3>
              <p className="text-neutral-400">
                Para aplicar a trabajos, necesitas verificar al menos una de tus redes sociales.
                Esto ayuda a las empresas a confiar en ti y ver tus estadisticas reales.
              </p>
            </div>

            {/* Benefits */}
            <div className="bg-neutral-800 rounded-xl p-4 mb-6 border border-neutral-700">
              <p className="text-sm font-medium text-neutral-300 mb-2">Al verificar obtendras:</p>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Acceso a aplicar a todos los trabajos
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Perfil destacado para empresas
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Mayor probabilidad de ser seleccionado
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Link
                href="/creator/profile?section=verification"
                className="block w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-center hover:bg-emerald-600 transition-all"
              >
                Verificar Mi Cuenta
              </Link>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="w-full py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700 transition-colors border border-neutral-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gig Detail Modal */}
      {selectedGig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-800">
            {/* Modal Header Image */}
            <div className={`h-48 relative bg-gradient-to-br ${getGradient(gigs.indexOf(selectedGig))}`}>
              {selectedGig.image_url && selectedGig.image_url.startsWith('http') ? (
                <img
                  src={selectedGig.image_url}
                  alt={selectedGig.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedGig(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Company Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700">
                  {selectedGig.company_logo ? (
                    <img src={selectedGig.company_logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {(selectedGig.company_name || selectedGig.title)?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{selectedGig.company_name || 'Empresa'}</h3>
                  <p className="text-neutral-500 text-sm">{selectedGig.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">{formatBudget(selectedGig.budget)}</div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white mb-4">{selectedGig.title}</h2>

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-neutral-300 mb-2">Lo que haras:</h4>
                <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                  <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{selectedGig.description}</p>
                </div>
              </div>

              {/* Requirements */}
              {selectedGig.requirements && (
                <div className="mb-6">
                  <h4 className="font-semibold text-neutral-300 mb-2">Requisitos:</h4>
                  <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                    <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{selectedGig.requirements}</p>
                  </div>
                </div>
              )}

              {/* Real Applicants Count - NO FAKE DATA */}
              {(selectedGig.applicants_count || 0) > 0 && (
                <div className="text-center py-3 mb-4 bg-amber-500/20 rounded-xl border border-amber-500/30">
                  <span className="text-amber-400 font-medium">
                    {selectedGig.applicants_count} {selectedGig.applicants_count === 1 ? 'persona ha aplicado' : 'personas han aplicado'}
                  </span>
                </div>
              )}

              {/* Apply Section */}
              {appliedGigs.has(selectedGig.id) ? (
                <div className="text-center">
                  <div className="bg-emerald-500/20 text-emerald-400 py-4 px-6 rounded-xl mb-4 flex items-center justify-center gap-2 border border-emerald-500/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-bold">Ya aplicaste a este trabajo</span>
                  </div>
                  <Link
                    href="/creator/applications"
                    className="block w-full py-4 bg-neutral-800 text-neutral-300 rounded-xl font-bold text-center hover:bg-neutral-700 transition-colors border border-neutral-700"
                  >
                    Ver Mis Aplicaciones
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    placeholder="Escribe un mensaje para la empresa (opcional)..."
                    className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() => handleApply(selectedGig)}
                    disabled={isApplying}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isApplying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <span>Aplicar Ahora</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
