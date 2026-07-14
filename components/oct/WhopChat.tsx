'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr'
import { Loader2 } from 'lucide-react'

// Chat empresa↔creador DENTRO de Octopus (verificado E2E):
// - Los MENSAJES viven en Whop (support channels) y se muestran con su
//   ChatElement embebido. Sin OAuth, sin login de Whop, sin salir de la app.
// - La LISTA lateral es NUESTRA (nombre + foto del otro lado, estilo SideShift).
// - El token va scoped POR CONVERSACIÓN (los tokens de Whop son estrictos por
//   compañía), por eso la sesión se remonta al cambiar de canal (key=channelId).

interface Convo {
  channelId: string
  userId: string
  name: string
  photo: string | null
  type: string | null
}

function Conversation({ channelId }: { channelId: string }) {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // token scoped a ESTA conversación (validado en el server)
        const t = await fetch(`/api/whop/chat-token?channel=${encodeURIComponent(channelId)}`, { headers: authHeaders() })
        const data = await t.json().catch(() => ({}))
        if (!alive) return
        if (!t.ok || !data.token) { setError(data.error || 'No se pudo abrir la conversación'); return }
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!alive) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
      } catch (e: any) {
        if (alive) setError(e?.message || 'No se pudo abrir la conversación')
      }
    })()
    return () => { alive = false }
  }, [channelId])

  const getToken = useMemo(() => async () => {
    const res = await fetch(`/api/whop/chat-token?channel=${encodeURIComponent(channelId)}`, { headers: authHeaders() })
    const data = await res.json()
    if (!data.token) throw new Error(data.error || 'sin token')
    return data.token as string
  }, [channelId])

  if (error) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-red-500">{error}</div>
  }
  if (!mod || !elements) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Abriendo conversación…
      </div>
    )
  }
  const { Elements, ChatSession, ChatElement } = mod
  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <ChatElement options={{ channelId }} className="h-full" />
      </ChatSession>
    </Elements>
  )
}

export default function WhopChat({
  role = 'creator',
  initialUserId = '',
}: {
  role?: 'creator' | 'company'
  initialUserId?: string
}) {
  const [convos, setConvos] = useState<Convo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Convo | null>(null)
  const [openingDm, setOpeningDm] = useState(!!initialUserId)

  const loadList = async (): Promise<Convo[]> => {
    try {
      const res = await fetch('/api/whop/dm/list', { headers: authHeaders() })
      const data = await res.json()
      if (data.ok) { setConvos(data.conversations); return data.conversations }
      setError(data.error || 'No se pudo cargar')
    } catch { setError('No se pudo cargar la lista') }
    return []
  }

  useEffect(() => {
    let alive = true
    // VELOCIDAD: precalentar los módulos embebibles de Whop desde ya (el import
    // pesado corre en paralelo con la lista, no al abrir la conversación)
    import('@whop/embedded-components-react-js').catch(() => {})
    import('@whop/embedded-components-vanilla-js').catch(() => {})
    ;(async () => {
      const list = await loadList()
      if (!alive) return
      setLoading(false)
      // deep-link ?user= → abrir esa conversación
      if (initialUserId) {
        // VELOCIDAD: si ya existe en la lista, abrir DIRECTO (sin llamar a dm/open)
        const existing = list.find((c) => c.userId === initialUserId)
        if (existing) { setSelected(existing); setOpeningDm(false); return }
        try {
          const res = await fetch('/api/whop/dm/open', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userId: initialUserId }),
          })
          const data = await res.json()
          if (!alive) return
          if (data.ok && data.channelId) {
            const fresh = await loadList()
            const found = fresh.find((c) => c.channelId === data.channelId)
            setSelected(found || { channelId: data.channelId, userId: initialUserId, name: 'Conversación', photo: null, type: null })
          } else if (data.error) {
            setError(data.error)
          }
        } catch {}
        setOpeningDm(false)
      }
    })()
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="grid h-[calc(100dvh-7.5rem)] grid-cols-1 overflow-hidden rounded-3xl border border-neutral-200 bg-white md:grid-cols-[320px_1fr]">
      {/* Lista lateral NUESTRA — se oculta en móvil cuando hay chat abierto */}
      <div className={`min-h-0 overflow-y-auto border-neutral-100 md:border-r ${selected ? 'hidden md:block' : 'block'}`}>
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-sm font-extrabold text-neutral-800">Conversaciones</p>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-neutral-100" />)}
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          </div>
        ) : convos.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <ChatCircleDots weight="duotone" className="h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-bold text-neutral-600">Sin conversaciones todavía</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              {role === 'company'
                ? 'Tocá "Mensaje" en el perfil de un creador para empezar.'
                : 'Cuando una marca te escriba, aparece acá.'}
            </p>
          </div>
        ) : (
          convos.map((c) => (
            <button
              key={c.channelId}
              onClick={() => setSelected(c)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 ${selected?.channelId === c.channelId ? 'bg-cyan-50/60' : ''}`}
            >
              {c.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-100 font-extrabold text-cyan-700">
                  {initials(c.name)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-neutral-900">{c.name}</p>
                <p className="truncate text-xs text-neutral-400">{c.type === 'company' ? 'Empresa' : 'Creador'}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Conversación (mensajes de Whop, embebidos) */}
      <div className={`min-h-0 ${selected || openingDm ? 'block' : 'hidden md:block'}`}>
        {openingDm ? (
          <div className="flex h-full items-center justify-center gap-2 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Abriendo conversación…
          </div>
        ) : selected ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-2.5">
              <button onClick={() => setSelected(null)} className="text-sm font-semibold text-neutral-500 md:hidden">‹</button>
              {selected.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-extrabold text-cyan-700">
                  {initials(selected.name)}
                </span>
              )}
              <p className="font-extrabold text-neutral-900">{selected.name}</p>
            </div>
            <div className="min-h-0 flex-1">
              <Conversation key={selected.channelId} channelId={selected.channelId} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-neutral-400">
            <ChatCircleDots weight="duotone" className="h-12 w-12 text-neutral-300" />
            <p className="text-sm font-medium">Elegí una conversación</p>
          </div>
        )}
      </div>
    </div>
  )
}
