'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'aw5n2omdzbjx4xf8'

interface ProfileSection {
  id: string
  title: string
  icon: string
  component: JSX.Element
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<any>(null)
  const [bioData, setBioData] = useState<any>({})
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('account')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    loadProfileData()
    // Check if there's a section parameter in the URL
    const section = searchParams.get('section')
    if (section && ['account', 'verification', 'earnings', 'stats', 'security'].includes(section)) {
      setActiveSection(section)
    }
  }, [searchParams])

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
      console.log('[Profile] User loaded:', userData.email, userData.id)

      let finalBioData: any = {}
      let finalProfile: any = {}

      // FIRST: Try Supabase (this is the source of truth)
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY || ''
          }
        })

        console.log('[Profile] Supabase response:', response.status)

        if (response.ok) {
          const profiles = await response.json()
          console.log('[Profile] Profiles found:', profiles.length)

          if (profiles.length > 0) {
            const profileData = profiles[0]
            console.log('[Profile] Profile from Supabase:', profileData)

            // Map database fields to expected format
            finalProfile = {
              ...profileData,
              // Map snake_case to camelCase for compatibility
              phoneNumber: profileData.phone_number,
              academicLevel: profileData.academic_level,
              linkedInUrl: profileData.linkedin_url,
              profilePhoto: profileData.profile_photo_url || profileData.avatar_url,
              firstName: profileData.full_name?.split(' ')[0] || '',
              lastName: profileData.full_name?.split(' ').slice(1).join(' ') || ''
            }

            finalBioData = { ...finalProfile }

            // Parse bio data if it exists (for backward compatibility)
            if (profileData.bio) {
              try {
                const parsedBio = JSON.parse(profileData.bio)
                console.log('[Profile] Parsed bio from Supabase:', parsedBio)
                // Merge but prefer direct database fields
                finalBioData = { ...parsedBio, ...finalBioData }
                finalProfile = { ...parsedBio, ...finalProfile }

                // Also save to localStorage for faster loading next time
                localStorage.setItem('creatorOnboarding', JSON.stringify(finalBioData))
              } catch (e) {
                console.log('[Profile] Bio is not JSON, using as-is')
              }
            }
          }
        }
      } catch (fetchError) {
        console.error('[Profile] Supabase fetch error:', fetchError)
      }

      // FALLBACK: If no Supabase data, try localStorage
      if (Object.keys(finalBioData).length === 0) {
        const onboardingStr = localStorage.getItem('creatorOnboarding')
        if (onboardingStr) {
          try {
            const onboardingData = JSON.parse(onboardingStr)
            console.log('[Profile] Fallback to localStorage data:', onboardingData)
            finalBioData = onboardingData
            finalProfile = { ...finalProfile, ...onboardingData }
          } catch (e) {
            console.log('[Profile] Could not parse localStorage data')
          }
        }
      }

      setBioData(finalBioData)
      setProfile(finalProfile)
      setLoading(false)
    } catch (error) {
      console.error('[Profile] Error:', error)
      setLoading(false)
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
  const AccountSection = () => {
    // Use profile (with merged bio) or fallback to bioData
    const data = { ...bioData, ...profile }

    return (
    <div className="space-y-6">
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Informacion Personal</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Nombre Completo</span>
            <span className="font-medium text-white">
              {data.full_name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Sin configurar'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Email</span>
            <span className="font-medium text-white">{user?.email || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Telefono</span>
            <span className="font-medium text-white">{data.phoneNumber || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Ubicacion</span>
            <span className="font-medium text-white">{data.location || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Nivel Academico</span>
            <span className="font-medium text-white">{data.academicLevel || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-neutral-400">Estudios</span>
            <span className="font-medium text-white">{data.studies || 'Sin configurar'}</span>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/onboarding/creator/name'}
          className="mt-6 w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
        >
          {data.firstName ? 'Editar Informacion' : 'Completar Perfil'}
        </button>
      </div>

      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Redes Sociales</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-neutral-400">Instagram</span>
            </div>
            <span className="font-medium text-white">
              {data.instagram ? `@${data.instagram}` : 'Sin configurar'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.432-1.884-1.432-3.052V.621h-3.714v14.325c0 1.568-1.277 2.845-2.845 2.845s-2.845-1.277-2.845-2.845 1.277-2.845 2.845-2.845c.195 0 .39.02.579.058V8.539c-.193-.013-.386-.02-.579-.02-3.462 0-6.265 2.803-6.265 6.265s2.803 6.265 6.265 6.265 6.265-2.803 6.265-6.265V8.317a9.14 9.14 0 0 0 5.125 1.553V6.538a5.549 5.549 0 0 1-2.119-.976z"/>
                </svg>
              </div>
              <span className="text-neutral-400">TikTok</span>
            </div>
            <span className="font-medium text-white">
              {data.tiktok ? `@${data.tiktok}` : 'Sin configurar'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <span className="text-neutral-400">YouTube</span>
            </div>
            <span className="font-medium text-white">
              {data.youtube ? `@${data.youtube}` : 'Sin configurar'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <span className="text-neutral-400">LinkedIn</span>
            </div>
            <span className="font-medium text-white">
              {data.linkedInUrl || data.linkedin || 'Sin configurar'}
            </span>
          </div>
        </div>
      </div>

      {/* Experience & Education */}
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Educacion y Experiencia</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Nivel Academico</span>
            <span className="font-medium text-white">{data.academicLevel || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Estudios</span>
            <span className="font-medium text-white">{data.studies || 'Sin configurar'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-neutral-400">LinkedIn</span>
            <span className="font-medium text-white text-right max-w-[200px] truncate">
              {data.linkedInUrl ? (
                <a href={data.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                  Ver perfil
                </a>
              ) : 'Sin configurar'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )}

  // Earnings Section
  const EarningsSection = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-6">Resumen de Ganancias</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-xl">
            <p className="text-green-600 text-sm mb-1">Total Ganado</p>
            <p className="text-2xl font-bold text-green-700">$0</p>
            <p className="text-xs text-green-600 mt-1">Desde el inicio</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-emerald-400 text-sm mb-1">Este Mes</p>
            <p className="text-2xl font-bold text-blue-700">$0</p>
            <p className="text-xs text-emerald-400 mt-1">0 campanas</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">Pendiente de Pago</span>
            <span className="font-medium text-white">$0</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <span className="text-neutral-400">En Revision</span>
            <span className="font-medium text-white">$0</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-neutral-400">Proximo Pago</span>
            <span className="font-medium text-white">No programado</span>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Metodos de Pago</h3>
        <p className="text-neutral-400 mb-4">No tienes metodos de pago configurados</p>
        <button className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
          Agregar Metodo de Pago
        </button>
      </div>
    </div>
  )

  // Privacy & Security Section
  const SecuritySection = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Seguridad de la Cuenta</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <div>
              <p className="font-medium text-white">Contrasena</p>
              <p className="text-sm text-neutral-500">Ultima actualizacion: Nunca</p>
            </div>
            <button className="text-emerald-400 hover:text-blue-700 font-medium">Cambiar</button>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <div>
              <p className="font-medium text-white">Autenticacion de dos factores</p>
              <p className="text-sm text-neutral-500">Anade una capa extra de seguridad</p>
            </div>
            <button className="text-emerald-400 hover:text-blue-700 font-medium">Activar</button>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-medium text-white">Dispositivos conectados</p>
              <p className="text-sm text-neutral-500">1 dispositivo activo</p>
            </div>
            <button className="text-emerald-400 hover:text-blue-700 font-medium">Ver todos</button>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Privacidad</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-neutral-800">
            <div>
              <p className="font-medium text-white">Perfil Publico</p>
              <p className="text-sm text-neutral-500">Las marcas pueden ver tu perfil</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-medium text-white">Mostrar Estadisticas</p>
              <p className="text-sm text-neutral-500">Campanas completadas y rating</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
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

  // Handle TikTok OAuth connection - go directly to TikTok
  const handleConnectTikTok = () => {
    console.log('[TikTok] handleConnectTikTok called from profile')
    try {
      const redirectUri = encodeURIComponent('https://octopus-frontend-tau.vercel.app/')
      const scope = encodeURIComponent('user.info.basic,user.info.profile,user.info.stats,video.list')
      const state = Math.random().toString(36).substring(7)

      localStorage.setItem('tiktok_oauth_state', state)

      const webAuthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=${state}&disable_auto_auth=1`
      console.log('[TikTok] Redirecting to:', webAuthUrl)
      window.location.href = webAuthUrl
    } catch (error) {
      console.error('[TikTok] Error:', error)
      alert('Error: ' + error)
    }
  }

  // Verification Section - REAL OAuth verification
  const VerificationSection = () => {
    const data = { ...bioData, ...profile }
    const tiktokAccounts = data.tiktokAccounts || []
    const isTiktokVerified = data.tiktokConnected && tiktokAccounts.length > 0
    const tiktokAccount = tiktokAccounts[0] // Get first connected account

    return (
      <div className="space-y-6">
        {/* Verification Status Card */}
        <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Verificacion de Cuentas</h3>
              <p className="text-sm text-neutral-500">Conecta tus redes para aplicar a trabajos</p>
            </div>
          </div>

          {/* Warning if not verified */}
          {!isTiktokVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-amber-800">Verifica al menos una cuenta</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Necesitas verificar al menos una red social para poder aplicar a trabajos. Esto ayuda a las empresas a confiar en ti.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success if verified */}
          {isTiktokVerified && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-green-800">Cuenta verificada</p>
                  <p className="text-sm text-green-700 mt-1">
                    Ya puedes aplicar a trabajos. Las empresas podran ver tus estadisticas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TikTok */}
          <div className={`p-4 rounded-xl border-2 transition-colors ${
            isTiktokVerified ? 'border-green-500 bg-green-50' : 'border-neutral-800 bg-neutral-950'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.432-1.884-1.432-3.052V.621h-3.714v14.325c0 1.568-1.277 2.845-2.845 2.845s-2.845-1.277-2.845-2.845 1.277-2.845 2.845-2.845c.195 0 .39.02.579.058V8.539c-.193-.013-.386-.02-.579-.02-3.462 0-6.265 2.803-6.265 6.265s2.803 6.265 6.265 6.265 6.265-2.803 6.265-6.265V8.317a9.14 9.14 0 0 0 5.125 1.553V6.538a5.549 5.549 0 0 1-2.119-.976z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">TikTok</p>
                    {isTiktokVerified && (
                      <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Verificado
                      </span>
                    )}
                  </div>
                  {isTiktokVerified && tiktokAccount ? (
                    <p className="text-sm text-neutral-400">@{tiktokAccount.username} · {tiktokAccount.followers?.toLocaleString() || 0} seguidores</p>
                  ) : (
                    <p className="text-sm text-neutral-500">No conectado</p>
                  )}
                </div>
              </div>

              {isTiktokVerified ? (
                <button
                  onClick={handleConnectTikTok}
                  className="px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-900 border border-gray-300 rounded-lg hover:bg-neutral-950 transition-colors"
                >
                  Reconectar
                </button>
              ) : (
                <button
                  onClick={handleConnectTikTok}
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Verificar
                </button>
              )}
            </div>

            {/* TikTok Stats if verified */}
            {isTiktokVerified && tiktokAccount && (
              <div className="mt-4 pt-4 border-t border-green-200 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{tiktokAccount.followers?.toLocaleString() || 0}</p>
                  <p className="text-xs text-neutral-500">Seguidores</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{tiktokAccount.likes?.toLocaleString() || 0}</p>
                  <p className="text-xs text-neutral-500">Likes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{tiktokAccount.videoCount || 0}</p>
                  <p className="text-xs text-neutral-500">Videos</p>
                </div>
              </div>
            )}
          </div>

          {/* Instagram - Coming Soon */}
          <div className="mt-4 p-4 rounded-xl border-2 border-neutral-800 bg-neutral-950 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">Instagram</p>
                  <p className="text-sm text-neutral-500">Proximamente</p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-medium text-neutral-500 bg-gray-200 rounded-full">
                Pronto
              </span>
            </div>
          </div>

          {/* YouTube - Coming Soon */}
          <div className="mt-4 p-4 rounded-xl border-2 border-neutral-800 bg-neutral-950 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">YouTube</p>
                  <p className="text-sm text-neutral-500">Proximamente</p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-medium text-neutral-500 bg-gray-200 rounded-full">
                Pronto
              </span>
            </div>
          </div>
        </div>

        {/* Why Verify Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">¿Por que verificar?</h3>
          <ul className="space-y-2 text-sm text-white/90">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Las empresas pueden ver tus estadisticas reales</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Mayor confianza = mas oportunidades de trabajo</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Requisito obligatorio para aplicar a trabajos</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // Statistics Section
  const StatsSection = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-6">Estadisticas de Rendimiento</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-neutral-950 rounded-xl">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-sm text-neutral-400">Campanas Completadas</p>
          </div>
          <div className="text-center p-4 bg-neutral-950 rounded-xl">
            <p className="text-3xl font-bold text-white">0%</p>
            <p className="text-sm text-neutral-400">Tasa de Exito</p>
          </div>
          <div className="text-center p-4 bg-neutral-950 rounded-xl">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-sm text-neutral-400">Aplicaciones</p>
          </div>
          <div className="text-center p-4 bg-neutral-950 rounded-xl">
            <p className="text-3xl font-bold text-white">0.0</p>
            <p className="text-sm text-neutral-400">Rating Promedio</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-neutral-500 text-center">
            Las estadisticas se actualizan en tiempo real
          </p>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h3>
        <div className="text-center py-8 text-neutral-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    { id: 'verification', title: 'Verificacion', icon: '🛡️', component: <VerificationSection /> },
    { id: 'earnings', title: 'Ganancias', icon: '💰', component: <EarningsSection /> },
    { id: 'stats', title: 'Estadisticas', icon: '📊', component: <StatsSection /> },
    { id: 'security', title: 'Seguridad', icon: '🔒', component: <SecuritySection /> }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        {/* Skeleton Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-6 w-24 bg-neutral-800 rounded animate-pulse" />
            <div className="w-10 h-10 bg-neutral-800 rounded-lg animate-pulse" />
          </div>
        </div>
        {/* Skeleton Profile Header */}
        <div className="bg-neutral-900 px-4 py-6 border-b border-neutral-800">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-neutral-800 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-40 bg-neutral-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Skeleton Tabs */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4">
          <div className="flex space-x-6 py-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-8 w-24 bg-neutral-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton Content */}
        <div className="px-4 py-6 space-y-6">
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <div className="h-6 w-40 bg-neutral-800 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-neutral-800">
                  <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Use profile data (which has bio merged) or fallback to bioData
  const displayName = profile?.full_name ||
    `${profile?.firstName || bioData.firstName || ''} ${profile?.lastName || bioData.lastName || ''}`.trim() ||
    user?.email?.split('@')[0] || 'Usuario'

  const profilePhoto = profile?.profilePhoto || bioData.profilePhoto

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">Mi Perfil</h1>
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
      <div className="bg-neutral-900 px-4 py-6 border-b border-neutral-800">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-neutral-400">{user?.email || 'Sin email'}</p>
            {(profile?.location || bioData.location) && (
              <p className="text-sm text-neutral-500 mt-1">📍 {profile?.location || bioData.location}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-[65px] z-10">
        <div className="px-4">
          <div className="flex space-x-6 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
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
      <div className="px-4 py-6 pb-32">
        {sections.find(s => s.id === activeSection)?.component}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-2">
          <a href="/gigs" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium mt-1">Trabajos</span>
          </a>

          <a href="/creator/dashboard" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium mt-1">Panel</span>
          </a>

          <a href="/creator/applications" className="flex flex-col items-center py-2 px-4 text-neutral-500 hover:text-neutral-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium mt-1">Aplicaciones</span>
          </a>

          <div className="flex flex-col items-center py-2 px-4 text-emerald-400">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-xs font-medium mt-1">Perfil</span>
          </div>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cerrar sesion</h3>
              <p className="text-neutral-400">¿Estas seguro de que quieres cerrar tu sesion?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-4 bg-neutral-800 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
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
