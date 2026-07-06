'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Briefcase, LayoutDashboard, Wallet, MessageCircle, User, type LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** rutas que también marcan este tab como activo */
  match: string[]
}

// Navegación única y consistente del creador (misma en toda la app)
const ITEMS: NavItem[] = [
  { label: 'Trabajos', href: '/gigs', icon: Briefcase, match: ['/gigs'] },
  { label: 'Panel', href: '/creator/dashboard', icon: LayoutDashboard, match: ['/creator/dashboard', '/creator/applications', '/creator/contracts', '/creator/deliveries', '/creator/analytics'] },
  { label: 'Wallet', href: '/creator/wallet', icon: Wallet, match: ['/creator/wallet', '/creator/earnings'] },
  { label: 'Mensajes', href: '/creator/messages', icon: MessageCircle, match: ['/creator/messages'] },
  { label: 'Perfil', href: '/creator/profile', icon: User, match: ['/creator/profile'] },
]

export default function CreatorBottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname() || ''

  const isActive = (item: NavItem) =>
    item.match.some((m) => pathname === m || pathname.startsWith(m + '/'))

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-neutral-950/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around px-1 pt-1.5">
        {ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl pb-1.5 pt-1 transition-colors active:scale-95 ${
                active ? 'text-emerald-400' : 'text-neutral-500'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-emerald-400"
                />
              )}
              <span className="relative">
                <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                {item.label === 'Mensajes' && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
