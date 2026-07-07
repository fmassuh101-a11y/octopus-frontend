'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Search, GraduationCap, MessageCircle, User, type LucideIcon } from 'lucide-react'

interface Item {
  href: string
  icon: LucideIcon
  label: string
  match: string[]
}

// Bottom nav estilo SideShift: píldora blanca flotante, 5 íconos sin texto,
// el activo lleva un círculo gris detrás.
const ITEMS: Item[] = [
  { href: '/creator/dashboard', icon: Home, label: 'Inicio', match: ['/creator/dashboard'] },
  { href: '/gigs', icon: Search, label: 'Explorar', match: ['/gigs'] },
  { href: '/creator/academia', icon: GraduationCap, label: 'Academia', match: ['/creator/academia', '/creator/misiones'] },
  { href: '/creator/messages', icon: MessageCircle, label: 'Mensajes', match: ['/creator/messages'] },
  { href: '/creator/profile', icon: User, label: 'Perfil', match: ['/creator/profile', '/creator/wallet', '/creator/applications', '/creator/contracts', '/creator/deliveries', '/creator/analytics', '/creator/earnings'] },
]

export default function BottomBar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname() || ''
  const isActive = (it: Item) => it.match.some((m) => pathname === m || pathname.startsWith(m + '/'))

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pointer-events-none">
      <nav className="pointer-events-auto flex w-full max-w-md items-center justify-around rounded-full border border-black/[0.06] bg-white/95 px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        {ITEMS.map((it) => {
          const active = isActive(it)
          return (
            <Link
              key={it.href}
              href={it.href}
              prefetch
              aria-label={it.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-12 w-14 items-center justify-center active:scale-90 transition-transform"
            >
              {active && (
                <motion.span
                  layoutId="oct-nav-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-x-1 inset-y-0.5 rounded-full bg-neutral-100"
                />
              )}
              <span className="relative text-neutral-900">
                <it.icon className="h-6 w-6" strokeWidth={active ? 2.3 : 1.9} />
                {it.label === 'Mensajes' && unread > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
