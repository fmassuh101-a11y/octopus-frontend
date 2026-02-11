'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Application {
  id: string
  status: string
  created_at: string
  gig: {
    title: string
    budget_min: number
    budget_max: number
  }
}

export default function CreatorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [wallet, setWallet] = useState<{ balance: number; pending_balance: number; total_earned: number } | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    completed: 0
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        window.location.href = '/auth/login'
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      const headers = {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY
      }

      // Fetch profile first (needed to check user_type)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, { headers })

      if (response.ok) {
        const profiles = await response.json()

        if (profiles.length > 0) {
          const profileData = profiles[0]

          if (profileData.user_type !== 'creator') {
            if (profileData.user_type === 'company') {
              window.location.href = '/company/dashboard'
            } else {
              window.location.href = '/auth/select-type'
            }
            return
          }

          // Parse bio data
          let finalProfile = profileData
          if (profileData.bio) {
            try {
              const bioData = JSON.parse(profileData.bio)
              finalProfile = { ...profileData, ...bioData }
            } catch (e) {}
          }
          setProfile(finalProfile)

          // PARALLEL FETCH: wallet + applications (all for stats) in one go
          const [walletRes, appsRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userData.id}&select=*`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${userData.id}&select=id,status,created_at,gig:gigs(title,budget_min,budget_max)&order=created_at.desc`, { headers })
          ])

          // Process wallet
          if (walletRes.ok) {
            const wallets = await walletRes.json()
            if (wallets.length > 0) {
              setWallet(wallets[0])
            }
          }

          // Process applications (get all, then slice for display)
          if (appsRes.ok) {
            const allApps = await appsRes.json()
            setApplications(allApps.slice(0, 5)) // Recent 5 for display

            // Calculate stats from same data (no extra fetch!)
            setStats({
              pending: allApps.filter((a: any) => a.status === 'pending').length,
              accepted: allApps.filter((a: any) => a.status === 'accepted').length,
              completed: allApps.filter((a: any) => a.status === 'completed').length
            })
          }

          setLoading(false)
        } else {
          window.location.href = '/auth/select-type'
        }
      } else {
        window.location.href = '/auth/select-type'
      }
    } catch (err) {
      console.error('[Dashboard] Error:', err)
      window.location.href = '/auth/select-type'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('creatorOnboarding')
    window.location.href = '/'
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      'pending': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pendiente' },
      'accepted': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Aceptado' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rechazado' },
      'completed': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Completado' }
    }
    return config[status] || { bg: 'bg-neutral-500/20', text: 'text-neutral-400', label: status }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        {/* Skeleton Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
              <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
            </div>
          </div>
          {/* Skeleton Balance Card */}
          <div className="bg-emerald-600/30 rounded-3xl p-6 animate-pulse">
            <div className="h-4 w-28 bg-white/20 rounded mb-4" />
            <div className="h-12 w-40 bg-white/20 rounded mb-4" />
            <div className="flex gap-6">
              <div className="h-10 w-24 bg-white/20 rounded" />
              <div className="h-10 w-24 bg-white/20 rounded" />
            </div>
          </div>
        </div>
        {/* Skeleton Stats */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse">
                <div className="h-8 w-12 bg-white/10 rounded mx-auto mb-2" />
                <div className="h-3 w-16 bg-white/10 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
        {/* Skeleton Quick Actions */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-500/30 rounded-2xl p-5 h-32 animate-pulse" />
            <div className="bg-white/5 rounded-2xl p-5 h-32 animate-pulse" />
          </div>
        </div>
        {/* Skeleton Applications */}
        <div className="px-4">
          <div className="h-6 w-36 bg-white/10 rounded mb-4 animate-pulse" />
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse">
                <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
                <div className="h-4 w-1/2 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/50 text-sm">{greeting}</p>
            <h1 className="text-2xl font-bold">{displayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <Link href="/creator/profile" className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center font-bold">
              {displayName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>

        {/* Balance Card */}
        <Link href="/creator/wallet" className="block">
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl p-6 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 border-[15px] border-white rounded-full" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-emerald-100 text-sm font-medium">Balance Disponible</span>
                <span className="text-emerald-100/60 text-xs">Toca para ver detalles →</span>
              </div>

              <h2 className="text-5xl font-black mb-4">${wallet?.balance?.toFixed(2) || '0.00'}</h2>

              <div className="flex gap-6">
                <div>
                  <p className="text-emerald-100/60 text-xs">Total Ganado</p>
                  <p className="text-lg font-bold">${wallet?.total_earned?.toFixed(2) || '0.00'}</p>
                </div>
                {wallet && wallet.pending_balance > 0 && (
                  <div>
                    <p className="text-emerald-100/60 text-xs">En Proceso</p>
                    <p className="text-lg font-bold text-amber-300">${wallet.pending_balance.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
            <p className="text-xs text-white/40 mt-1">Pendientes</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <p className="text-3xl font-bold text-emerald-400">{stats.accepted}</p>
            <p className="text-xs text-white/40 mt-1">Aceptados</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <p className="text-3xl font-bold text-blue-400">{stats.completed}</p>
            <p className="text-xs text-white/40 mt-1">Completados</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/gigs" className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 flex flex-col items-start">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-xl">🔍</span>
            </div>
            <h3 className="font-bold mb-1">Buscar Trabajos</h3>
            <p className="text-xs text-white/70">Encuentra gigs y campañas</p>
          </Link>

          <Link href="/creator/applications" className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-start">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3">
              <span className="text-xl">📋</span>
            </div>
            <h3 className="font-bold mb-1">Mis Aplicaciones</h3>
            <p className="text-xs text-white/50">Ver estado de aplicaciones</p>
          </Link>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Actividad Reciente</h2>
          {applications.length > 0 && (
            <Link href="/creator/applications" className="text-sm text-white/50 hover:text-white">
              Ver todo →
            </Link>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="font-semibold mb-2">Sin aplicaciones aún</h3>
            <p className="text-white/40 text-sm mb-4">Empieza a buscar trabajos y aplica a los que te interesen</p>
            <Link href="/gigs" className="inline-block bg-white text-black px-6 py-2 rounded-full font-semibold text-sm hover:bg-white/90 transition-colors">
              Buscar Trabajos
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const status = getStatusConfig(app.status)
              return (
                <div key={app.id} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold flex-1 pr-2">{app.gig?.title || 'Gig'}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-400 font-medium">
                      ${app.gig?.budget_min} - ${app.gig?.budget_max}
                    </span>
                    <span className="text-white/40 text-xs">
                      {new Date(app.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5">
          <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <span>💡</span> Consejos Pro
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li>• Aplica rápido a las campañas nuevas</li>
            <li>• Mantén tu perfil actualizado con tu mejor trabajo</li>
            <li>• Responde a los mensajes en menos de 24h</li>
          </ul>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">💼</span>
            <span className="text-[10px]">Trabajos</span>
          </Link>
          <div className="flex flex-col items-center gap-1 text-white">
            <span className="text-xl">📊</span>
            <span className="text-[10px] font-medium">Panel</span>
          </div>
          <Link href="/creator/wallet" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">💰</span>
            <span className="text-[10px]">Wallet</span>
          </Link>
          <Link href="/creator/messages" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">💬</span>
            <span className="text-[10px]">Mensajes</span>
          </Link>
          <Link href="/creator/profile" className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xl">👤</span>
            <span className="text-[10px]">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-white/20 mx-auto w-32 rounded-full mb-2" />
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Cerrar sesión</h3>
              <p className="text-white/60">¿Estás seguro de que quieres cerrar tu sesión?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-4 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-400 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
