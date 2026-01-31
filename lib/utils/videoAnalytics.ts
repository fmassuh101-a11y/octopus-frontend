import {
  TikTokVideo,
  AnalyzedVideo,
  VideoClassification,
  TrendDirection,
  TimePeriodValue,
  PerformanceDataPoint,
  PublishingInsight,
  CampaignStats,
  VideoAnalysis,
  DAYS_OF_WEEK,
  TIME_SLOTS
} from '../types/analytics'

// Calculate engagement rate for a single video
export function calculateEngagementRate(video: TikTokVideo): number {
  if (!video.views || video.views === 0) return 0
  const totalEngagement = (video.likes || 0) + (video.comments || 0) + (video.shares || 0)
  return parseFloat(((totalEngagement / video.views) * 100).toFixed(2))
}

// Calculate average engagement rate for multiple videos
export function calculateAverageEngagement(videos: TikTokVideo[]): number {
  if (videos.length === 0) return 0
  const total = videos.reduce((sum, v) => sum + calculateEngagementRate(v), 0)
  return parseFloat((total / videos.length).toFixed(2))
}

// Classify video performance based on comparison to average
export function classifyVideoPerformance(
  videoEngagement: number,
  avgEngagement: number
): VideoClassification {
  if (avgEngagement === 0) return 'average'

  const ratio = videoEngagement / avgEngagement

  if (ratio >= 2.0) return 'viral'           // 2x+ average
  if (ratio >= 1.3) return 'above_average'   // 30%+ above
  if (ratio >= 0.8) return 'average'         // within 20%
  if (ratio >= 0.5) return 'below_average'   // 50-80% of avg
  return 'underperforming'                    // below 50%
}

// Calculate trend based on comparison to previous videos
export function calculateTrend(
  currentEngagement: number,
  previousVideos: TikTokVideo[]
): TrendDirection {
  if (previousVideos.length === 0) return 'stable'

  const lastFive = previousVideos.slice(0, 5)
  const avgOfLast = calculateAverageEngagement(lastFive)

  if (currentEngagement > avgOfLast * 1.1) return 'up'    // 10%+ better
  if (currentEngagement < avgOfLast * 0.9) return 'down'  // 10%+ worse
  return 'stable'
}

// Filter videos by time period
export function filterVideosByPeriod(
  videos: TikTokVideo[],
  period: TimePeriodValue
): TikTokVideo[] {
  if (period === 'all') return videos

  const now = new Date()
  let cutoff: Date

  switch (period) {
    case '1h':
      cutoff = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case '24h':
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '1y':
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      return videos
  }

  return videos.filter(v => new Date(v.createdAt) >= cutoff)
}

