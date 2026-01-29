'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function CreatorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalCampaigns: 0,
    pendingApplications: 0,
    thisMonth: 0
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

      // Fetch profile using REST API (not supabase client)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0) {
          const profileData = profiles[0]
          setProfile(profileData)

          // Check if user is a creator
          if (profileData.user_type !== 'creator') {
            if (profileData.user_type === 'company') {
              window.location.href = '/company/dashboard'
            } else {
              window.location.href = '/auth/select-type'
            }
            return
          }

          // Parse bio data if it exists
          if (profileData.bio) {
            try {
              const bioData = JSON.parse(profileData.bio)
              setProfile({ ...profileData, ...bioData })
            } catch (e) {
              // bio is not JSON, that's fine
            }
          }
        } else {
          // No profile found
          window.location.href = '/auth/select-type'
          return
        }
      } else {
        window.location.href = '/auth/login'
        return
      }

      setLoading(false)
    } catch (err) {
      console.error('Auth check error:', err)
      window.location.href = '/auth/login'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('creatorOnboarding')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Panel</h1>
              <p className="text-sm text-gray-500">Gestiona tu actividad como creador</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 pb-24">
        {/* Profile Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                ¡Hola {displayName}! 👋
              </h2>
              <p className="text-white/90 text-sm mb-3">
                {profile?.location && `📍 ${profile.location}`}
              </p>
              <div className="flex gap-2 flex-wrap">
                {profile?.instagram && (
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-xs text-white">📸 @{profile.instagram}</span>
                  </div>
                )}
                {profile?.tiktok && (
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-xs text-white">🎵 @{profile.tiktok}</span>
                  </div>
                )}
                {profile?.youtube && (
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-xs text-white">▶️ @{profile.youtube}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg bg-white/20 flex items-center justify-center">
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">${stats.totalEarnings}</div>
            <div className="text-sm text-gray-500">Ganancias Totales</div>
          </div>

          <div className="h-32 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl mb-4 flex items-center justify-center">
            <span className="text-gray-500">📊 Gráfico de Rendimiento</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{stats.totalCampaigns}</div>
              <div className="text-xs text-gray-500">Campañas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">0K</div>
              <div className="text-xs text-gray-500">Vistas Totales</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pendientes</span>
              <span className="text-orange-500">⏳</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</div>
            <div className="text-xs text-gray-500">Aplicaciones</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Esta Semana</span>
              <span className="text-green-500">💰</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${stats.thisMonth}</div>
            <div className="text-xs text-gray-500">Ganancias</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campañas Recientes</h3>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🎯</div>
            <p>No tienes campañas recientes</p>
            <p className="text-sm mt-2">¡Aplica a trabajos para empezar a ganar!</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            href="/gigs"
            className="bg-blue-600 text-white rounded-xl p-4 text-center font-semibold shadow-sm"
          >
            <div className="text-lg mb-1">🔍</div>
            <div className="text-sm">Buscar Trabajos</div>
          </Link>

          <Link
            href="/creator/profile"
            className="bg-gray-800 text-white rounded-xl p-4 text-center font-semibold shadow-sm"
          >
            <div className="text-lg mb-1">👤</div>
            <div className="text-sm">Mi Perfil</div>
          </Link>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Consejos Pro</h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-700">• Aplica rápido a las campañas para mejores oportunidades</div>
            <div className="text-sm text-gray-700">• Sube muestras de alta calidad a tu portafolio</div>
            <div className="text-sm text-gray-700">• Revisa tus métricas semanalmente para ver tu crecimiento</div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Trabajos</span>
          </Link>

          <div className="flex flex-col items-center space-y-1 text-blue-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-xs font-medium">Panel</span>
          </div>

          <Link href="/creator/analytics" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            <span className="text-xs font-medium">Analytics</span>
          </Link>

          <Link href="/creator/profile" className="flex flex-col items-center space-y-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Perfil</span>
          </Link>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cerrar sesión</h3>
              <p className="text-gray-600">¿Estás seguro de que quieres cerrar tu sesión?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
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
