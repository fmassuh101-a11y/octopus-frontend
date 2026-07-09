'use client'

import { SiTiktok, SiInstagram, SiYoutube } from '@icons-pack/react-simple-icons'
import { ArrowUpRight } from 'lucide-react'

// Fila de red social con el LOGO OFICIAL de la marca (colores reales), no dibujado a mano.
type Net = 'tiktok' | 'instagram' | 'youtube'
const META: Record<Net, { Icon: any; label: string; color: string; url: (u: string) => string }> = {
  tiktok: { Icon: SiTiktok, label: 'TikTok', color: '#000000', url: (u) => `https://tiktok.com/@${u}` },
  instagram: { Icon: SiInstagram, label: 'Instagram', color: '#E4405F', url: (u) => `https://instagram.com/${u}` },
  youtube: { Icon: SiYoutube, label: 'YouTube', color: '#FF0000', url: (u) => `https://youtube.com/@${u}` },
}

export function SocialRow({ net, handle, dark = true }: { net: Net; handle: string; dark?: boolean }) {
  if (!handle) return null
  const { Icon, label, color, url } = META[net]
  const u = handle.replace(/^@/, '').trim()
  return (
    <a href={url(u)} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-2xl border p-4 transition ${dark ? 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-white' : 'border-neutral-100 bg-white hover:border-neutral-200 text-neutral-900 shadow-sm'}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a` }}>
        <Icon size={26} color={color === '#000000' && dark ? '#ffffff' : color} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{label}</p>
        <p className={`truncate text-sm ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>@{u}</p>
      </div>
      <ArrowUpRight className={`h-5 w-5 shrink-0 ${dark ? 'text-neutral-500' : 'text-neutral-400'}`} />
    </a>
  )
}
