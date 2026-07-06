'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { TikTokVideo, PerformanceDataPoint } from '@/lib/types/analytics'
import { generatePerformanceData, formatNumber } from '@/lib/utils/videoAnalytics'

interface PerformanceChartProps {
  videos: TikTokVideo[]
}

type MetricType = 'engagement' | 'views' | 'likes'

const METRIC_CONFIG: Record<MetricType, {
  label: string
  dataKey: string
  color: string
  formatter: (val: number) => string
}> = {
  engagement: {
    label: 'Engagement',
    dataKey: 'engagementRate',
    color: '#3B82F6',
    formatter: (val) => `${val}%`
  },
  views: {
    label: 'Views',
    dataKey: 'views',
    color: '#8B5CF6',
    formatter: formatNumber
  },
  likes: {
    label: 'Likes',
    dataKey: 'likes',
    color: '#EC4899',
    formatter: formatNumber
  }
}

export function PerformanceChart({ videos }: PerformanceChartProps) {
  const [metric, setMetric] = useState<MetricType>('engagement')
  const data = generatePerformanceData(videos)
  const config = METRIC_CONFIG[metric]

  if (data.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-white placeholder-neutral-500">
        <h3 className="font-semibold text-white mb-4">Rendimiento en el Tiempo</h3>
        <div className="h-48 flex items-center justify-center text-neutral-500 text-sm">
          No hay suficientes datos para mostrar el grafico
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-white placeholder-neutral-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h3 className="font-semibold text-white">Rendimiento en el Tiempo</h3>

        {/* Metric Toggle */}
        <div className="flex bg-neutral-800 rounded-lg p-1">
          {(Object.keys(METRIC_CONFIG) as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                metric === m
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              } placeholder-neutral-500`}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={config.formatter}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value) => [config.formatter(Number(value) || 0), config.label]}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Area
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-white">
            {data.length}
          </div>
          <div className="text-xs text-neutral-500">Dias con videos</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {data.reduce((sum, d) => sum + d.videoCount, 0)}
          </div>
          <div className="text-xs text-neutral-500">Videos totales</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {(data.reduce((sum, d) => sum + d.engagementRate, 0) / data.length).toFixed(1)}%
          </div>
          <div className="text-xs text-neutral-500">Engagement prom.</div>
        </div>
      </div>
    </div>
  )
}
