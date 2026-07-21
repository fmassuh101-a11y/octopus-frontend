'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { Bell, Check, FileText, Users, DollarSign, X } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Centro de notificaciones del creador — campana con contador + panel.
// Junta: pagos recibidos (wallet_movements), contratos nuevos y postulaciones aceptadas.
// El "no leído" se calcula con un timestamp guardado en localStorage (sin tocar la DB).
interface Notif {
  id: string
  kind: 'pago' | 'contrato' | 'aceptado'
  title: string
  sub: string
  amount?: number
  at: string
  href?: string
}

const SEEN_KEY = 'oct-notif-seen'

export default function Notifications() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    try {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (!userStr || !token) return
      const user = JSON.parse(userStr)
      const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }

      const [pagosR, contratosR, appsR] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/wallet_movements?user_id=eq.${user.id}&kind=eq.pago_recibido&select=id,amount,description,created_at&order=created_at.desc&limit=10`, { headers: H }),
        fetch(`${SUPABASE_URL}/rest/v1/contracts?creator_id=eq.${user.id}&status=eq.pending&select=id,title,payment_amount,created_at&order=created_at.desc&limit=10`, { headers: H }),
        fetch(`${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${user.id}&status=eq.accepted&select=id,created_at,gig:gigs(title)&order=created_at.desc&limit=10`, { headers: H }),
      ])
      const pagos = pagosR.ok ? await pagosR.json() : []
      const contratos = contratosR.ok ? await contratosR.json() : []
      const apps = appsR.ok ? await appsR.json() : []

      const list: Notif[] = [
        ...pagos.map((p: any) => ({
          id: `p_${p.id}`, kind: 'pago' as const,
          title: `Te pagaron $${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          sub: p.description || 'Pago recibido', amount: Number(p.amount), at: p.created_at, href: '/creator/wallet',
        })),
        ...contratos.map((c: any) => ({
          id: `c_${c.id}`, kind: 'contrato' as const,
          title: 'Nuevo contrato', sub: c.title || 'Revisa los términos', at: c.created_at, href: '/creator/contratos-nuevos',
        })),
        ...apps.map((a: any) => ({
          id: `a_${a.id}`, kind: 'aceptado' as const,
          title: 'Te aceptaron', sub: a.gig?.title ? `En "${a.gig.title}"` : 'En una campaña', at: a.created_at, href: '/gigs',
        })),
      ].sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()).slice(0, 20)

      setItems(list)
      const seenAt = Number(localStorage.getItem(SEEN_KEY) || 0)
      setUnread(list.filter((n) => new Date(n.at).getTime() > seenAt).length)
    } catch {}
  }

  const openPanel = () => {
    setOpen(true)
    // marcar todo como visto
    localStorage.setItem(SEEN_KEY, String(Date.now()))
    setUnread(0)
  }

  const go = (n: Notif) => { setOpen(false); if (n.href) router.push(n.href) }

  const timeAgo = (at: string) => {
    const s = Math.floor((Date.now() - new Date(at).getTime()) / 1000)
    if (s < 60) return 'ahora'
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
    return `hace ${Math.floor(s / 86400)} d`
  }

  const Icon = ({ k }: { k: Notif['kind'] }) =>
    k === 'pago' ? <DollarSign className="h-5 w-5 text-emerald-600" />
    : k === 'contrato' ? <FileText className="h-5 w-5 text-cyan-600" />
    : <Users className="h-5 w-5 text-violet-600" />

  return (
    <>
      <button onClick={openPanel} aria-label="Notificaciones"
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform active:scale-90">
        <Bell className="h-5 w-5 text-neutral-700" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold text-white shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] rounded-t-[28px] bg-white pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <div className="mx-auto w-full max-w-md px-5 pt-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200" />
              <div className="mt-4 flex items-center justify-between">
                <Drawer.Title className="text-2xl font-extrabold tracking-tight">Notificaciones</Drawer.Title>
                <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100" aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 max-h-[64dvh] space-y-2 overflow-y-auto pb-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                      <Bell className="h-7 w-7 text-neutral-300" />
                    </span>
                    <p className="mt-3 font-bold text-neutral-600">Todo al día</p>
                    <p className="text-sm text-neutral-400">Acá te avisamos cuando te paguen o te contraten.</p>
                  </div>
                ) : (
                  items.map((n) => (
                    <button key={n.id} onClick={() => go(n)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-3.5 text-left shadow-sm transition-transform active:scale-[0.99]">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${n.kind === 'pago' ? 'bg-emerald-50' : n.kind === 'contrato' ? 'bg-cyan-50' : 'bg-violet-50'}`}>
                        <Icon k={n.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold leading-tight">{n.title}</p>
                        <p className="truncate text-sm text-neutral-500">{n.sub}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-neutral-400">{timeAgo(n.at)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
