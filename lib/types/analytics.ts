// Analytics Types for TikTok Creator Dashboard

export type VideoClassification = 'viral' | 'above_average' | 'average' | 'below_average' | 'underperforming'
export type TrendDirection = 'up' | 'down' | 'stable'
export type TimePeriodValue = '1h' | '24h' | '7d' | '30d' | '1y' | 'all'

export interface TikTokVideo {
  id: string
  title: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  shares: number
  createdAt: string
  duration?: number // Video duration in seconds (optional)
  description?: string // Video description (optional)
}

export interface AnalyzedVideo extends TikTokVideo {
  engagementRate: number
  classification: VideoClassification
  comparisonToAverage: number // percentage difference from account average
  trend: TrendDirection
  performanceRank: number
}

export interface VideoAnalysis {
  video: AnalyzedVideo
  accountAvgEngagement: number
  percentageDifference: number
  timeSincePosted: string
  totalVideos: number
  isTopPerformer: boolean
  isUnderperformer: boolean
}

export interface TimePeriod {
  label: string
  value: TimePeriodValue
  shortLabel: string
}

export interface PerformanceDataPoint {
  date: string
  displayDate: string
  views: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
  videoCount: number
}

export interface PublishingInsight {
  dayOfWeek: string
  dayIndex: number
  timeSlot: string
  timeSlotIndex: number
  avgEngagement: number
  videoCount: number
  isRecommended: boolean
}

export interface CampaignStats {
  totalVideos: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgEngagement: number
  bestVideo: AnalyzedVideo | null
  worstVideo: AnalyzedVideo | null
  videosAboveAvg: number
  videosBelowAvg: number
  trendingUp: number
}

export interface ClassificationConfig {
  label: string
  labelEs: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
}

export const CLASSIFICATION_CONFIG: Record<VideoClassification, ClassificationConfig> = {
  viral: {
    label: 'Viral',
    labelEs: 'Viral',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: 'fire'
  },
  above_average: {
    label: 'Above Average',
    labelEs: 'Sobre Promedio',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: 'trending-up'
  },
  average: {
    label: 'Average',
    labelEs: 'Promedio',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: 'minus'
  },
  below_average: {
    label: 'Below Average',
    labelEs: 'Bajo Promedio',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: 'trending-down'
  },
  underperforming: {
    label: 'Underperforming',
    labelEs: 'Bajo Rendimiento',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: 'alert'
  }
}

export const TIME_PERIODS: TimePeriod[] = [
  { label: '1 Hora', value: '1h', shortLabel: '1h' },
  { label: '24 Horas', value: '24h', shortLabel: '24h' },
  { label: '7 Dias', value: '7d', shortLabel: '7d' },
  { label: '30 Dias', value: '30d', shortLabel: '30d' },
  { label: '1 Ano', value: '1y', shortLabel: '1y' },
  { label: 'Todo', value: 'all', shortLabel: 'Todo' }
]

export const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
export const TIME_SLOTS = ['6AM-12PM', '12PM-6PM', '6PM-12AM']
