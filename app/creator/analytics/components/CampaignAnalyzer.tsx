'use client'

import { TikTokVideo, CLASSIFICATION_CONFIG } from '@/lib/types/analytics'
import { getCampaignStats, formatNumber } from '@/lib/utils/videoAnalytics'

interface CampaignAnalyzerProps {
  videos: TikTokVideo[]
  onVideoClick: (video: TikTokVideo) => void
}

export function CampaignAnalyzer({ videos, onVideoClick }: CampaignAnalyzerProps) {
  const stats = getCampaignStats(videos)

  if (videos.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Analisis de Campana</h3>
          </div>
          <p className="text-sm text-gray-400">
            Analiza hasta 20 videos de tu campana
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-medium">
            {stats.totalVideos} videos
          </span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-2xl font-bold">{formatNumber(stats.totalViews)}</div>
          <div className="text-xs text-gray-400 mt-1">Alcance Total</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.avgEngagement}%</div>
          <div className="text-xs text-gray-400 mt-1">Engagement Prom.</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{stats.videosAboveAvg}</div>
          <div className="text-xs text-gray-400 mt-1">Sobre Promedio</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.trendingUp}</div>
          <div className="text-xs text-gray-400 mt-1">Tendencia Positiva</div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="space-y-3">
        {/* Best Video */}
        {stats.bestVideo && (
          <button
            onClick={() => onVideoClick(stats.bestVideo!)}
            className="w-full flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition text-left"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2l2.5 6.5H19l-5.5 4.5 2 7L10 15.5 4.5 20l2-7L1 8.5h6.5L10 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-green-400 font-medium">Mejor Video</div>
              <div className="text-sm truncate">{stats.bestVideo.title || 'Video'}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">
                {stats.bestVideo.engagementRate}%
              </div>
              <div className="text-xs text-gray-400">engagement</div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Underperforming count */}
        {stats.videosBelowAvg > 0 && (
          <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm text-orange-400 font-medium">Necesitan Atencion</div>
              <div className="text-sm text-gray-300">
                {stats.videosBelowAvg} video{stats.videosBelowAvg !== 1 ? 's' : ''} bajo el promedio
              </div>
            </div>
          </div>
        )}

        {/* All Good */}
        {stats.videosBelowAvg === 0 && stats.totalVideos > 0 && (
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm text-green-400 font-medium">Excelente!</div>
              <div className="text-sm text-gray-300">
                Todos tus videos estan rindiendo bien
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{formatNumber(stats.totalLikes)} likes</span>
          <span>{formatNumber(stats.totalComments)} comentarios</span>
          <span>{formatNumber(stats.totalShares)} shares</span>
        </div>
      </div>
    </div>
  )
}
