'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  status?: 'online' | 'offline' | 'busy' | 'away' | null
  ring?: boolean
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', status = null, ring = false, ...props }, ref) => {
    const sizes = {
      xs: 'w-6 h-6 text-[10px]',
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
      '2xl': 'w-24 h-24 text-2xl',
    }

    const statusSizes = {
      xs: 'w-1.5 h-1.5 right-0 bottom-0',
      sm: 'w-2 h-2 right-0 bottom-0',
      md: 'w-2.5 h-2.5 right-0 bottom-0',
      lg: 'w-3 h-3 right-0.5 bottom-0.5',
      xl: 'w-4 h-4 right-0.5 bottom-0.5',
      '2xl': 'w-5 h-5 right-1 bottom-1',
    }

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-neutral-400',
      busy: 'bg-red-500',
      away: 'bg-amber-500',
    }

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white font-semibold overflow-hidden flex-shrink-0',
          sizes[size],
          ring && 'ring-2 ring-white dark:ring-neutral-900 ring-offset-2',
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || fallback || 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{fallback ? getInitials(fallback) : '?'}</span>
        )}
        {status && (
          <span
            className={cn(
              'absolute rounded-full border-2 border-white dark:border-neutral-900',
              statusSizes[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

// Avatar Group
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: AvatarProps['size']
}

const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 4, size = 'md', children, ...props }, ref) => {
    const childArray = Array.isArray(children) ? children : [children]
    const visibleAvatars = childArray.slice(0, max)
    const remainingCount = childArray.length - max

    return (
      <div ref={ref} className={cn('flex -space-x-2', className)} {...props}>
        {visibleAvatars}
        {remainingCount > 0 && (
          <Avatar
            size={size}
            fallback={`+${remainingCount}`}
            className="bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
          />
        )}
      </div>
    )
  }
)

AvatarGroup.displayName = 'AvatarGroup'

export { Avatar, AvatarGroup }
