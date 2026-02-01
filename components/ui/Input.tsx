'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, hint, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 focus:bg-white',
              'dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500',
              'dark:focus:bg-neutral-900 dark:focus:border-sky-500',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-500 focus:ring-red-500/30 focus:border-red-500',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 focus:bg-white',
            'dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500',
            'dark:focus:bg-neutral-900 dark:focus:border-sky-500',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
            error && 'border-red-500 focus:ring-red-500/30 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
