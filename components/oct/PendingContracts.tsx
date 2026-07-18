'use client'

import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { FileText, ChevronRight } from 'lucide-react'

// Banner "tenés un contrato pendiente" para el home del creador — sin esto no
// había forma de enterarse (pedido de Felipe). Linkea directo al documento.
export default function PendingContracts() {
  const [pending, setPending] = useState<Array<{ id: string; title: string }>>([])

  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const userStr = localStorage.getItem('sb-user')
        if (!token || !userStr) return
        const user = JSON.parse(userStr)
        const rows = await (
          await fetch(
            `${SUPABASE_URL}/rest/v1/contracts?creator_id=eq.${user.id}&status=in.(sent,pending)&select=id,title&order=created_at.desc&limit=3`,
            { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } }
          )
        ).json()
        if (Array.isArray(rows)) setPending(rows)
      } catch {}
    })()
  }, [])

  if (!pending.length) return null

  return (
    <div className="mb-4 space-y-2">
      {pending.map((c) => (
        <a
          key={c.id}
          href={`/contrato/${c.id}`}
          className="flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
            <FileText className="h-5 w-5 text-amber-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight text-amber-900">Tenés un contrato para firmar</p>
            <p className="truncate text-sm text-amber-800/70">{c.title}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-amber-500" />
        </a>
      ))}
    </div>
  )
}
