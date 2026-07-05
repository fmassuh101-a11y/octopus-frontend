'use client'
import GuidedTour from '@/components/GuidedTour'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Crown, Wallet, Briefcase, Gift as GiftIcon } from 'lucide-react'
import WorkspaceSwitcher from '@/components/ui/WorkspaceSwitcher'
import { getPlan } from '@/lib/plans'
import { getActiveCompany } from '@/lib/workspace'

const ACTION_ITEMS = [
  { id: 1, label: 'Publica tu primer trabajo', completed: false, link: '/company/jobs/new' },
  { id: 2, label: 'Invita usuarios a tu equipo', completed: false, link: '/company/settings?tab=team' },
  { id: 3, label: 'Revisa aplicaciones de creadores', completed: false, link: '/company/campaigns' },
  { id: 4, label: 'Configura método de pago', completed: false, link: '/company/settings?tab=paymentMethods' },
  { id: 5, label: 'Completa el perfil de empresa', completed: true, link: '/company/settings' },
  { id: 6, label: 'Explora el marketplace de creadores', completed: false, link: '/company/recruit' },
  { id: 7, label: 'Crea tu primera campaña', completed: false, link: '/company/jobs/new' },
]

export default function CompanyDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [stats, setStats] = useState({
    totalSpend: 0,
    totalViews: 0,
    avgCPM: 0,
    activeCreators: 0
  })
  const [wallet, setWallet] = useState<{ balance: number; pending_balance: number } | null>(null)
  const [giftModal, setGiftModal] = useState<{ type: 'plan' | 'discount'; plan: string; discount: number } | null>(null)

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

      // Fetch profile
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0) {
          const profileData = profiles[0]

          // Check if user is a company (salvo que esté trabajando en un espacio de equipo)
          if (profileData.user_type !== 'company' && !getActiveCompany()) {
            if (profileData.user_type === 'creator') {
              window.location.href = '/creator/dashboard'
              return
            }
          }

          // Notificación PRECISA: solo dispara cuando REALMENTE se agrega algo nuevo
          // (no al quitar un descuento ni al bajar de plan)
          const lastSeen = JSON.parse(localStorage.getItem('octopus-gift-state') || '{}')
          const curPlan = profileData.plan_source === 'gifted' ? profileData.plan : null
          const curDiscount = profileData.discount_percent || 0
          if (curPlan && lastSeen.plan !== curPlan) {
            setGiftModal({ type: 'plan', plan: curPlan, discount: 0 })
          } else if (curDiscount > (lastSeen.discount || 0)) {
            setGiftModal({ type: 'discount', plan: profileData.plan || 'starter', discount: curDiscount })
          }
          localStorage.setItem('octopus-gift-state', JSON.stringify({ plan: curPlan, discount: curDiscount }))

          // Parse bio data if it exists
          let finalProfile = profileData
          if (profileData.bio) {
            try {
              const bioData = JSON.parse(profileData.bio)
              finalProfile = { ...profileData, ...bioData }
            } catch (e) {}
          }
          setProfile(finalProfile)

          // PARALLEL: Fetch wallet while profile is already loaded
          fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userData.id}&select=balance,pending_balance`, {
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
          }).then(async walletRes => {
            if (walletRes.ok) {
              const wallets = await walletRes.json()
              if (wallets.length > 0) setWallet(wallets[0])
            }
          }).catch(() => {})

        } else {
          window.location.href = '/auth/select-type'
          return
        }
      } else {
        window.location.href = '/auth/select-type'
        return
      }

      setLoading(false)
    } catch (err) {
      console.error('Auth check error:', err)
      // On error, go to select-type instead of login to avoid redirect loop
      window.location.href = '/auth/select-type'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    window.location.href = '/auth/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex">
        {/* Skeleton Sidebar */}
        <div className="hidden lg:flex w-64 bg-neutral-900 border-r border-neutral-800 flex-col">
          <div className="p-6 border-b border-neutral-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-neutral-800 rounded-lg animate-pulse" />
              <div className="h-6 w-24 bg-neutral-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-10 bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="bg-neutral-900 border-b border-neutral-800 px-8 py-4">
            <div className="h-8 w-64 bg-neutral-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-neutral-800 rounded animate-pulse" />
          </div>
          <div className="p-8">
            <div className="bg-gradient-to-r from-blue-200 to-emerald-200 rounded-2xl p-8 mb-8 animate-pulse h-48" />
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-white placeholder-neutral-500">
              <div className="h-6 w-48 bg-neutral-800 rounded animate-pulse mb-6" />
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 bg-neutral-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const userName = profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      <GuidedTour storageKey="octopus-tour-company" steps={[
        { title: 'Bienvenido a Octopus', body: 'Acá conseguís creadores para promocionar tu marca. Te muestro en 4 pasos cómo funciona.' },
        { title: 'Creá una campaña', body: 'Elegí el tipo de contenido que necesitás (UGC, Clipping, Faceless y más) y publicá tu campaña. El formulario se adapta al tipo.' },
        { title: 'Revisá aplicantes', body: 'Los creadores aplican a tu campaña. Aceptá a los que te gusten y mandales un contrato con los términos.' },
        { title: 'Aprobá y pagá', body: 'Cuando el creador entrega, revisás el contenido. Al aprobarlo, se libera el pago. Mejorá tu plan para bajar la comisión.' },
      ]} />
      {/* Notificación grande: te regalaron un plan / descuento */}
      {giftModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4">
          <div className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-emerald-500/10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
              <GiftIcon className="w-8 h-8 text-emerald-400" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {giftModal.type === 'plan'
                ? `Te regalaron el plan ${getPlan(giftModal.plan).name}`
                : `Tienes ${giftModal.discount}% de descuento`}
            </h2>
            <p className="text-neutral-400 mb-6">
              {giftModal.type === 'plan'
                ? `Ya tienes acceso a todas las funciones del plan ${getPlan(giftModal.plan).name}, sin costo.`
                : `Aplicamos un ${giftModal.discount}% de descuento a tus comisiones y planes. ¡Aprovéchalo!`}
            </p>
            <button
              onClick={() => setGiftModal(null)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
            >
              Recibir
            </button>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-neutral-900 border-b border-neutral-800 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">O</span>
          </div>
          <span className="text-xl font-bold text-white">Octopus</span>
        </div>
        <button
          onClick={() => setShowMobileMenu(true)}
          className="p-2 text-neutral-400 hover:bg-neutral-800 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-neutral-900 shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-white">Menu</span>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 text-neutral-500 hover:bg-neutral-800 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-4 space-y-1">
              <Link href="/company/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg bg-blue-50 text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium">Dashboard</span>
              </Link>

              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-neutral-500 uppercase">Contratar Creadores</p>
                <div className="mt-2 space-y-1">
                  <Link href="/company/jobs" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Trabajos</span>
                  </Link>
                  <Link href="/company/recruit" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Reclutar</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-neutral-500 uppercase">Gestionar Creadores</p>
                <div className="mt-2 space-y-1">
                  <Link href="/company/contracts" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Contratos</span>
                  </Link>
                  <Link href="/company/review-content" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Revisar Contenido</span>
                  </Link>
                  <Link href="/company/campaigns" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <span>Campanas</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-neutral-500 uppercase">Rendimiento</p>
                <div className="mt-2 space-y-1">
                  <Link href="/company/analytics" onClick={() => setShowMobileMenu(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Analytics</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-neutral-500 uppercase">Configuracion</p>
                <div className="mt-2 space-y-1">
                  <a
                    href="/company/settings"
                    className="flex items-center space-x-3 px-3 py-3 rounded-lg text-neutral-200 hover:bg-neutral-950"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Ajustes</span>
                  </a>
                </div>
              </div>
            </nav>

            {/* Logout at bottom */}
            <div className="p-4 border-t border-neutral-800 mt-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar Sesion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-64 bg-neutral-900 border-r border-neutral-800 flex-col max-h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">O</span>
            </div>
            <span className="text-xl font-bold text-white">Octopus</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link
            href="/company/dashboard"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              activeNav === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-neutral-200 hover:bg-neutral-950'
            } placeholder-neutral-500`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Contratar Creadores */}
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contratar Creadores</p>
            <div className="mt-2 space-y-1">
              <Link href="/company/jobs" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Trabajos</span>
              </Link>
              <Link href="/company/applicants" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Aplicantes</span>
              </Link>
              <Link href="/company/recruit" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Reclutar</span>
              </Link>
              <Link href="/company/messages" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Mensajes</span>
              </Link>
            </div>
          </div>

          {/* Gestionar Creadores */}
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Gestionar Creadores</p>
            <div className="mt-2 space-y-1">
              <Link href="/company/contracts" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Contratos</span>
              </Link>
              <Link href="/company/review-content" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Revisar Contenido</span>
              </Link>
              <Link href="/company/campaigns" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span>Campanas</span>
              </Link>
              <Link href="/company/creators" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Creadores</span>
              </Link>
            </div>
          </div>

          {/* Rendimiento */}
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Rendimiento</p>
            <div className="mt-2 space-y-1">
              <Link href="/company/analytics" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Analytics</span>
              </Link>
            </div>
          </div>

          {/* Pagos */}
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pagos</p>
            <div className="mt-2 space-y-1">
              <Link href="/company/wallet" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-950 transition-colors">
                <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                <span>Wallet</span>
                {wallet && wallet.balance > 0 && (
                  <span className="ml-auto text-xs font-semibold text-green-600">${wallet.balance.toFixed(0)}</span>
                )}
              </Link>
            </div>
          </div>

        </nav>

        {/* User Profile - with padding for dock */}
        <div className="p-4 pb-20 border-t border-neutral-800">
          {/* Plan Badge (real) */}
          <div className="mb-3 px-3 py-2 bg-gradient-to-r from-neutral-950 to-neutral-900 rounded-lg border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold text-emerald-400 uppercase">Plan {getPlan(profile?.plan).name}</p>
                  <p className="text-xs text-neutral-500">
                    {profile?.plan_source === 'gifted' ? 'Regalado' : profile?.plan === 'starter' || !profile?.plan ? 'Mejora para más features' : 'Activo'}
                  </p>
                </div>
              </div>
              <a href="/company/settings?tab=payment" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                {profile?.plan === 'starter' || !profile?.plan ? 'Mejorar' : 'Ver'}
              </a>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-3 relative">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
              {(profile?.avatar_url || profile?.logo || profile?.profile_photo_url) ? (
                <img src={profile.avatar_url || profile.logo || profile.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 text-neutral-500 hover:text-neutral-400 hover:bg-neutral-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 py-2 z-50 text-white placeholder-neutral-500">
                <a
                  href="/company/settings"
                  className="flex items-center gap-3 px-4 py-2 text-neutral-200 hover:bg-neutral-950"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuracion
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-14 lg:pt-0">
        {/* Top Bar */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2"><WorkspaceSwitcher /></div>
              <h1 className="text-2xl font-bold text-white">¡Bienvenido, {userName}!</h1>
              <p className="text-neutral-500">Aquí está lo que pasa con tus campañas de creadores</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-neutral-500 hover:text-neutral-400 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-neutral-500 hover:text-neutral-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto pb-20 lg:pb-8">
          {/* Hero Section */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:p-8 mb-6 lg:mb-8 text-white relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between relative">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-2">Tu Motor de Creadores</h2>
                <p className="text-neutral-400 mb-6 max-w-lg">
                  Encuentra, contrata y gestiona los mejores creadores de Latinoamérica para tu marca.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link
                    href="/company/campaigns/new"
                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors text-center"
                  >
                    Publicar Trabajo
                  </Link>
                  <Link
                    href="/company/recruit"
                    className="text-white px-6 py-3 rounded-xl font-semibold border border-neutral-700 hover:bg-neutral-800 transition-colors text-center"
                  >
                    Descubrir Creadores
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-40 h-40 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Briefcase className="w-14 h-14 text-emerald-400" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 text-white placeholder-neutral-500">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Tus Tareas Pendientes</h3>
              <span className="text-sm text-neutral-500">{ACTION_ITEMS.filter(i => i.completed).length}/{ACTION_ITEMS.length} completadas</span>
            </div>
            <div className="space-y-3">
              {ACTION_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    item.completed ? 'bg-green-50' : 'bg-neutral-950 hover:bg-neutral-800'
                  } text-white placeholder-neutral-500`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    item.completed ? 'bg-green-500' : 'border-2 border-neutral-700'
                  } text-white placeholder-neutral-500`}>
                    {item.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 ${item.completed ? 'text-neutral-500 line-through' : 'text-white'}`}>
                    {item.label}
                  </span>
                  {!item.completed && (
                    <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 z-40">
        <div className="flex justify-around py-2">
          <Link href="/company/dashboard" className="flex flex-col items-center p-2 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Inicio</span>
          </Link>
          <Link href="/company/campaigns" className="flex flex-col items-center p-2 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span className="text-xs mt-1">Campanas</span>
          </Link>
          <Link href="/company/analytics" className="flex flex-col items-center p-2 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1">Analytics</span>
          </Link>
          <a href="/company/settings" className="flex flex-col items-center p-2 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1">Ajustes</span>
          </a>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-neutral-900 border-l border-neutral-800 p-6 overflow-y-auto hidden xl:block">
        {/* Wallet Card */}
        <Link href="/company/wallet" className="block mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-blue-100">Balance Disponible</span>
            <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={2} />
          </div>
          <p className="text-3xl font-bold">${wallet?.balance?.toFixed(2) || '0.00'}</p>
          <p className="text-sm text-blue-200 mt-1">Para pagar a creadores</p>
        </Link>

        {/* Campaign Overview */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Resumen de Campañas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-950 rounded-xl p-4">
              <p className="text-sm text-neutral-500 mb-1">Gasto Total</p>
              <p className="text-2xl font-bold text-white">${stats.totalSpend.toLocaleString()}</p>
            </div>
            <div className="bg-neutral-950 rounded-xl p-4">
              <p className="text-sm text-neutral-500 mb-1">Vistas Totales</p>
              <p className="text-2xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
            </div>
            <div className="bg-neutral-950 rounded-xl p-4">
              <p className="text-sm text-neutral-500 mb-1">CPM Promedio</p>
              <p className="text-2xl font-bold text-white">${stats.avgCPM.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 rounded-xl p-4">
              <p className="text-sm text-neutral-500 mb-1">Creadores Activos</p>
              <p className="text-2xl font-bold text-white">{stats.activeCreators}</p>
            </div>
          </div>
        </div>

        {/* Active Creators */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Creadores Activos</h3>
            <Link href="/company/creators" className="text-sm text-blue-600 hover:text-blue-800">
              Ver todos
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="w-5 h-5 text-neutral-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar creadores..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-900 text-white placeholder-neutral-500"
            />
          </div>

          {/* Empty State */}
          <div className="text-center py-8 bg-neutral-950 rounded-xl">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-neutral-500 text-sm">Sin creadores activos aún</p>
            <Link href="/company/recruit" className="text-blue-600 text-sm hover:text-blue-800 mt-2 inline-block">
              Encontrar creadores
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
