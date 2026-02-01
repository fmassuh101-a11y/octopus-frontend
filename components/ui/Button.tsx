'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'brand' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

    const variants = {
      primary: 'bg-neutral-900 text-white hover:bg-neutral-800 focus:ring-neutral-900/50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100',
      secondary: 'bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 focus:ring-neutral-500/20 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700',
      brand: 'bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:opacity-90 focus:ring-sky-500/50 shadow-lg shadow-sky-500/25',
      ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/50',
      outline: 'bg-transparent border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900',
    }

    const sizes = {
      sm: 'text-xs px-3 py-2 h-8',
      md: 'text-sm px-4 py-2.5 h-10',
      lg: 'text-base px-6 py-3 h-12',
      icon: 'p-2.5 h-10 w-10',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