// Analyze all videos and add classification data
export function analyzeVideos(videos: TikTokVideo[]): AnalyzedVideo[] {
  if (videos.length === 0) return []

  const avgEngagement = calculateAverageEngagement(videos)

  // Sort by date descending (newest first)
  const sortedVideos = [...videos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return sortedVideos.map((video, index) => {
    const engagementRate = calculateEngagementRate(video)
    const previousVideos = sortedVideos.slice(index + 1)
    const classification = classifyVideoPerformance(engagementRate, avgEngagement)
    const trend = calculateTrend(engagementRate, previousVideos)
    const comparisonToAverage = avgEngagement > 0
      ? parseFloat((((engagementRate - avgEngagement) / avgEngagement) * 100).toFixed(1))
      : 0

    return {
      ...video,
      engagementRate,
      classification,
      comparisonToAverage,
      trend,
      performanceRank: index + 1
    }
  })
}

// Get detailed analysis for a single video
export function getVideoAnalysis(
  video: TikTokVideo,
  allVideos: TikTokVideo[]
): VideoAnalysis {
  const analyzedVideos = analyzeVideos(allVideos)
  const analyzedVideo = analyzedVideos.find(v => v.id === video.id) || analyzeVideos([video])[0]
  const avgEngagement = calculateAverageEngagement(allVideos)

  // Sort by engagement to determine if top/under performer
  const sortedByEngagement = [...analyzedVideos].sort(
    (a, b) => b.engagementRate - a.engagementRate
  )
  const topThreshold = Math.ceil(sortedByEngagement.length * 0.2) // Top 20%
  const bottomThreshold = Math.floor(sortedByEngagement.length * 0.8) // Bottom 20%

  const topIds = sortedByEngagement.slice(0, topThreshold).map(v => v.id)
  const bottomIds = sortedByEngagement.slice(bottomThreshold).map(v => v.id)

  return {
    video: analyzedVideo,
    accountAvgEngagement: avgEngagement,
    percentageDifference: analyzedVideo.comparisonToAverage,
    timeSincePosted: getTimeSincePosted(video.createdAt),
    totalVideos: allVideos.length,
    isTopPerformer: topIds.includes(video.id),
    isUnderperformer: bottomIds.includes(video.id)
  }
}

// Get human-readable time since posted
export function getTimeSincePosted(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days} dias`
  if (weeks < 4) return `Hace ${weeks} semanas`
  return `Hace ${months} meses`
}

// Get top performing videos
export function getTopPerformers(videos: TikTokVideo[], count: number = 5): AnalyzedVideo[] {
  const analyzed = analyzeVideos(videos)
  return [...analyzed]
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, count)
}

// Get underperforming videos
export function getUnderperformers(videos: TikTokVideo[], count: number = 5): AnalyzedVideo[] {
  const analyzed = analyzeVideos(videos)
  return [...analyzed]
    .sort((a, b) => a.engagementRate - b.engagementRate)
    .slice(0, count)
}

// Generate performance data for charts
export function generatePerformanceData(videos: TikTokVideo[]): PerformanceDataPoint[] {
  if (videos.length === 0) return []

  // Group videos by date
  const videosByDate: Record<string, TikTokVideo[]> = {}

  videos.forEach(video => {
    const date = new Date(video.createdAt).toISOString().split('T')[0]
    if (!videosByDate[date]) {
      videosByDate[date] = []
    }
    videosByDate[date].push(video)
  })

  // Convert to data points
  const dataPoints: PerformanceDataPoint[] = Object.entries(videosByDate)
    .map(([date, dayVideos]) => {
      const totalViews = dayVideos.reduce((sum, v) => sum + (v.views || 0), 0)
      const totalLikes = dayVideos.reduce((sum, v) => sum + (v.likes || 0), 0)
      const totalComments = dayVideos.reduce((sum, v) => sum + (v.comments || 0), 0)
      const totalShares = dayVideos.reduce((sum, v) => sum + (v.shares || 0), 0)
      const avgEngagement = calculateAverageEngagement(dayVideos)

      const dateObj = new Date(date)
      const displayDate = dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      })

      return {
        date,
        displayDate,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        engagementRate: avgEngagement,
        videoCount: dayVideos.length
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return dataPoints
}

// Generate publishing insights (best times to post)
export function generatePublishingInsights(videos: TikTokVideo[]): PublishingInsight[] {
  if (videos.length === 0) return []

  // Initialize grid
  const grid: Record<string, { total: number; count: number }> = {}

  DAYS_OF_WEEK.forEach((day, dayIdx) => {
    TIME_SLOTS.forEach((slot, slotIdx) => {
      grid[`${dayIdx}-${slotIdx}`] = { total: 0, count: 0 }
    })
  })

  // Fill grid with data
  videos.forEach(video => {
    const date = new Date(video.createdAt)
    const dayIdx = (date.getDay() + 6) % 7 // Monday = 0
    const hour = date.getHours()

    let slotIdx: number
    if (hour >= 6 && hour < 12) slotIdx = 0
    else if (hour >= 12 && hour < 18) slotIdx = 1
    else slotIdx = 2

    const key = `${dayIdx}-${slotIdx}`
    const engagement = calculateEngagementRate(video)

    grid[key].total += engagement
    grid[key].count += 1
  })

  // Convert to insights
  const insights: PublishingInsight[] = []
  let maxAvg = 0

  DAYS_OF_WEEK.forEach((day, dayIdx) => {
    TIME_SLOTS.forEach((slot, slotIdx) => {
      const key = `${dayIdx}-${slotIdx}`
      const { total, count } = grid[key]
      const avgEngagement = count > 0 ? total / count : 0

      if (avgEngagement > maxAvg) maxAvg = avgEngagement

      insights.push({
        dayOfWeek: day,
        dayIndex: dayIdx,
        timeSlot: slot,
        timeSlotIndex: slotIdx,
        avgEngagement,
        videoCount: count,
        isRecommended: false // Will update below
      })
    })
  })

  // Mark top 3 as recommended
  const threshold = maxAvg * 0.8
  insights.forEach(insight => {
    insight.isRecommended = insight.avgEngagement >= threshold && insight.videoCount > 0
  })

  return insights
}

// Get campaign statistics
export function getCampaignStats(videos: TikTokVideo[]): CampaignStats {
  if (videos.length === 0) {
    return {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      avgEngagement: 0,
      bestVideo: null,
      worstVideo: null,
      videosAboveAvg: 0,
      videosBelowAvg: 0,
      trendingUp: 0
    }
  }

  const analyzed = analyzeVideos(videos)
  const avgEngagement = calculateAverageEngagement(videos)

  const sortedByEngagement = [...analyzed].sort(
    (a, b) => b.engagementRate - a.engagementRate
  )

  return {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, v) => sum + (v.views || 0), 0),
    totalLikes: videos.reduce((sum, v) => sum + (v.likes || 0), 0),
    totalComments: videos.reduce((sum, v) => sum + (v.comments || 0), 0),
    totalShares: videos.reduce((sum, v) => sum + (v.shares || 0), 0),
    avgEngagement,
    bestVideo: sortedByEngagement[0] || null,
    worstVideo: sortedByEngagement[sortedByEngagement.length - 1] || null,
    videosAboveAvg: analyzed.filter(v => v.engagementRate > avgEngagement).length,
    videosBelowAvg: analyzed.filter(v => v.engagementRate < avgEngagement).length,
    trendingUp: analyzed.filter(v => v.trend === 'up').length
  }
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toString()
}

// Format percentage with sign
export function formatPercentageWithSign(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
