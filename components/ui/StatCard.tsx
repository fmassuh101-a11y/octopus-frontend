'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './Card'

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  change?: {
    value: string | number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: React.ReactNode
  trend?: React.ReactNode
  loading?: boolean
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, change, icon, trend, loading = false, ...props }, ref) => {
    const changeColors = {
      increase: 'text-green-600 dark:text-green-400',
      decrease: 'text-red-600 dark:text-red-400',
      neutral: 'text-neutral-500',
    }

    const changeIcons = {
      increase: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      ),
      decrease: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      neutral: null,
    }

    if (loading) {
      return (
        <Card ref={ref} className={cn('p-5', className)} {...props}>
          <div className="animate-pulse">
            <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
            <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
            <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn('p-5', className)} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {value}
            </p>
            {change && (
              <div className={cn('flex items-center gap-1 mt-1', changeColors[change.type])}>
                {changeIcons[change.type]}
                <span className="text-xs font-medium">{change.value}</span>
              </div>
            )}
            {trend && (
              <div className="mt-3">
                {trend}
              </div>
            )}
          </div>
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/10 to-violet-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              {icon}
            </div>
          )}
        </div>
      </Card>
    )
  }
)

StatCard.displayName = 'StatCard'

export { StatCard }
