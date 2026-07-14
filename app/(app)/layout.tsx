'use client'

import BottomBar from '@/components/oct/BottomBar'

// Shell persistente del creador (estilo SideShift): la barra flotante se monta
// UNA vez y no se desmonta al navegar. Solo cambia <main>.
// Badge de no-leídos: el sistema viejo (tabla messages) quedó muerto y generaba
// badges FANTASMA — apagado hasta cablear los no-leídos reales de Whop.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD]">
      <main>{children}</main>
      <BottomBar unread={0} />
    </div>
  )
}
