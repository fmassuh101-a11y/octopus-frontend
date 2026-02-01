'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
      brand: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      outline: 'bg-transparent border border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300',
    }

    const sizes = {
      sm: 'text-[10px] px-1.5 py-0.5',
      md: 'text-xs px-2.5 py-1',
      lg: 'text-sm px-3 py-1.5',
    }

    const dotColors = {
      default: 'bg-neutral-500',
      brand: 'bg-sky-500',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      outline: 'bg-neutral-500',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
