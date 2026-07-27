'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import CompanyNav from '@/components/layout/CompanyNav'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [userData, setUserData] = useState<{
    userName: string
    userEmail: string
    avatarUrl?: string
  } | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')

      if (!userStr || !token) return

      const user = JSON.parse(userStr)

      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=full_name,avatar_url`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            }
          }
        )

        if (res.ok) {
          const profiles = await res.json()
          if (profiles.length > 0) {
            setUserData({
              userName: profiles[0].full_name || 'Usuario',
              userEmail: user.email || '',
              avatarUrl: profiles[0].avatar_url
            })
            return
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err)
      }

      setUserData({
        userName: 'Usuario',
        userEmail: user.email || ''
      })
    }

    loadUserData()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* El menú se monta acá, FUERA de <main>. Por eso al navegar solo se
          vuelve a dibujar el contenido y el menú se queda quieto: ni parpadea
          ni pierde la posición del scroll. */}
      <CompanyNav
        userName={userData?.userName}
        userEmail={userData?.userEmail}
        avatarUrl={userData?.avatarUrl}
      />

      {/* En computador el contenido se corre para dejarle su espacio al carril
          (w-60 = 15rem). En teléfono ocupa todo, porque ahí el menú es un cajón
          que va por encima. */}
      <main className="lg:pl-60">
        {/* La clave por ruta reinicia la aparición en cada navegación.
            La animación se define en globals.css y se apaga sola si la persona
            tiene el movimiento reducido en su sistema. */}
        <div key={pathname} className="oct-entra">
          {children}
        </div>
      </main>
    </div>
  )
}
