'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { authHeaders } from '@/lib/auth/clientToken'
import { readCache, writeCache } from '@/lib/useCachedFetch'
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr'
import { Loader2, FileText } from 'lucide-react'
import CreateContractModal from '@/components/contracts/CreateContractModal'

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
  lastMessageAt?: string | null
}

const seenKey = (ch: string) => `oct-seen-${ch}`
const isUnread = (c: Convo) => {
  if (!c.lastMessageAt) return false
  const seen = typeof window !== 'undefined' ? localStorage.getItem(seenKey(c.channelId)) : null
  return !seen || new Date(c.lastMessageAt) > new Date(seen)
}
const markSeen = (ch: string) => { try { localStorage.setItem(seenKey(ch), new Date().toISOString()) } catch {} }

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
  const [profileOf, setProfileOf] = useState<Convo | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [contractFor, setContractFor] = useState<Convo | null>(null)
  const myId = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('sb-user') || '{}').id || '') : ''

  // refresco periódico de la lista (visto/no-visto en vivo) — se pausa
  // si la pestaña está en segundo plano, para no gastar red de más.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadList()
    }, 30000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // perfil del otro lado (al tocar el nombre, como SideShift)
  useEffect(() => {
    if (!profileOf) { setProfileData(null); return }
    ;(async () => {
      try {
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('@/lib/config/supabase')
        const token = localStorage.getItem('sb-access-token')
        const r = await fetch(`${SUPABASE_URL}/rest/v1/public_profiles?user_id=eq.${profileOf.userId}&select=full_name,company_name,user_type,bio,website,profile_photo_url,avatar_url`, {
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        })
        const rows = await r.json()
        setProfileData(rows?.[0] || {})
      } catch { setProfileData({}) }
    })()
  }, [profileOf])

  const loadList = async (): Promise<Convo[]> => {
    try {
      const res = await fetch('/api/whop/dm/list', { headers: authHeaders() })
      const data = await res.json()
      if (data.ok) {
        setConvos(data.conversations)
        writeCache('convos', data.conversations) // fluidez: lista instantánea la próxima
        return data.conversations
      }
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
    // FLUIDEZ: mostrar la lista cacheada AL INSTANTE (se refresca por detrás)
    const cached = readCache<Convo[]>('convos')
    if (cached?.length) { setConvos(cached); setLoading(false) }
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
              onClick={() => { markSeen(c.channelId); setSelected(c) }}
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
              <div className="min-w-0 flex-1">
                <p className={`truncate ${isUnread(c) && selected?.channelId !== c.channelId ? 'font-extrabold text-neutral-900' : 'font-bold text-neutral-700'}`}>{c.name}</p>
                <p className={`truncate text-xs ${isUnread(c) && selected?.channelId !== c.channelId ? 'font-bold text-cyan-600' : 'text-neutral-400'}`}>
                  {isUnread(c) && selected?.channelId !== c.channelId ? 'Mensaje nuevo' : c.type === 'company' ? 'Empresa' : 'Creador'}
                </p>
              </div>
              {isUnread(c) && selected?.channelId !== c.channelId && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />
              )}
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
              <button onClick={() => setProfileOf(selected)} className="flex min-w-0 items-center gap-2">
                {selected.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-extrabold text-cyan-700">
                    {initials(selected.name)}
                  </span>
                )}
                <p className="truncate font-extrabold text-neutral-900 underline-offset-2 hover:underline">{selected.name}</p>
              </button>
              {role === 'company' && selected.type !== 'company' && (
                <button
                  onClick={() => setContractFor(selected)}
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] px-3 py-2 text-xs font-bold text-white shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5" /> Enviar contrato
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <Conversation key={selected.channelId} channelId={selected.channelId} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-neutral-400">
            <ChatCircleDots weight="duotone" className="h-12 w-12 text-neutral-300" />
            <p className="text-sm font-medium">Elige una conversación</p>
          </div>
        )}
      </div>

      {/* Contrato directo desde el chat (rol empresa) */}
      {contractFor && (
        <CreateContractModal
          isOpen={!!contractFor}
          onClose={() => setContractFor(null)}
          onSuccess={() => setContractFor(null)}
          companyId={myId}
          creatorId={contractFor.userId}
          creatorName={contractFor.name}
        />
      )}

      {/* Perfil del otro lado (tocar el nombre, como SideShift) */}
      {profileOf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setProfileOf(null)}>
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              {profileOf.photo || profileData?.profile_photo_url || profileData?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileOf.photo || profileData?.profile_photo_url || profileData?.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-2xl font-extrabold text-cyan-700">{initials(profileOf.name)}</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold">{profileData?.company_name || profileData?.full_name || profileOf.name}</p>
                <p className="text-sm text-neutral-500">{profileOf.type === 'company' ? 'Empresa' : 'Creador'}{profileData?.city ? ` · ${profileData.city}` : ''}</p>
              </div>
            </div>
            {(profileData?.about || profileData?.bio) && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
                {String(profileData.about || profileData.bio).slice(0, 400)}
              </p>
            )}
            {profileData?.website && (
              <a href={profileData.website} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm font-bold text-cyan-600">{profileData.website}</a>
            )}
            {role === 'company' && profileOf.type !== 'company' && (
              <Link href={`/company/creator/${profileOf.userId}`} className="mt-5 block w-full rounded-2xl bg-neutral-900 py-3.5 text-center text-sm font-bold text-white">
                Ver perfil completo
              </Link>
            )}
            <button onClick={() => setProfileOf(null)} className="mt-3 w-full rounded-2xl border border-neutral-200 py-3 text-sm font-bold text-neutral-500">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
