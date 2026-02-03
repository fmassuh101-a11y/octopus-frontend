'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

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
  total_views: number
  campaigns: number
  last_active: string
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-800 rounded ${className || ''}`} />
}

function CreatorSkeleton() {
  return (
    <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
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

  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return

    const user = JSON.parse(userStr)

    try {
      // Get accepted applications
      const appsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?select=*,gigs(*)&company_id=eq.${user.id}&status=eq.accepted`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      if (!appsRes.ok) {
        setLoading(false)
        return
      }

      const applications = await appsRes.json()

      if (applications.length === 0) {
        setLoading(false)
        return
      }

      // Get unique creator IDs
      const creatorIds = Array.from(new Set(applications.map((a: any) => a.creator_id))) as string[]

      // Get profiles
      const profilesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=*`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const profiles = profilesRes.ok ? await profilesRes.json() : []

      // Build creator data
      const creatorsData: Creator[] = profiles.map((p: any) => {
        const creatorApps = applications.filter((a: any) => a.creator_id === p.user_id)
        return {
          id: p.user_id,
          user_id: p.user_id,
          full_name: p.full_name || 'Sin nombre',
          avatar_url: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'U')}&background=6366f1&color=fff`,
          bio: p.bio || '',
          tiktok_handle: p.tiktok_handle || '',
          status: 'active',
          total_spent: creatorApps.reduce((sum: number, a: any) => sum + (a.gigs?.budget || 0), 0),
          total_posts: Math.floor(Math.random() * 10),
          total_views: Math.floor(Math.random() * 100000),
          campaigns: creatorApps.length,
          last_active: new Date().toISOString()
        }
      })

      setCreators(creatorsData)
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

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

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
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors flex items-center gap-2"
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
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            {['all', 'active', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Completados'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Creadores', value: creators.length, icon: '👥' },
            { label: 'Gasto Total', value: `$${creators.reduce((s, c) => s + c.total_spent, 0).toLocaleString()}`, icon: '💰' },
            { label: 'Posts Totales', value: creators.reduce((s, c) => s + c.total_posts, 0), icon: '📱' },
            { label: 'Views Totales', value: formatNumber(creators.reduce((s, c) => s + c.total_views, 0)), icon: '👁️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
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
              <span className="text-4xl">👥</span>
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
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors"
                >
                  Buscar Creadores
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/company/creator/${creator.id}`}
                className="block bg-neutral-900 rounded-xl p-4 border border-neutral-800 hover:border-neutral-700 transition-all hover:bg-neutral-800/50"
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
                      }`}>
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
            { icon: '🏠', label: 'Dashboard', href: '/company/dashboard' },
            { icon: '📋', label: 'Campañas', href: '/company/campaigns' },
            { icon: '💬', label: 'Mensajes', href: '/company/messages' },
            { icon: '👥', label: 'Aplicantes', href: '/company/applicants' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
