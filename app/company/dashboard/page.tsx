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
import { readCache, writeCache } from '@/lib/useCachedFetch'

// Tareas pendientes: se COMPLETAN SOLAS con datos reales (antes estaban hardcodeadas)
const ACTION_ITEMS_BASE = [
  { id: 1, label: 'Publica tu primer trabajo', link: '/company/jobs/new' },
  { id: 2, label: 'Invita usuarios a tu equipo', link: '/company/settings?tab=team' },
  { id: 3, label: 'Revisa aplicaciones de creadores', link: '/company/applicants' },
  { id: 4, label: 'Configura método de pago', link: '/company/fondear' },
  { id: 5, label: 'Completa el perfil de empresa', link: '/company/settings' },
  { id: 6, label: 'Explora el marketplace de creadores', link: '/company/recruit' },
  { id: 7, label: 'Crea tu primera campaña', link: '/company/jobs/new' },
]

export default function CompanyDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [stats, setStats] = useState({
    totalSpend: 0,
    totalViews: 0,
    avgCPM: 0,
    activeCreators: 0
  })
  const [wallet, setWallet] = useState<{ balance: number; pending_balance: number } | null>(null)
  const [tasksDone, setTasksDone] = useState<Record<number, boolean>>({})

  // Tareas pendientes: se completan SOLAS con datos reales
  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    const uid = JSON.parse(userStr).id
    const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
    ;(async () => {
      try {
        const [gigsR, teamR, appsR, topupsR, profR] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/gigs?company_id=eq.${uid}&select=id&limit=1`, { headers: H }),
          fetch(`${SUPABASE_URL}/rest/v1/team_members?company_id=eq.${uid}&select=id&limit=1`, { headers: H }),
          fetch(`${SUPABASE_URL}/rest/v1/applications?status=neq.pending&select=id&limit=1`, { headers: H }),
          fetch(`${SUPABASE_URL}/rest/v1/wallet_topups?user_id=eq.${uid}&select=id&limit=1`, { headers: H }),
          fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${uid}&select=company_name`, { headers: H }),
        ])
        const has = async (r: Response) => r.ok && ((await r.json())?.length > 0)
        const prof = profR.ok ? (await profR.json())?.[0] : null
        const hasGigs = await has(gigsR)
        setTasksDone({
          1: hasGigs,
          2: await has(teamR),
          3: await has(appsR),
          4: await has(topupsR),
          5: !!prof?.company_name,
          6: localStorage.getItem('oct-visited-recruit') === '1',
          7: hasGigs,
        })
      } catch {}
    })()
  }, [])

  const [giftModal, setGiftModal] = useState<{ type: 'plan' | 'discount'; plan: string; discount: number } | null>(null)

  useEffect(() => {
    // FLUIDEZ: pintar al instante lo último visto (refresco por detrás)
    const c = readCache<any>('company-home')
    if (c?.profile) {
      setProfile(c.profile)
      if (c.stats) setStats(c.stats)
      if (c.wallet) setWallet(c.wallet)
      setLoading(false)
    }
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.replace('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      // Perfil y wallet no dependen entre sí: se piden a la vez en vez de
      // esperar el perfil completo antes de recién ahí pedir la wallet.
      fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userData.id}&select=balance,pending_balance`, {
        headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
      }).then(async walletRes => {
        if (walletRes.ok) {
          const wallets = await walletRes.json()
          if (wallets.length > 0) {
            setWallet(wallets[0])
            writeCache('company-home', { ...(readCache<any>('company-home') || {}), wallet: wallets[0] })
          }
        }
      }).catch(() => {})

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
              router.replace('/creator/dashboard')
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
          writeCache('company-home', { ...(readCache<any>('company-home') || {}), profile: finalProfile })

        } else {
          router.replace('/auth/select-type')
          return
        }
      } else {
        router.replace('/auth/select-type')
        return
      }

      setLoading(false)
    } catch (err) {
      console.error('Auth check error:', err)
      // On error, go to select-type instead of login to avoid redirect loop
      router.replace('/auth/select-type')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex">
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
        { title: 'Bienvenido a Octapi', body: 'Acá consigues creadores para promocionar tu marca. Te muestro en 4 pasos cómo funciona.' },
        { title: 'Crea una campaña', body: 'Elige el tipo de contenido que necesitas (UGC, Clipping, Faceless y más) y publica tu campaña. El formulario se adapta al tipo.' },
        { title: 'Revisa aplicantes', body: 'Los creadores aplican a tu campaña. Acepta a los que te gusten y mándales un contrato con los términos.' },
        { title: 'Aprueba y paga', body: 'Cuando el creador entrega, revisas el contenido. Al aprobarlo, se libera el pago. Mejora tu plan para bajar la comisión.' },
      ]} />
      {/* Notificación grande: te regalaron un plan / descuento */}
      {giftModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4 animate-fade-in">
          <div className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-emerald-500/10 animate-scale-in">
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
              <span className="text-sm text-neutral-500">{ACTION_ITEMS_BASE.filter(i => tasksDone[i.id]).length}/{ACTION_ITEMS_BASE.length} completadas</span>
            </div>
            <div className="space-y-3">
              {ACTION_ITEMS_BASE.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    tasksDone[item.id] ? 'bg-green-50' : 'bg-neutral-950 hover:bg-neutral-800'
                  } text-white placeholder-neutral-500`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    tasksDone[item.id] ? 'bg-green-500' : 'border-2 border-neutral-700'
                  } text-white placeholder-neutral-500`}>
                    {tasksDone[item.id] && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 ${tasksDone[item.id] ? 'text-neutral-500 line-through' : 'text-white'}`}>
                    {item.label}
                  </span>
                  {!tasksDone[item.id] && (
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
          <Link href="/company/settings" className="flex flex-col items-center p-2 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1">Ajustes</span>
          </Link>
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
