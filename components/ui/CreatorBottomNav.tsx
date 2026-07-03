'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur border-t border-neutral-800">
      <div className="flex justify-around py-2.5">
        {ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                active ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              {item.label === 'Mensajes' && unread > 0 && (
                <span className="absolute top-0 right-2 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
