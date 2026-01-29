'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface ProfileSection {
  id: string
  title: string
  icon: string
  component: JSX.Element
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [bioData, setBioData] = useState<any>({})
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('account')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    console.log('[Profile] Loading profile data...')

    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        console.log('[Profile] No token, redirecting to login')
        window.location.href = '/auth/login'
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      // Fetch profile using REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (!response.ok) {
        console.log('[Profile] Failed to fetch profile')
        window.location.href = '/auth/login'
        return
      }

      const profiles = await response.json()

      if (profiles.length === 0) {
        console.log('[Profile] No profile found')
        window.location.href = '/auth/select-type'
        return
      }

      const profileData = profiles[0]
      setProfile(profileData)

      // Parse bio JSON to get all the data
      if (profileData.bio) {
        try {
          const parsed = JSON.parse(profileData.bio)
          setBioData(parsed)
          console.log('[Profile] Bio data loaded:', parsed)
        } catch (e) {
          console.log('[Profile] Bio is not JSON')
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('[Profile] Error:', error)
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

  // Account Information Section
  const AccountSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacion Personal</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Nombre Completo</span>
            <span className="font-medium text-gray-900">
              {profile?.full_name || `${bioData.firstName || ''} ${bioData.lastName || ''}`.trim() || 'Sin configurar'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Email</span>
            <span className="font-medium text-gray-900">{user?.email || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Telefono</span>
            <span className="font-medium text-gray-900">{bioData.phoneNumber || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Ubicacion</span>
            <span className="font-medium text-gray-900">{bioData.location || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Nivel Academico</span>
            <span className="font-medium text-gray-900">{bioData.academicLevel || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Estudios</span>
            <span className="font-medium text-gray-900">{bioData.studies || 'Sin configurar'}</span>
          </div>
        </div>
        <button className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Editar Informacion
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociales</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-gray-600">Instagram</span>
            </div>
            <span className="font-medium text-gray-900">
              {bioData.instagram ? `@${bioData.instagram}` : 'Sin configurar'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.432-1.884-1.432-3.052V.621h-3.714v14.325c0 1.568-1.277 2.845-2.845 2.845s-2.845-1.277-2.845-2.845 1.277-2.845 2.845-2.845c.195 0 .39.02.579.058V8.539c-.193-.013-.386-.02-.579-.02-3.462 0-6.265 2.803-6.265 6.265s2.803 6.265 6.265 6.265 6.265-2.803 6.265-6.265V8.317a9.14 9.14 0 0 0 5.125 1.553V6.538a5.549 5.549 0 0 1-2.119-.976z"/>
                </svg>
              </div>
              <span className="text-gray-600">TikTok</span>
            </div>
            <span className="font-medium text-gray-900">
              {bioData.tiktok ? `@${bioData.tiktok}` : 'Sin configurar'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <span className="text-gray-600">YouTube</span>
            </div>
            <span className="font-medium text-gray-900">
              {bioData.youtube ? `@${bioData.youtube}` : 'Sin configurar'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <span className="text-gray-600">LinkedIn</span>
            </div>
            <span className="font-medium text-gray-900">
              {bioData.linkedin ? bioData.linkedin : 'Sin configurar'}
            </span>
          </div>
        </div>
      </div>

      {/* Experience & Niche */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Experiencia</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Nicho</span>
            <span className="font-medium text-gray-900">{bioData.niche || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Nivel de Experiencia</span>
            <span className="font-medium text-gray-900">{bioData.experienceLevel || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Testimonial</span>
            <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">
              {bioData.testimonial || 'Sin configurar'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  // Earnings Section
  const EarningsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Resumen de Ganancias</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-xl">
            <p className="text-green-600 text-sm mb-1">Total Ganado</p>
            <p className="text-2xl font-bold text-green-700">$0</p>
            <p className="text-xs text-green-600 mt-1">Desde el inicio</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-blue-600 text-sm mb-1">Este Mes</p>
            <p className="text-2xl font-bold text-blue-700">$0</p>
            <p className="text-xs text-blue-600 mt-1">0 campanas</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Pendiente de Pago</span>
            <span className="font-medium text-gray-900">$0</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">En Revision</span>
            <span className="font-medium text-gray-900">$0</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Proximo Pago</span>
            <span className="font-medium text-gray-900">No programado</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Metodos de Pago</h3>
        <p className="text-gray-600 mb-4">No tienes metodos de pago configurados</p>
        <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Agregar Metodo de Pago
        </button>
      </div>
    </div>
  )

  // Privacy & Security Section
  const SecuritySection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seguridad de la Cuenta</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Contrasena</p>
              <p className="text-sm text-gray-500">Ultima actualizacion: Nunca</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 font-medium">Cambiar</button>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Autenticacion de dos factores</p>
              <p className="text-sm text-gray-500">Anade una capa extra de seguridad</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 font-medium">Activar</button>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-medium text-gray-900">Dispositivos conectados</p>
              <p className="text-sm text-gray-500">1 dispositivo activo</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 font-medium">Ver todos</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacidad</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Perfil Publico</p>
              <p className="text-sm text-gray-500">Las marcas pueden ver tu perfil</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-medium text-gray-900">Mostrar Estadisticas</p>
              <p className="text-sm text-gray-500">Campanas completadas y rating</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Zona de Peligro</h3>
        <p className="text-sm text-red-700 mb-4">Una vez que elimines tu cuenta, no hay vuelta atras. Por favor, estes seguro.</p>
        <button className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
          Eliminar Cuenta
        </button>
      </div>
    </div>
  )

  // Statistics Section
  const StatsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Estadisticas de Rendimiento</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600">Campanas Completadas</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">0%</p>
            <p className="text-sm text-gray-600">Tasa de Exito</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600">Aplicaciones</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">0.0</p>
            <p className="text-sm text-gray-600">Rating Promedio</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 text-center">
            Las estadisticas se actualizan en tiempo real
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="text-center py-8 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No hay actividad reciente</p>
          <p className="text-sm mt-2">Comienza aplicando a trabajos disponibles</p>
        </div>
      </div>
    </div>
  )

  const sections: ProfileSection[] = [
    { id: 'account', title: 'Mi Cuenta', icon: '👤', component: <AccountSection /> },
    { id: 'earnings', title: 'Ganancias', icon: '💰', component: <EarningsSection /> },
    { id: 'stats', title: 'Estadisticas', icon: '📊', component: <StatsSection /> },
    { id: 'security', title: 'Seguridad', icon: '🔒', component: <SecuritySection /> }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  const displayName = profile?.full_name || `${bioData.firstName || ''} ${bioData.lastName || ''}`.trim() || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
            {bioData.profilePhoto ? (
              <img src={bioData.profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            <p className="text-gray-600">{user?.email || 'Sin email'}</p>
            {bioData.location && (
              <p className="text-sm text-gray-500 mt-1">📍 {bioData.location}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[65px] z-10">
        <div className="px-4">
          <div className="flex space-x-6 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-20">
        {sections.find(s => s.id === activeSection)?.component}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cerrar sesion</h3>
              <p className="text-gray-600">¿Estas seguro de que quieres cerrar tu sesion?</p>
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
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
