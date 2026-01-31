'use client'

import { TikTokVideo, DAYS_OF_WEEK, TIME_SLOTS } from '@/lib/types/analytics'
import { generatePublishingInsights } from '@/lib/utils/videoAnalytics'

interface PublishingInsightsProps {
  videos: TikTokVideo[]
}

export function PublishingInsights({ videos }: PublishingInsightsProps) {
  const insights = generatePublishingInsights(videos)

  if (insights.length === 0) {
    return null
  }

  // Find best times
  const bestTimes = insights
    .filter(i => i.isRecommended && i.videoCount > 0)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 3)

  // Create grid data
  const getCell = (dayIdx: number, slotIdx: number) => {
    return insights.find(i => i.dayIndex === dayIdx && i.timeSlotIndex === slotIdx)
  }

  // Find max engagement for color scaling
  const maxEngagement = Math.max(...insights.map(i => i.avgEngagement), 0.01)

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Mejores Horas para Publicar</h3>
          <p className="text-xs text-gray-500">Basado en el engagement de tus videos</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="min-w-[400px]">
          {/* Header Row - Days */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div className="text-xs text-gray-400 text-center"></div>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-xs text-gray-500 text-center font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          {TIME_SLOTS.map((slot, slotIdx) => (
            <div key={slot} className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-xs text-gray-500 flex items-center pr-2">
                {slot}
              </div>
              {DAYS_OF_WEEK.map((_, dayIdx) => {
                const cell = getCell(dayIdx, slotIdx)
                const intensity = cell ? cell.avgEngagement / maxEngagement : 0
                const hasData = cell && cell.videoCount > 0

                return (
                  <div
                    key={dayIdx}
                    className={`
                      aspect-square rounded-lg flex items-center justify-center relative group
                      ${hasData
                        ? cell.isRecommended
                          ? 'bg-green-500'
                          : intensity > 0.5
                            ? 'bg-green-400'
                            : intensity > 0.25
                              ? 'bg-green-300'
                              : 'bg-green-200'
                        : 'bg-gray-100'
                      }
                    `}
                    style={{
                      opacity: hasData ? 0.4 + intensity * 0.6 : 1
                    }}
                  >
                    {/* Tooltip */}
                    {hasData && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                          {cell.avgEngagement.toFixed(1)}% engagement
                          <br />
                          {cell.videoCount} video{cell.videoCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-100" />
          <span className="text-xs text-gray-500">Sin datos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-200" />
          <span className="text-xs text-gray-500">Bajo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-400" />
          <span className="text-xs text-gray-500">Medio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-500">Alto</span>
        </div>
      </div>

      {/* Recommendations */}
      {bestTimes.length > 0 && (
        <div className="mt-4 p-4 bg-purple-50 rounded-xl">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-purple-900">Recomendacion</p>
              <p className="text-sm text-purple-700 mt-1">
                Tus mejores momentos para publicar son{' '}
                <strong>
                  {bestTimes.map((t, i) => (
                    <span key={i}>
                      {t.dayOfWeek} {t.timeSlot}
                      {i < bestTimes.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
