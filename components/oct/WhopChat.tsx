'use client'

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr'
import { Loader2 } from 'lucide-react'

// Chat EMBEBIDO de Whop (DMs + grupos) DENTRO de Octopus — SIN OAuth ni login
// de Whop: el server enrola al usuario y mintea el token con nuestra API key
// (guía oficial de chat de Whop). El usuario nunca sale de la app.
// initialUserId: abrir directo el DM con ese usuario de Octopus (?user= en la URL).
export default function WhopChat({
  role = 'creator',
  initialUserId = '',
}: {
  role?: 'creator' | 'company'
  initialUserId?: string
}) {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [openingDm, setOpeningDm] = useState(!!initialUserId)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 1) probar el token primero (si falla, mostramos el motivo real)
        const check = await fetch('/api/whop/chat-token', { headers: authHeaders() })
        const data = await check.json().catch(() => ({}))
        if (!alive) return
        if (!check.ok || !data.token) {
          setError(data.error || 'No se pudo iniciar el chat. Probá de nuevo.')
          setStatus('error')
          return
        }
        // 2) cargar los módulos embebibles
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!alive) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
        setStatus('ready')
      } catch (e: any) {
        if (alive) { setError(e?.message || 'No se pudo cargar el chat'); setStatus('error') }
      }
    })()
    return () => { alive = false }
  }, [])

  // si venimos con ?user= (ej: "Mensaje" a un creador), abrir/crear ese DM
  useEffect(() => {
    if (!initialUserId || status !== 'ready') return
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/whop/dm/open', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ userId: initialUserId }),
        })
        const data = await res.json()
        if (!alive) return
        if (data.ok && data.channelId) setSelected(data.channelId)
      } catch {}
      if (alive) setOpeningDm(false)
    })()
    return () => { alive = false }
  }, [initialUserId, status])

  // función token: se refresca sola antes de expirar
  const getToken = useMemo(() => async () => {
    const res = await fetch('/api/whop/chat-token', { headers: authHeaders() })
    const data = await res.json()
    if (!data.token) throw new Error(data.error || 'sin token de chat')
    return data.token as string
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center gap-2 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando mensajes…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50">
          <ChatCircleDots weight="duotone" className="h-9 w-9 text-cyan-500" />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-neutral-900">Mensajes</h2>
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>
        <button
          onClick={() => location.reload()}
          className="mt-5 w-full rounded-2xl bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const { Elements, ChatSession, DmsListElement, ChatElement } = mod

  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <div className="grid h-[calc(100dvh-8.5rem)] grid-cols-1 overflow-hidden rounded-3xl border border-neutral-200 bg-white md:grid-cols-[340px_1fr]">
          {/* Lista de DMs / grupos — se oculta en móvil cuando hay un chat abierto */}
          <div className={`min-h-0 border-neutral-100 md:border-r ${selected ? 'hidden md:block' : 'block'}`}>
            <DmsListElement
              selectedChannel={selected || undefined}
              onEvent={(ev: any) => {
                // Whop emite channelSelected con el id del canal en ev.detail.id
                const id = ev?.detail?.id || ev?.detail?.channelId || ev?.channelId
                if (id) setSelected(id)
              }}
            />
          </div>

          {/* Conversación abierta */}
          <div className={`min-h-0 ${selected ? 'block' : 'hidden md:block'}`}>
            {openingDm ? (
              <div className="flex h-full items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Abriendo conversación…
              </div>
            ) : selected ? (
              <div className="flex h-full min-h-0 flex-col">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 border-b border-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-600 md:hidden"
                >
                  ‹ Mensajes
                </button>
                <div className="min-h-0 flex-1">
                  <ChatElement channelId={selected} style="imessage" />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-neutral-400">
                <ChatCircleDots weight="duotone" className="h-12 w-12 text-neutral-300" />
                <p className="text-sm font-medium">Elegí una conversación o creá un grupo nuevo</p>
              </div>
            )}
          </div>
        </div>
      </ChatSession>
    </Elements>
  )
}
