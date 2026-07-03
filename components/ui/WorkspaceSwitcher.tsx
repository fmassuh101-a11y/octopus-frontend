'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Building2, Gift } from 'lucide-react'
import {
  Workspace, getActiveCompany, setActiveCompany, loadWorkspaces, loadPendingInvites, acceptInvite,
} from '@/lib/workspace'

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const [spaces, setSpaces] = useState<Workspace[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [me, setMe] = useState<{ id: string; email: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('sb-user')
    const token = localStorage.getItem('sb-access-token')
    if (!userStr || !token) return
    const u = JSON.parse(userStr)
    setMe({ id: u.id, email: u.email })
    const name = u.email?.split('@')[0] || 'Mi cuenta'
    loadWorkspaces(u.id, name, u.email, token).then(setSpaces)
    loadPendingInvites(u.email, token).then(setInvites)
    setActiveId(getActiveCompany()?.id || u.id)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const switchTo = (w: Workspace) => {
    if (w.own) setActiveCompany(null)
    else setActiveCompany({ id: w.id, name: w.name })
    window.location.href = '/company/dashboard'
  }

  const accept = async (inv: any) => {
    const token = localStorage.getItem('sb-access-token')
    if (!token || !me) return
    const ok = await acceptInvite(inv.id, me.id, token)
    if (ok) {
      setInvites(prev => prev.filter(i => i.id !== inv.id))
      setSpaces(prev => [...prev, { id: inv.companyId, name: inv.companyName, own: false }])
    }
  }

  // Si solo tengo mi cuenta y sin invitaciones, no muestro nada
  if (spaces.length <= 1 && invites.length === 0) return null

  const active = spaces.find(s => s.id === activeId) || spaces[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors text-sm"
      >
        <Building2 className="w-4 h-4 text-emerald-400" />
        <span className="text-white font-medium max-w-[140px] truncate">{active?.name || 'Mi cuenta'}</span>
        {invites.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
        <ChevronDown className="w-4 h-4 text-neutral-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 p-1.5">
          <p className="px-3 py-1.5 text-xs text-neutral-500 font-medium">Espacios de trabajo</p>
          {spaces.map(w => (
            <button
              key={w.id}
              onClick={() => switchTo(w)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors text-sm text-white"
            >
              <span className="truncate">{w.own ? 'Mi cuenta' : w.name}</span>
              {w.id === activeId && <Check className="w-4 h-4 text-emerald-400" />}
            </button>
          ))}

          {invites.length > 0 && (
            <>
              <p className="px-3 py-1.5 mt-1 text-xs text-neutral-500 font-medium border-t border-neutral-800">Invitaciones</p>
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 text-neutral-300 truncate">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" /> {inv.companyName}
                  </span>
                  <button onClick={() => accept(inv)} className="text-emerald-400 font-medium hover:underline text-xs">Aceptar</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
