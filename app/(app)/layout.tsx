'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomBar from '@/components/oct/BottomBar'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Shell persistente del creador (estilo SideShift): la barra flotante se monta
// UNA vez y no se desmonta al navegar. Solo cambia <main>.
// SEGURIDAD: este grupo es SOLO PARA CREADORES — una empresa que caiga acá
// (por un link de campaña, etc.) rebota a su dashboard. Sin esto una empresa
// podía navegar /gigs y hasta postular a campañas.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    // cache local para no consultar en cada navegación
    const cached = localStorage.getItem('oct-user-type')
    if (cached === 'company') { router.replace('/company/dashboard'); return }
    if (cached === 'creator') return
    const user = JSON.parse(userStr)
    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const t = rows?.[0]?.user_type
        if (t) localStorage.setItem('oct-user-type', t)
        if (t === 'company') router.replace('/company/dashboard')
      })
      .catch(() => {})
  }, [router])

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD]">
      <main>{children}</main>
      <BottomBar unread={0} />
    </div>
  )
}
