'use client'

import { useEffect, useState } from 'react'
import BottomBar from '@/components/oct/BottomBar'
import Toaster from '@/components/oct/toast'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Shell persistente del creador (estilo SideShift): la barra flotante se monta
// UNA vez y no se desmonta al navegar. Solo cambia <main>.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) return
    fetch(`${SUPABASE_URL}/rest/v1/messages?sender_type=eq.company&read_at=is.null&select=id`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((m) => setUnread(Array.isArray(m) ? Math.min(m.length, 99) : 0))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD]">
      <main>{children}</main>
      <BottomBar unread={unread} />
      <Toaster />
    </div>
  )
}
