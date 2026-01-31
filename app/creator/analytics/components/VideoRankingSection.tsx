'use client'

import { TikTokVideo, AnalyzedVideo, CLASSIFICATION_CONFIG } from '@/lib/types/analytics'
import { getTopPerformers, analyzeVideos, formatNumber } from '@/lib/utils/videoAnalytics'

interface VideoRankingSectionProps {
  videos: TikTokVideo[]
  onVideoClick: (video: TikTokVideo) => void
}

function VideoCard({
  video,
  rank,
  onClick,
  isTop = true
}: {
  video: AnalyzedVideo
  rank: number
  onClick: () => void
  isTop?: boolean
}) {
  const config = CLASSIFICATION_CONFIG[video.classification]

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition w-full text-left"
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        isTop
          ? rank === 1 ? 'bg-yellow-400 text-yellow-900' :
            rank === 2 ? 'bg-gray-300 text-gray-700' :
            rank === 3 ? 'bg-amber-600 text-white' :
            'bg-gray-200 text-gray-600'
          : 'bg-red-100 text-red-600'
      }`}>
        {rank}
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">
          {video.title || 'Video'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
            {video.engagementRate}%
          </span>
          <span className="text-xs text-gray-500">
            {formatNumber(video.views)} views
          </span>
        </div>
      </div>

      {/* Arrow */}
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export function VideoRankingSection({ videos, onVideoClick }: VideoRankingSectionProps) {
  const topPerformers = getTopPerformers(videos, 5)
  const topPerformerIds = new Set(topPerformers.map(v => v.id))

  // Get REAL underperformers - only videos classified as below_average or underperforming
  // AND exclude videos already shown in Top Performers
  const analyzed = analyzeVideos(videos)
  const realUnderperformers = analyzed
    .filter(v =>
      (v.classification === 'below_average' || v.classification === 'underperforming') &&
      !topPerformerIds.has(v.id)
    )
    .sort((a, b) => a.engagementRate - b.engagementRate)
    .slice(0, 3)

  if (videos.length === 0) return null

  // Special case: only 1-2 videos - show single column layout
  if (videos.length < 3) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2l2.5 6.5H19l-5.5 4.5 2 7L10 15.5 4.5 20l2-7L1 8.5h6.5L10 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Tus Videos</h3>
            <p className="text-xs text-gray-500">Analisis de rendimiento</p>
          </div>
        </div>

        <div className="space-y-2">
          {topPerformers.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              rank={index + 1}
              onClick={() => onVideoClick(video)}
              isTop={true}
            />
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Info:</strong> Sube mas videos para ver comparativas de rendimiento y recomendaciones.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top Performers */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2l2.5 6.5H19l-5.5 4.5 2 7L10 15.5 4.5 20l2-7L1 8.5h6.5L10 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Top Performers</h3>
            <p className="text-xs text-gray-500">Tus videos con mejor engagement</p>
          </div>
        </div>

        <div className="space-y-2">
          {topPerformers.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              rank={index + 1}
              onClick={() => onVideoClick(video)}
              isTop={true}
            />
          ))}
        </div>

        {topPerformers.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay suficientes videos para mostrar
          </p>
        )}
      </div>

      {/* Underperformers - Only show videos that are actually underperforming */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Necesitan Atencion</h3>
            <p className="text-xs text-gray-500">Videos bajo el promedio</p>
          </div>
        </div>

        <div className="space-y-2">
          {realUnderperformers.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              rank={index + 1}
              onClick={() => onVideoClick(video)}
              isTop={false}
            />
          ))}
        </div>

        {realUnderperformers.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Tip:</strong> Analiza que tienen en comun estos videos para mejorar tu estrategia de contenido.
            </p>
          </div>
        )}

        {realUnderperformers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Excelente trabajo!</p>
            <p className="text-xs text-gray-500 text-center mt-1">
              Todos tus videos estan rindiendo bien
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
