'use client'

import { useEffect } from 'react'
import {
  TikTokVideo,
  VideoAnalysis,
  CLASSIFICATION_CONFIG
} from '@/lib/types/analytics'
import {
  getVideoAnalysis,
  formatNumber,
  formatPercentageWithSign
} from '@/lib/utils/videoAnalytics'

interface VideoDetailModalProps {
  video: TikTokVideo
  allVideos: TikTokVideo[]
  onClose: () => void
}

export function VideoDetailModal({ video, allVideos, onClose }: VideoDetailModalProps) {
  const analysis = getVideoAnalysis(video, allVideos)
  const config = CLASSIFICATION_CONFIG[analysis.video.classification]

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const getTrendIcon = () => {
    switch (analysis.video.trend) {
      case 'up':
        return (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium">Mejor que los ultimos 5</span>
          </div>
        )
      case 'down':
        return (
          <div className="flex items-center gap-1 text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            <span className="text-sm font-medium">Peor que los ultimos 5</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
            <span className="text-sm font-medium">Similar a videos anteriores</span>
          </div>
        )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-2xl md:max-w-lg md:mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900">Analisis del Video</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Video Preview */}
          <div className="flex gap-4">
            <div className="w-28 h-48 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                {video.title || 'Video sin titulo'}
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                {analysis.timeSincePosted}
              </p>

              {/* Classification Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                {analysis.video.classification === 'viral' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                )}
                {config.labelEs}
              </span>

              {/* Top/Under performer badge */}
              {analysis.isTopPerformer && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2l2.5 6.5H19l-5.5 4.5 2 7L10 15.5 4.5 20l2-7L1 8.5h6.5L10 2z" />
                  </svg>
                  Top Performer
                </span>
              )}
            </div>
          </div>

          {/* Engagement Rate with Comparison */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Engagement Rate</span>
              <span className="text-2xl font-bold text-gray-900">
                {analysis.video.engagementRate}%
              </span>
            </div>

            {/* Comparison Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${Math.min((analysis.video.engagementRate / (analysis.accountAvgEngagement * 2)) * 100, 100)}%`
                }}
              />
              {/* Average marker */}
              <div
                className="absolute top-0 w-0.5 h-full bg-gray-800"
                style={{ left: '50%' }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                vs Promedio ({analysis.accountAvgEngagement}%)
              </span>
              <span className={`font-semibold ${
                analysis.percentageDifference > 0 ? 'text-green-600' :
                analysis.percentageDifference < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {formatPercentageWithSign(analysis.percentageDifference)}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(video.views)}
              </div>
              <div className="text-xs text-gray-500">Views</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(video.likes)}
              </div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(video.comments)}
              </div>
              <div className="text-xs text-gray-500">Comments</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(video.shares)}
              </div>
              <div className="text-xs text-gray-500">Shares</div>
            </div>
          </div>

          {/* Trend */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-2">Tendencia</div>
            {getTrendIcon()}
          </div>

          {/* Video Rank */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <span className="text-sm text-gray-600">Ranking en tu cuenta</span>
            <span className="font-semibold text-gray-900">
              #{analysis.video.performanceRank} de {analysis.totalVideos}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
