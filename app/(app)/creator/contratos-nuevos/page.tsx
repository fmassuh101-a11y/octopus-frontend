'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { toast } from '@/components/oct/toast'
import { X, FileText, List, Package } from 'lucide-react'

interface Pending {
  id: string
  title: string
  payment_amount: number
  currency?: string
  payment_type?: string
  company_id: string
  company_name?: string
  deliverables?: any[]
}

// "Revisar contrato" — copia de la pantalla de contratos entrantes de SideShift:
// fondo negro, carousel de cards blancas con el monto gigante,
// botones Rechazar (rojo) / Revisar (verde) / Ver todos (violeta).
export default function ContratosNuevosPage() {
  const router = useRouter()
  const [items, setItems] = useState<Pending[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const userStr = localStorage.getItem('sb-user')
        if (!token || !userStr) { router.push('/auth/login'); return }
        const user = JSON.parse(userStr)
        const headers = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
        const res = await fetch(`${SUPABASE_URL}/rest/v1/contracts?creator_id=eq.${user.id}&status=eq.pending&select=*&order=created_at.desc`, { headers })
        if (!res.ok) { setLoading(false); return }
        const data: Pending[] = await res.json()
        // nombres de empresas
        const ids = Array.from(new Set(data.map((c) => c.company_id)))
        if (ids.length) {
          const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${ids.join(',')})&select=user_id,company_name,full_name`, { headers })
          if (pr.ok) {
            const profs = await pr.json()
            const map = new Map(profs.map((p: any) => [p.user_id, p.company_name || p.full_name || 'Empresa']))
            data.forEach((c) => { c.company_name = (map.get(c.company_id) as string) || 'Empresa' })
          }
        }
        setItems(data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [router])

  const decline = async (c: Pending) => {
    setItems((prev) => prev.filter((x) => x.id !== c.id))
    toast('Contrato rechazado')
    try {
      const token = localStorage.getItem('sb-access-token')
      await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ status: 'rejected' }),
      })
    } catch {}
  }

  const cur = items[Math.min(idx, items.length - 1)]

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0C] pb-28 text-white">
      <div className="mx-auto w-full max-w-md px-5 pt-5 md:max-w-lg">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/dashboard'))}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-transform active:scale-90" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>

        <h1 className="mt-8 text-center text-[34px] font-extrabold tracking-tight">Revisar contrato</h1>
        {items.length > 1 && (
          <p className="mt-1 text-center text-neutral-400">{Math.min(idx + 1, items.length)}/{items.length} contratos</p>
        )}

        {/* carousel de cards */}
        <div className="mt-8">
          {loading ? (
            <div className="mx-auto h-[420px] w-full max-w-sm animate-pulse rounded-[28px] bg-white/10" />
          ) : items.length === 0 ? (
            <div className="mx-auto flex h-[380px] w-full max-w-sm flex-col items-center justify-center rounded-[28px] bg-white/[0.06] px-8 text-center">
              <FileText className="h-12 w-12 text-neutral-500" />
              <p className="mt-4 text-xl font-bold">No tenés contratos pendientes</p>
              <p className="mt-1 text-neutral-400">Cuando una marca te mande un contrato, aparece acá.</p>
            </div>
          ) : (
            <div ref={scroller} onScroll={(e) => {
              const el = e.currentTarget
              setIdx(Math.round(el.scrollLeft / el.clientWidth))
            }} className="flex snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar">
              {items.map((c) => (
                <div key={c.id} className="w-full shrink-0 snap-center">
                  <div className="mx-auto flex min-h-[420px] w-full max-w-sm flex-col rounded-[28px] bg-white p-6 text-neutral-900 shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-lg font-extrabold text-emerald-600">
                        {(c.company_name || 'E').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-extrabold">{c.company_name}</p>
                        <p className="truncate text-neutral-500">{c.title}</p>
                      </div>
                    </div>
                    <p className="mt-6 text-[40px] font-extrabold leading-tight tracking-tight tabular-nums">
                      ${Number(c.payment_amount || 0).toLocaleString('es-CL')}
                      {(c.payment_type || '').toLowerCase().includes('cpm') && <span className="text-2xl"> CPM</span>}
                    </p>
                    {Array.isArray(c.deliverables) && c.deliverables.length > 0 && (
                      <div className="mt-5 w-fit rounded-2xl border border-neutral-100 p-4 shadow-sm">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                          <Package className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 font-bold">{c.deliverables.length} {c.deliverables.length === 1 ? 'entrega' : 'entregas'}</p>
                        <p className="text-sm text-neutral-400">contenido</p>
                      </div>
                    )}
                    <div className="flex-1" />
                    <p className="text-sm text-neutral-400">Revisá los términos completos antes de aceptar.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* botones flotantes estilo SideShift */}
      {items.length > 0 && cur && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-5 pb-[calc(env(safe-area-inset-bottom)+90px)] pt-4">
          <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3">
            <button onClick={() => decline(cur)}
              className="flex flex-col items-center gap-1 rounded-full bg-red-500 px-7 py-3.5 font-bold shadow-lg shadow-red-900/40 transition-transform active:scale-95">
              <X className="h-5 w-5" /> <span className="text-sm">Rechazar</span>
            </button>
            <button onClick={() => router.push('/creator/contracts')}
              className="flex flex-col items-center gap-1 rounded-full bg-gradient-to-b from-[#34D399] to-[#0EA472] px-9 py-4 font-bold shadow-lg shadow-emerald-900/40 transition-transform active:scale-95">
              <FileText className="h-5 w-5" /> <span>Revisar</span>
            </button>
            <button onClick={() => router.push('/creator/contracts')}
              className="flex flex-col items-center gap-1 rounded-full bg-violet-500 px-7 py-3.5 font-bold shadow-lg shadow-violet-900/40 transition-transform active:scale-95">
              <List className="h-5 w-5" /> <span className="text-sm">Ver todos</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
