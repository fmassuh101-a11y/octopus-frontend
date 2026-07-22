'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { formatNumber } from '@/lib/utils/videoAnalytics'
import { ChevronLeft, Eye, Heart, MessageCircle, Repeat2, Video } from 'lucide-react'

// Analítica del creador vista por la EMPRESA — mismos números reales que ve
// el creador en su propio panel Pro (/creator/analytics), no el perfil de
// contacto (ese es /company/creator/[id], para redes/mensaje/pagar; este
// es solo para números). Prioridad explícita de Felipe: la empresa tiene
// que ver esto sí o sí.
//
// Sale de public_profiles (NO de profiles: esa tabla está bloqueada por
// RLS del lado de la empresa, ver commit af7d122) — bio.tiktokAccounts[]
// es lo que llena de verdad la conexión OAuth.

interface TikTokAccountData {
  username: string
  followers: number
  following: number
  likes: number
  videoCount: number
  avgViews: number
  avgLikes: number
  avgComments: number
  engagementRate: number
  recentVideos: any[]
}

export default function CompanyCreatorAnalyticsPage() {
  const params = useParams()
  const creatorId = params.id as string
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState('')
  const [accounts, setAccounts] = useState<TikTokAccountData[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const token = localStorage.getItem('sb-access-token')
      if (!token) { setError('Sesión no encontrada'); setLoading(false); return }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/public_profiles?user_id=eq.${creatorId}&select=full_name,bio`,
          { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } }
        )
        const rows = res.ok ? await res.json() : []
        const profile = rows?.[0]
        if (!profile) { setError('No se pudo cargar el perfil de este creador'); setLoading(false); return }
        setCreatorName(profile.full_name || 'Creador')
        let bio: any = {}
        try { bio = typeof profile.bio === 'string' ? JSON.parse(profile.bio) : profile.bio || {} } catch { bio = {} }
        setAccounts(Array.isArray(bio.tiktokAccounts) ? bio.tiktokAccounts : [])
      } catch {
        setError('No se pudo cargar la analítica')
      }
      setLoading(false)
    })()
  }, [creatorId])

  const stats = accounts.length > 0 ? {
    followers: accounts.reduce((s, a) => s + (a.followers || 0), 0),
    likes: accounts.reduce((s, a) => s + (a.likes || 0), 0),
    videoCount: accounts.reduce((s, a) => s + (a.videoCount || 0), 0),
    avgViews: Math.round(accounts.reduce((s, a) => s + (a.avgViews || 0), 0) / accounts.length),
    engagementRate: parseFloat((accounts.reduce((s, a) => s + (a.engagementRate || 0), 0) / accounts.length).toFixed(2)),
  } : null

  const allVideos = accounts
    .flatMap(a => a.recentVideos || [])
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 12)

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href={`/company/creator/${creatorId}`} className="text-neutral-400 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Analítica de {creatorName}</h1>
            <p className="text-sm text-neutral-400">Datos reales de su cuenta conectada</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {error ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-400">
            {error}
          </div>
        ) : !stats ? (
          <div className="bg-neutral-900 border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-neutral-400">
            Este creador todavía no conectó ninguna cuenta de TikTok.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <p className="text-3xl font-bold">{formatNumber(stats.followers)}</p>
                <p className="text-sm text-neutral-500 mt-1">Seguidores</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <p className="text-3xl font-bold">{formatNumber(stats.likes)}</p>
                <p className="text-sm text-neutral-500 mt-1">Likes Totales</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <p className="text-3xl font-bold">{formatNumber(stats.videoCount)}</p>
                <p className="text-sm text-neutral-500 mt-1">Videos</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <p className="text-3xl font-bold">{stats.engagementRate}%</p>
                <p className="text-sm text-neutral-500 mt-1">Engagement</p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">Videos con mejor rendimiento</h2>
            {allVideos.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
                Todavía no hay videos recientes de esta cuenta.
              </div>
            ) : (
              <div className="space-y-3">
                {allVideos.map((v, i) => (
                  <div key={v.id || i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
                    {v.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                        <Video className="w-6 h-6 text-neutral-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{v.title || 'Video'}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-neutral-400">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {formatNumber(v.views)}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {formatNumber(v.likes)}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {formatNumber(v.comments)}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="w-3.5 h-3.5" /> {formatNumber(v.shares)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
