'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface UserAvatarProps {
  /** Destino al hacer click. Por defecto el perfil del creador. */
  href?: string
  /** Tamaño en px (ancho = alto). Por defecto 44. */
  size?: number
  /** Email para la inicial de fallback. */
  email?: string
  className?: string
}

/**
 * Avatar del usuario: muestra su foto de perfil (cacheada) y enlaza a su perfil.
 * Fallback a la inicial del email. Reutilizable en todos los encabezados.
 */
export default function UserAvatar({
  href = '/creator/profile',
  size = 44,
  email,
  className = '',
}: UserAvatarProps) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [initial, setInitial] = useState('U')

  useEffect(() => {
    // 1) inicial de fallback
    try {
      const userStr = localStorage.getItem('sb-user')
      const mail = email || (userStr ? JSON.parse(userStr).email : '')
      if (mail) setInitial(mail.charAt(0).toUpperCase())
    } catch {}

    // 2) foto cacheada (instantánea)
    const cached = localStorage.getItem('octopus-avatar')
    if (cached) setPhoto(cached)

    // 3) refrescar desde la base en segundo plano
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    let uid = ''
    try { uid = JSON.parse(userStr).id } catch { return }

    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${uid}&select=profile_photo_url,avatar_url`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const url = rows?.[0]?.profile_photo_url || rows?.[0]?.avatar_url
        if (url) {
          setPhoto(url)
          try { localStorage.setItem('octopus-avatar', url) } catch {}
        }
      })
      .catch(() => {})
  }, [email])

  return (
    <Link
      href={href}
      aria-label="Ir a mi perfil"
      className={`rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 ring-2 ring-transparent hover:ring-emerald-400/50 transition-all shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Perfil" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-semibold" style={{ fontSize: size * 0.4 }}>
          {initial}
        </span>
      )}
    </Link>
  )
}
