'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { formatNumber, filterVideosByPeriod } from '@/lib/utils/videoAnalytics'
import { TikTokVideo, TimePeriodValue } from '@/lib/types/analytics'
import {
  TimePeriodFilter,
  VideoDetailModal,
  VideoRankingSection,
  PerformanceChart,
  PublishingInsights,
  CampaignAnalyzer,
  AIContentTips,
} from '@/app/(app)/creator/analytics/components'
import { ChevronLeft } from 'lucide-react'

// Analítica del creador vista por la EMPRESA — MISMOS componentes y misma
// profundidad que ve el creador en su propio panel Pro (/creator/analytics):
// gráfico de rendimiento, ranking de videos, mejores horas para publicar,
// analizador de campaña, tips con IA. No es un resumen aparte, es la
// analítica real completa, mostrada del otro lado. No es el perfil de
// contacto (ese es /company/creator/[id] — redes, mensaje, botón pagar).
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
  recentVideos: TikTokVideo[]
}

export default function CompanyCreatorAnalyticsPage() {
  const params = useParams()
  const creatorId = params.id as string
  const [loading, setLoading] = useState(true)
  const [creatorName, setCreatorName] = useState('')
  const [accounts, setAccounts] = useState<TikTokAccountData[]>([])
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodValue>('all')
  const [selectedVideo, setSelectedVideo] = useState<TikTokVideo | null>(null)
  // Si CUALQUIER cuenta que este creador declaró para el contrato con
  // ESTA empresa es "personal", no se muestra la cuenta completa — solo
  // los videos puntuales que comparta (contract_video_shares). Pedido
  // explícito de Felipe para proteger contenido personal del creador.
  const [isPersonalAccount, setIsPersonalAccount] = useState(false)
  const [sharedVideos, setSharedVideos] = useState<TikTokVideo[]>([])

  useEffect(() => {
    ;(async () => {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) { setError('Sesión no encontrada'); setLoading(false); return }
      const myId = JSON.parse(userStr).id
      const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/public_profiles?user_id=eq.${creatorId}&select=full_name,bio`,
          { headers: H }
        )
        const rows = res.ok ? await res.json() : []
        const profile = rows?.[0]
        if (!profile) { setError('No se pudo cargar el perfil de este creador'); setLoading(false); return }
        setCreatorName(profile.full_name || 'Creador')
        let bio: any = {}
        try { bio = typeof profile.bio === 'string' ? JSON.parse(profile.bio) : profile.bio || {} } catch { bio = {} }
        setAccounts(Array.isArray(bio.tiktokAccounts) ? bio.tiktokAccounts : [])

        // Contrato más reciente entre esta empresa y este creador — de ahí
        // sale si la cuenta es personal, y los videos que sí compartió.
        const cRes = await fetch(
          `${SUPABASE_URL}/rest/v1/contracts?creator_id=eq.${creatorId}&company_id=eq.${myId}&select=id&order=created_at.desc&limit=1`,
          { headers: H }
        )
        const [c] = cRes.ok ? await cRes.json() : []
        if (c) {
          const [hrRes, sharesRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/handle_requests?contract_id=eq.${c.id}&select=handles`, { headers: H }),
            // Puede no existir todavía si la migración SQL no se corrió —
            // se trata como "sin videos compartidos", no como error fatal.
            fetch(`${SUPABASE_URL}/rest/v1/contract_video_shares?contract_id=eq.${c.id}&select=*`, { headers: H }),
          ])
          const [hr] = hrRes.ok ? await hrRes.json() : []
          const personal = Array.isArray(hr?.handles) && hr.handles.some((h: any) => h.accountType === 'personal')
          setIsPersonalAccount(personal)
          const shares = sharesRes.ok ? await sharesRes.json() : []
          setSharedVideos(shares.map((s: any) => ({
            id: s.video_id || s.id,
            title: s.video_url,
            thumbnail: s.stats?.thumbnail || '',
            views: s.stats?.views || 0,
            likes: s.stats?.likes || 0,
            comments: s.stats?.comments || 0,
            shares: s.stats?.shares || 0,
            createdAt: s.submitted_at,
          })))
        }
      } catch {
        setError('No se pudo cargar la analítica')
      }
      setLoading(false)
    })()
  }, [creatorId])

  // Cuenta personal → SOLO los videos que el creador compartió a propósito
  // para este contrato, nunca la cuenta completa. Cuenta nueva/dedicada →
  // todo, como hasta ahora.
  const allVideos: TikTokVideo[] = isPersonalAccount
    ? sharedVideos
    : accounts.flatMap(a => a.recentVideos || [])

  const stats = isPersonalAccount
    ? (allVideos.length > 0 ? {
        followers: 0, following: 0,
        likes: allVideos.reduce((s, v) => s + (v.likes || 0), 0),
        videoCount: allVideos.length,
        avgViews: Math.round(allVideos.reduce((s, v) => s + (v.views || 0), 0) / allVideos.length),
        avgLikes: Math.round(allVideos.reduce((s, v) => s + (v.likes || 0), 0) / allVideos.length),
        avgComments: Math.round(allVideos.reduce((s, v) => s + (v.comments || 0), 0) / allVideos.length),
        engagementRate: 0,
      } : null)
    : (accounts.length > 0 ? {
        followers: accounts.reduce((s, a) => s + (a.followers || 0), 0),
        following: accounts.reduce((s, a) => s + (a.following || 0), 0),
        likes: accounts.reduce((s, a) => s + (a.likes || 0), 0),
        videoCount: accounts.reduce((s, a) => s + (a.videoCount || 0), 0),
        avgViews: Math.round(accounts.reduce((s, a) => s + (a.avgViews || 0), 0) / accounts.length),
        avgLikes: Math.round(accounts.reduce((s, a) => s + (a.avgLikes || 0), 0) / accounts.length),
        avgComments: Math.round(accounts.reduce((s, a) => s + (a.avgComments || 0), 0) / accounts.length),
        engagementRate: parseFloat((accounts.reduce((s, a) => s + (a.engagementRate || 0), 0) / accounts.length).toFixed(2)),
      } : null)
  const filteredVideos = filterVideosByPeriod(allVideos, selectedPeriod)

  const getEngagementColor = (rate: number) => {
    if (rate >= 6) return 'text-emerald-600'
    if (rate >= 3) return 'text-blue-600'
    return 'text-neutral-500'
  }
  const getEngagementLabel = (rate: number) => {
    if (rate >= 6) return 'Excelente'
    if (rate >= 3) return 'Bueno'
    return 'Bajo'
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F7FAFD] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] pb-24">
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/company/creator/${creatorId}`} className="p-2 hover:bg-neutral-100 rounded-lg transition">
            <ChevronLeft className="w-6 h-6 text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Analítica de {creatorName}</h1>
            <p className="text-sm text-neutral-500">Datos reales de su cuenta conectada</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isPersonalAccount && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            Esta es una cuenta personal del creador — solo ves los videos puntuales que compartió para este contrato, no el resto de su cuenta.
          </div>
        )}
        {error ? (
          <div className="bg-white border border-neutral-100 rounded-2xl p-8 text-center text-neutral-500">{error}</div>
        ) : !stats ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center text-neutral-500">
            {isPersonalAccount
              ? 'Este creador todavía no compartió ningún video para este contrato.'
              : 'Este creador todavía no conectó ninguna cuenta de TikTok.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-neutral-100 rounded-2xl p-5">
                <p className="text-3xl font-bold text-neutral-900">{formatNumber(stats.followers)}</p>
                <p className="text-sm text-neutral-500 mt-1">Seguidores</p>
              </div>
              <div className="bg-white border border-neutral-100 rounded-2xl p-5">
                <p className="text-3xl font-bold text-neutral-900">{formatNumber(stats.likes)}</p>
                <p className="text-sm text-neutral-500 mt-1">Likes Totales</p>
              </div>
              <div className="bg-white border border-neutral-100 rounded-2xl p-5">
                <p className="text-3xl font-bold text-neutral-900">{formatNumber(stats.videoCount)}</p>
                <p className="text-sm text-neutral-500 mt-1">Videos</p>
              </div>
              <div className="bg-white border border-neutral-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-3xl font-bold text-neutral-900">{stats.engagementRate}%</p>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getEngagementColor(stats.engagementRate)}`}>
                    {getEngagementLabel(stats.engagementRate)}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mt-1">Engagement Rate</p>
              </div>
            </div>

            {allVideos.length > 0 && (
              <div className="mb-6">
                <CampaignAnalyzer videos={allVideos} onVideoClick={setSelectedVideo} />
              </div>
            )}

            {allVideos.length > 0 && (
              <div className="bg-white border border-neutral-100 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-900">Filtrar por Periodo</h3>
                  <TimePeriodFilter selected={selectedPeriod} onChange={setSelectedPeriod} />
                </div>
                <p className="text-sm text-neutral-500 mt-2">
                  Mostrando {filteredVideos.length} de {allVideos.length} videos
                </p>
              </div>
            )}

            {filteredVideos.length > 0 && (
              <div className="mb-6">
                <PerformanceChart videos={filteredVideos} />
              </div>
            )}

            {filteredVideos.length > 0 && (
              <div className="mb-6">
                <VideoRankingSection videos={filteredVideos} onVideoClick={setSelectedVideo} />
              </div>
            )}

            {allVideos.length > 0 && (
              <div className="mb-6">
                <PublishingInsights videos={allVideos} />
              </div>
            )}

            {allVideos.length > 0 && (
              <div className="mb-6">
                <AIContentTips videos={allVideos} />
              </div>
            )}
          </>
        )}
      </div>

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          allVideos={allVideos}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}
