'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { ClipboardList, Home, MessageCircle, Smartphone, Users, Wallet } from 'lucide-react'
import { readCache, writeCache } from '@/lib/useCachedFetch'

interface Creator {
  id: string
  user_id: string
  full_name: string
  avatar_url: string
  bio: string
  tiktok_handle: string
  status: 'active' | 'completed' | 'paused'
  total_spent: number
  total_posts: number
  campaigns: number
  last_active: string
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-800 rounded ${className || ''} text-white placeholder-neutral-500`} />
}

function CreatorSkeleton() {
  return (
    <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 text-white placeholder-neutral-500">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  // Diagnóstico visible SOLO cuando la lista sale vacía — para dejar de
  // adivinar por qué y ver el dato real (con qué user_id se buscó, cuántas
  // aplicaciones/contratos encontró cada consulta) en vez de prometer un
  // arreglo sin evidencia.
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    // FLUIDEZ: pinta al instante lo último visto; lo fresco llega por detrás
    const cached = readCache<Creator[]>('company-creators')
    if (cached) {
      setCreators(cached)
      setLoading(false)
    }
    loadCreators()
  }, [])

  const loadCreators = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return

    const user = JSON.parse(userStr)

    try {
      // Dos fuentes de creadores "contratados": aplicaciones aceptadas
      // (flujo viejo, con gig de por medio) Y contratos directos (los que
      // se mandan desde el chat, CreateContractModal — sin gig ni
      // application_id). Antes esta página solo miraba applications, así
      // que un contrato mandado directo por mensaje (como el que probó
      // Felipe) nunca aparecía acá, aunque sí existía y estaba verificado.
      const [appsRes, contractsRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/applications?select=creator_id,gigs(budget)&company_id=eq.${user.id}&status=eq.accepted`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/contracts?select=creator_id,payment_amount&company_id=eq.${user.id}&status=in.(accepted,in_progress,completed)`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        ),
      ])

      const applications = appsRes.ok ? await appsRes.json() : []
      const contracts = contractsRes.ok ? await contractsRes.json() : []

      setDebugInfo(
        `user_id buscado: ${user.id} | applications: ${appsRes.status}${appsRes.ok ? '' : ' (falló)'}, ${applications.length} filas | contracts: ${contractsRes.status}${contractsRes.ok ? '' : ' (falló)'}, ${contracts.length} filas`
      )

      if (applications.length === 0 && contracts.length === 0) {
        setLoading(false)
        return
      }

      // Get unique creator IDs de ambas fuentes
      const creatorIds = Array.from(new Set([
        ...applications.map((a: any) => a.creator_id),
        ...contracts.map((c: any) => c.creator_id),
      ])) as string[]

      // Get profiles + entregas reales (para el conteo real de posts — antes era Math.random())
      //
      // OJO ACÁ, causa real encontrada probando con cuentas nuevas de
      // verdad: esta consulta pedía la columna "tiktok_handle", que NO
      // EXISTE en public_profiles (la columna real se llama "tiktok", y el
      // handle de la cuenta conectada de verdad vive en bio.tiktokAccounts,
      // no en una columna aparte) — PostgREST devolvía 400, el código lo
      // trataba como "sin resultados" en silencio, y la lista de creadores
      // quedaba en 0 SIEMPRE, sin importar cuántos contratos hubiera.
      // Además: "profiles" (la tabla real, sin "public_") NO se puede leer
      // desde el lado de la empresa por RLS, ni con un contrato de por
      // medio — por eso todo esto tiene que pasar por public_profiles.
      const [profilesRes, deliveriesRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/public_profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,avatar_url,bio,tiktok`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/content_deliveries?company_id=eq.${user.id}&creator_id=in.(${creatorIds.join(',')})&status=in.(approved,completed)&select=creator_id`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        ),
      ])

      const profiles = profilesRes.ok ? await profilesRes.json() : []
      const deliveries = deliveriesRes.ok ? await deliveriesRes.json() : []

      setDebugInfo(
        (prev) => `${prev} | creator_ids: ${creatorIds.join(', ') || '(ninguno)'} | public_profiles: ${profilesRes.status}${profilesRes.ok ? '' : ' (falló)'}, ${profiles.length} filas`
      )

      // Build creator data — combinando ambas fuentes
      const creatorsData: Creator[] = profiles.map((p: any) => {
        const creatorApps = applications.filter((a: any) => a.creator_id === p.user_id)
        const creatorContracts = contracts.filter((c: any) => c.creator_id === p.user_id)
        const realPosts = deliveries.filter((d: any) => d.creator_id === p.user_id).length
        // gigs.budget es texto libre ("$10-$100/hora", etc.), no un número
        // — sumarlo directo con "+" hacía concatenación de texto en vez de
        // suma (por eso salía "$00$10$100/hora..."). Se saca el primer
        // número que aparezca en el texto; si no hay ninguno, no suma nada
        // en vez de romper el total.
        const spentFromApps = creatorApps.reduce((sum: number, a: any) => {
          const n = parseFloat(String(a.gigs?.budget || '').replace(/[^0-9.]/g, ''))
          return sum + (Number.isFinite(n) ? n : 0)
        }, 0)
        const spentFromContracts = creatorContracts.reduce((sum: number, c: any) => sum + (Number(c.payment_amount) || 0), 0)
        // El handle real de la cuenta conectada por OAuth vive en
        // bio.tiktokAccounts[0] — la columna "tiktok" plana es un
        // respaldo si no hay conexión OAuth todavía.
        let tiktokHandle = ''
        try {
          const bioData = typeof p.bio === 'string' ? JSON.parse(p.bio) : p.bio
          tiktokHandle = bioData?.tiktokAccounts?.[0]?.username || p.tiktok || ''
        } catch { tiktokHandle = p.tiktok || '' }
        return {
          id: p.user_id,
          user_id: p.user_id,
          full_name: p.full_name || 'Sin nombre',
          avatar_url: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'U')}&background=6366f1&color=fff`,
          bio: p.bio || '',
          tiktok_handle: tiktokHandle,
          status: 'active',
          total_spent: spentFromApps + spentFromContracts,
          total_posts: realPosts,
          campaigns: creatorApps.length + creatorContracts.length,
          last_active: new Date().toISOString()
        }
      })

      setCreators(creatorsData)
      writeCache('company-creators', creatorsData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading creators:', err)
      setLoading(false)
    }
  }

  const filteredCreators = creators.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter
    const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.tiktok_handle?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })


  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/company/dashboard" className="text-neutral-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Mis Creadores</h1>
                <p className="text-sm text-neutral-400">{creators.length} creadores activos</p>
              </div>
            </div>
            <Link
              href="/company/recruit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buscar Creadores
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar creador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-emerald-500 transition-colors text-white placeholder-neutral-500"
            />
          </div>
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-white placeholder-neutral-500">
            {['all', 'active', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Completados'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Creadores', value: creators.length, icon: Users },
            { label: 'Gasto Total', value: `$${creators.reduce((s, c) => s + c.total_spent, 0).toLocaleString()}`, icon: Wallet },
            { label: 'Posts Totales', value: creators.reduce((s, c) => s + c.total_posts, 0), icon: Smartphone },
          ].map((stat) => (
            <div key={stat.label} className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 text-white placeholder-neutral-500">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-6 h-6" strokeWidth={2} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Creators List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <CreatorSkeleton key={i} />)}
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-800 flex items-center justify-center">
              <Users className="w-8 h-8" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'No se encontraron creadores' : 'Sin creadores aun'}
            </h3>
            <p className="text-neutral-500 mb-6 max-w-md mx-auto">
              {searchTerm
                ? 'Intenta con otro termino de busqueda'
                : 'Acepta aplicaciones de creadores o busca nuevos talentos para empezar a colaborar'
              }
            </p>
            {!searchTerm && (
              <div className="flex gap-3 justify-center">
                <Link
                  href="/company/applicants"
                  className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                >
                  Ver Aplicantes
                </Link>
                <Link
                  href="/company/recruit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors"
                >
                  Buscar Creadores
                </Link>
              </div>
            )}
            {/* Diagnóstico visible — para mandar screenshot en vez de
                "sigue sin funcionar" sin más info */}
            {debugInfo && (
              <p className="mt-8 text-xs text-neutral-600 font-mono break-words max-w-lg mx-auto">
                {debugInfo}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/company/creator/${creator.id}/analytics`}
                className="block bg-neutral-900 rounded-xl p-4 border border-neutral-800 hover:border-neutral-700 transition-all hover:bg-neutral-800/50 text-white placeholder-neutral-500"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={creator.avatar_url}
                    alt={creator.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-neutral-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{creator.full_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        creator.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-neutral-500/20 text-neutral-400'
                      } text-white placeholder-neutral-500`}>
                        {creator.status === 'active' ? 'Activo' : 'Completado'}
                      </span>
                    </div>
                    {creator.tiktok_handle && (
                      <p className="text-sm text-neutral-500">@{creator.tiktok_handle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{creator.campaigns}</p>
                      <p className="text-neutral-500">Campañas</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{creator.total_posts}</p>
                      <p className="text-neutral-500">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-400">${creator.total_spent}</p>
                      <p className="text-neutral-500">Invertido</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-6 py-3">
        <div className="max-w-4xl mx-auto flex justify-around">
          {[
            { icon: Home, label: 'Dashboard', href: '/company/dashboard' },
            { icon: ClipboardList, label: 'Campañas', href: '/company/campaigns' },
            { icon: MessageCircle, label: 'Mensajes', href: '/company/chat' },
            { icon: Users, label: 'Aplicantes', href: '/company/applicants' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-colors"
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
