'use client'

import { useMemo } from 'react'
import { TikTokVideo } from '@/lib/types/analytics'
import { analyzeVideos, calculateAverageEngagement } from '@/lib/utils/videoAnalytics'

interface AIContentTipsProps {
  videos: TikTokVideo[]
}

interface ContentTip {
  type: 'success' | 'warning' | 'info'
  icon: string
  text: string
  detail?: string
}

// Helper to extract hashtags from title/description
function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g) || []
  return matches.map(h => h.toLowerCase())
}

// Helper to check if title has emojis
function hasEmojis(text: string): boolean {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
  return emojiRegex.test(text)
}

// Helper to get hour from date
function getHour(dateStr: string): number {
  return new Date(dateStr).getHours()
}

// Helper to get day of week (0=Sunday)
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay()
}

export function AIContentTips({ videos }: AIContentTipsProps) {
  const tips = useMemo(() => {
    if (videos.length < 3) return []

    const analyzed = analyzeVideos(videos)
    const avgEngagement = calculateAverageEngagement(videos)

    // Split into top and bottom performers
    const sortedByEngagement = [...analyzed].sort((a, b) => b.engagementRate - a.engagementRate)
    const topCount = Math.ceil(videos.length * 0.3) // Top 30%
    const bottomCount = Math.ceil(videos.length * 0.3) // Bottom 30%

    const topVideos = sortedByEngagement.slice(0, topCount)
    const bottomVideos = sortedByEngagement.slice(-bottomCount)

    const generatedTips: ContentTip[] = []

    // 1. Analyze video duration patterns
    if (videos.some(v => v.duration)) {
      const topAvgDuration = topVideos.reduce((sum, v) => sum + (v.duration || 0), 0) / topVideos.length
      const bottomAvgDuration = bottomVideos.reduce((sum, v) => sum + (v.duration || 0), 0) / bottomVideos.length

      if (topAvgDuration > 0 && bottomAvgDuration > 0) {
        if (topAvgDuration < bottomAvgDuration * 0.7) {
          const optimalRange = topAvgDuration < 30 ? '15-30' : topAvgDuration < 60 ? '30-60' : '60-90'
          generatedTips.push({
            type: 'success',
            icon: 'clock',
            text: `Tus mejores videos son de ${optimalRange} segundos`,
            detail: `Los videos cortos tienen ${Math.round((1 - topAvgDuration/bottomAvgDuration) * 100)}% mas engagement`
          })
        } else if (topAvgDuration > bottomAvgDuration * 1.3) {
          generatedTips.push({
            type: 'success',
            icon: 'clock',
            text: 'Tu audiencia prefiere contenido mas largo',
            detail: `Videos de ${Math.round(topAvgDuration)}+ segundos rinden mejor`
          })
        }
      }
    }

    // 2. Analyze emoji usage in titles
    const topWithEmojis = topVideos.filter(v => hasEmojis(v.title || '')).length
    const bottomWithEmojis = bottomVideos.filter(v => hasEmojis(v.title || '')).length
    const topEmojiRate = topWithEmojis / topVideos.length
    const bottomEmojiRate = bottomWithEmojis / bottomVideos.length

    if (topEmojiRate > bottomEmojiRate + 0.2) {
      const improvement = Math.round((topEmojiRate - bottomEmojiRate) * 100)
      generatedTips.push({
        type: 'success',
        icon: 'emoji',
        text: 'Videos con emojis en el titulo rinden mejor',
        detail: `+${improvement}% de tus top videos usan emojis`
      })
    } else if (bottomEmojiRate > topEmojiRate + 0.2) {
      generatedTips.push({
        type: 'warning',
        icon: 'emoji',
        text: 'Considera usar menos emojis en tus titulos',
        detail: 'Tus videos mas exitosos tienen titulos mas limpios'
      })
    }

    // 3. Analyze hashtag usage
    const topHashtagCounts = topVideos.map(v => extractHashtags(v.title || '').length)
    const bottomHashtagCounts = bottomVideos.map(v => extractHashtags(v.title || '').length)
    const avgTopHashtags = topHashtagCounts.reduce((a, b) => a + b, 0) / topVideos.length
    const avgBottomHashtags = bottomHashtagCounts.reduce((a, b) => a + b, 0) / bottomVideos.length

    if (avgTopHashtags > avgBottomHashtags + 1) {
      generatedTips.push({
        type: 'success',
        icon: 'hashtag',
        text: `Usa ${Math.round(avgTopHashtags)} hashtags para mejor alcance`,
        detail: 'Tus top videos tienen mas hashtags estrategicos'
      })
    } else if (avgBottomHashtags > avgTopHashtags + 2) {
      generatedTips.push({
        type: 'warning',
        icon: 'hashtag',
        text: 'Demasiados hashtags pueden afectar el rendimiento',
        detail: `Tus mejores videos usan ~${Math.round(avgTopHashtags)} hashtags`
      })
    }

    // 4. Analyze posting time patterns
    const topHours = topVideos.map(v => getHour(v.createdAt))
    const mostCommonTopHour = topHours.sort((a, b) =>
      topHours.filter(h => h === a).length - topHours.filter(h => h === b).length
    ).pop()

    if (mostCommonTopHour !== undefined) {
      const timeSlot = mostCommonTopHour < 12 ? 'manana' : mostCommonTopHour < 18 ? 'tarde' : 'noche'
      const hourRange = mostCommonTopHour < 12 ? '6-12' : mostCommonTopHour < 18 ? '12-18' : '18-24'
      generatedTips.push({
        type: 'info',
        icon: 'time',
        text: `Tus mejores videos fueron publicados en la ${timeSlot}`,
        detail: `Entre las ${hourRange}h tienes mejor engagement`
      })
    }

    // 5. Analyze day of week patterns
    const topDays = topVideos.map(v => getDayOfWeek(v.createdAt))
    const dayCounts: Record<number, number> = {}
    topDays.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1 })
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]

    if (bestDay && bestDay[1] >= 2) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      generatedTips.push({
        type: 'success',
        icon: 'calendar',
        text: `${dayNames[parseInt(bestDay[0])]} es tu mejor dia para publicar`,
        detail: `${bestDay[1]} de tus top videos fueron subidos ese dia`
      })
    }

    // 6. Title length analysis
    const topTitleLengths = topVideos.map(v => (v.title || '').length)
    const bottomTitleLengths = bottomVideos.map(v => (v.title || '').length)
    const avgTopTitleLength = topTitleLengths.reduce((a, b) => a + b, 0) / topVideos.length
    const avgBottomTitleLength = bottomTitleLengths.reduce((a, b) => a + b, 0) / bottomVideos.length

    if (avgTopTitleLength < avgBottomTitleLength * 0.7 && avgTopTitleLength < 50) {
      generatedTips.push({
        type: 'success',
        icon: 'title',
        text: 'Titulos cortos funcionan mejor para ti',
        detail: `~${Math.round(avgTopTitleLength)} caracteres es tu punto optimo`
      })
    } else if (avgTopTitleLength > avgBottomTitleLength * 1.3) {
      generatedTips.push({
        type: 'success',
        icon: 'title',
        text: 'Titulos descriptivos tienen mejor rendimiento',
        detail: 'Tu audiencia prefiere saber que esperar del video'
      })
    }

    // 7. Engagement benchmark comparison
    if (avgEngagement >= 6) {
      generatedTips.push({
        type: 'success',
        icon: 'chart',
        text: `Tu engagement (${avgEngagement.toFixed(1)}%) esta sobre el promedio`,
        detail: 'El promedio de TikTok es ~5.68%'
      })
    } else if (avgEngagement < 4) {
      generatedTips.push({
        type: 'warning',
        icon: 'chart',
        text: `Tu engagement (${avgEngagement.toFixed(1)}%) esta bajo el promedio`,
        detail: 'El promedio de TikTok es ~5.68%. Prueba los tips anteriores!'
      })
    }

    return generatedTips.slice(0, 5) // Max 5 tips
  }, [videos])

  if (videos.length < 3) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Recomendaciones AI</h3>
            <p className="text-xs text-gray-500">Analisis de patrones de contenido</p>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Necesitas al menos 3 videos para generar recomendaciones personalizadas.
          </p>
        </div>
      </div>
    )
  }

  if (tips.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Recomendaciones AI</h3>
            <p className="text-xs text-gray-500">Analizando tus patrones...</p>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Sigue subiendo videos para obtener insights mas precisos.
          </p>
        </div>
      </div>
    )
  }

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'clock':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'emoji':
        return <span className="text-lg">😊</span>
      case 'hashtag':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        )
      case 'time':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'calendar':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'title':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        )
      case 'chart':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Recomendaciones AI</h3>
          <p className="text-xs text-gray-500">Basado en el analisis de {videos.length} videos</p>
        </div>
      </div>

      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-xl ${
              tip.type === 'success' ? 'bg-green-50 border border-green-100' :
              tip.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
              'bg-blue-50 border border-blue-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              tip.type === 'success' ? 'bg-green-100 text-green-600' :
              tip.type === 'warning' ? 'bg-amber-100 text-amber-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {getIcon(tip.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                tip.type === 'success' ? 'text-green-900' :
                tip.type === 'warning' ? 'text-amber-900' :
                'text-blue-900'
              }`}>
                {tip.text}
              </p>
              {tip.detail && (
                <p className={`text-xs mt-0.5 ${
                  tip.type === 'success' ? 'text-green-700' :
                  tip.type === 'warning' ? 'text-amber-700' :
                  'text-blue-700'
                }`}>
                  {tip.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
