'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHeaders } from '@/lib/auth/clientToken'
import { whopAuthorizeUrl } from '@/lib/whopApp'
import { ChatCircleDots, Lock } from '@phosphor-icons/react/dist/ssr'
import { Loader2 } from 'lucide-react'

// Chat EMBEBIDO de Whop (DMs + grupos) DENTRO de Octopus. Nunca saca al usuario a
// whop.com — usa los elementos embebibles (ChatSession + DmsListElement + ChatElement).
// La lista de DMs de Whop ya trae su propio botón para iniciar un chat o crear un grupo.
export default function WhopChat({ role = 'creator' }: { role?: 'creator' | 'company' }) {
  const [mod, setMod] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected' | 'error'>('loading')
  const [selected, setSelected] = useState<string | null>(null)

  const router = useRouter()
  const backTo = role === 'company' ? '/company/chat' : '/creator/chat'

  // Conectar con Whop: armamos la URL de autorización EN EL CLIENTE (tenemos el user id
  // en localStorage). Así no dependemos del servidor, que no puede leer la sesión y te
  // rebotaba al dashboard.
  const connect = () => {
    try {
      const userStr = localStorage.getItem('sb-user')
      if (!userStr) { router.push('/auth/login'); return }
      const user = JSON.parse(userStr)
      if (!user?.id) { router.push('/auth/login'); return }
      window.location.href = whopAuthorizeUrl(user.id, backTo)
    } catch { router.push('/auth/login') }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 1) verificar si ya está conectado (token de chat en cookie httpOnly)
        const check = await fetch('/api/whop/chat-token', { headers: authHeaders() })
        if (!alive) return
        if (!check.ok) { setStatus('disconnected'); return }
        // 2) cargar los módulos embebibles solo si está conectado
        const [react, vanilla] = await Promise.all([
          import('@whop/embedded-components-react-js'),
          import('@whop/embedded-components-vanilla-js'),
        ])
        if (!alive) return
        setMod(react)
        setElements(vanilla.loadWhopElements())
        setStatus('connected')
      } catch {
        if (alive) setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  // función token: refresca automáticamente antes de expirar
  const getToken = useMemo(() => async () => {
    const res = await fetch('/api/whop/chat-token', { headers: authHeaders() })
    const data = await res.json()
    if (!data.token) throw new Error('sin token de chat')
    return data.token as string
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center gap-2 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando mensajes…
      </div>
    )
  }

  if (status === 'disconnected' || status === 'error') {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50">
          <ChatCircleDots weight="duotone" className="h-9 w-9 text-cyan-500" />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-neutral-900">Activá tus mensajes</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Chateá con {role === 'company' ? 'los creadores' : 'las marcas'} y armá grupos, todo dentro de Octopus.
          Es un paso único y seguro.
        </p>
        <button
          onClick={connect}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-neutral-800"
        >
          <Lock weight="bold" className="h-4 w-4" /> Activar mensajes
        </button>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <Lock weight="fill" className="h-3 w-3" /> Cifrado de extremo a extremo
        </p>
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
            {selected ? (
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
