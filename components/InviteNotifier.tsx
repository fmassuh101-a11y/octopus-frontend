'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { loadPendingInvites, acceptInvite, setActiveCompany } from '@/lib/workspace'
import { setActivePerms } from '@/lib/permissions'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Notificación global: si alguien te invitó a su equipo, te aparece una
// invitación profesional en cualquier pantalla. Aceptar te lleva al
// dashboard de esa empresa.
export default function InviteNotifier() {
  const [invite, setInvite] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    const u = JSON.parse(userStr)
    if (!u.email) return
    // no repetir si ya la pospuso en esta sesión
    loadPendingInvites(u.email, token).then(list => {
      const pending = list.find((i: any) => !sessionStorage.getItem(`invite-snooze-${i.id}`))
      if (pending) setInvite(pending)
    }).catch(() => {})
  }, [])

  if (!invite) return null

  const accept = async () => {
    setBusy(true)
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    const u = JSON.parse(userStr)
    const ok = await acceptInvite(invite.id, u.id, token)
    if (ok) {
      // cargar permisos que me asignaron y activar el espacio
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/team_members?id=eq.${invite.id}&select=permissions`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const rows = res.ok ? await res.json() : []
        setActivePerms(Array.isArray(rows[0]?.permissions) ? rows[0].permissions : [])
      } catch { setActivePerms([]) }
      setActiveCompany({ id: invite.companyId, name: invite.companyName })
      window.location.href = '/company/dashboard'
    } else {
      setBusy(false)
    }
  }

  const later = () => {
    sessionStorage.setItem(`invite-snooze-${invite.id}`, '1')
    setInvite(null)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4">
      <div className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-emerald-500/10">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
          <Users className="w-8 h-8 text-emerald-400" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Te invitaron a un equipo</h2>
        <p className="text-neutral-400 mb-6">
          <span className="text-white font-medium">{invite.companyName}</span> quiere que te unas a su equipo en Octopus.
          Podrás ver y gestionar sus campañas desde tu cuenta.
        </p>
        <div className="flex gap-3">
          <button
            onClick={later}
            className="flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={accept}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold transition-colors"
          >
            {busy ? 'Uniéndome...' : 'Unirme al equipo'}
          </button>
        </div>
      </div>
    </div>
  )
}
