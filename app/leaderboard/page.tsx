'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sky from '@/components/oct/Sky'
import { LEVELS, getLevel } from '@/lib/xp'
import { X, Lock, ChevronDown, TrendingUp, Send, BarChart3, Eye, Zap, Heart as HandHeart, Crown, MessageSquare, Users, Search, Target, Trophy, Medal, Landmark, Sparkles } from 'lucide-react'

interface Row {
  user_id: string; name: string; avatar: string | null
  tiktok: string | null; verified: boolean
  location: string | null; completed: number; xp: number; level: string
}

// Íconos para las cards de perks (rotan por posición)
const PERK_ICONS = [TrendingUp, Send, BarChart3, Eye, Zap, HandHeart, Crown, MessageSquare, Users, Search, Target, Trophy, Medal, Landmark]

// Pantalla de Ligas — copia de la pantalla de leagues de SideShift:
// cielo, insignia hexagonal con carousel, nombre de liga, barra de XP,
// ranking con "Vos" resaltado y perks para las ligas bloqueadas.
export default function LigasPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [meId, setMeId] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem('sb-user') || 'null'); if (u?.id) setMeId(u.id) } catch {}
    fetch('/api/leaderboard')
      .then((r) => (r.ok ? r.json() : { creators: [] }))
      .then((d) => {
        const creators: Row[] = d.creators || []
        setRows(creators)
        // arrancar en la liga del usuario
        try {
          const u = JSON.parse(localStorage.getItem('sb-user') || 'null')
          const me = creators.find((c) => c.user_id === u?.id)
          if (me) setIdx(getLevel(me.xp).index)
        } catch {}
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const league = LEVELS[idx]
  const me = useMemo(() => rows.find((r) => r.user_id === meId) || null, [rows, meId])
  const myLevel = me ? getLevel(me.xp) : null
  const isMyLeague = myLevel?.index === idx
  const locked = (myLevel?.index ?? 0) < idx

  // creadores de la liga seleccionada
  const inLeague = useMemo(() => rows.filter((r) => getLevel(r.xp).index === idx), [rows, idx])
  const top = expanded ? inLeague : inLeague.slice(0, 4)
  const myRank = me ? rows.findIndex((r) => r.user_id === me.user_id) + 1 : null

  return (
    <div className="relative min-h-[100dvh] bg-white pb-32 text-neutral-900">
      <Sky />
      <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-4">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/dashboard'))}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100/90 shadow-sm transition-transform active:scale-90" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>

        {/* carousel de insignias */}
        <div className="mt-4 flex items-center justify-center gap-5">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}
            className="transition-transform active:scale-90 disabled:opacity-0" aria-label="Liga anterior">
            <Hexagon size={64} from={LEVELS[Math.max(0, idx - 1)].from} to={LEVELS[Math.max(0, idx - 1)].to} muted />
          </button>
          <Hexagon size={150} from={league.from} to={league.to} locked={locked} />
          <button onClick={() => setIdx(Math.min(LEVELS.length - 1, idx + 1))} disabled={idx === LEVELS.length - 1}
            className="transition-transform active:scale-90 disabled:opacity-0" aria-label="Liga siguiente">
            <Hexagon size={64} from={LEVELS[Math.min(LEVELS.length - 1, idx + 1)].from} to={LEVELS[Math.min(LEVELS.length - 1, idx + 1)].to} muted locked={(myLevel?.index ?? 0) < idx + 1} />
          </button>
        </div>

        <h1 className="mt-5 text-center text-[34px] font-extrabold tracking-tight">Liga {league.name}</h1>

        {/* barra de XP (solo en tu liga) */}
        {isMyLeague && myLevel && (
          <div className="mt-4">
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
              <div className={`h-full rounded-full bg-gradient-to-r ${league.from} ${league.to}`} style={{ width: `${Math.max(myLevel.progress, 3)}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[15px]">
              <span className="font-bold tabular-nums">{myLevel.xp.toLocaleString('es-CL')} / {(myLevel.next?.minXP ?? myLevel.xp).toLocaleString('es-CL')} XP</span>
              {myLevel.next && (
                <button onClick={() => setIdx(idx + 1)} className="font-semibold text-neutral-600 active:opacity-60">
                  Desbloqueá {LEVELS[idx + 1].perks.length} perks con {myLevel.next.name} ›
                </button>
              )}
            </div>
          </div>
        )}

        {/* contenido: ranking (tu liga o desbloqueada) o perks (bloqueada) */}
        {locked ? (
          <div className="mt-6 space-y-3">
            {league.perks.map((p, i) => {
              const Icon = PERK_ICONS[(idx + i) % PERK_ICONS.length]
              return (
                <div key={i} className="flex items-center gap-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
                  <Icon className={`h-7 w-7 shrink-0 ${league.text}`} />
                  <p className="text-lg font-bold leading-snug">{p}</p>
                </div>
              )
            })}
            <p className="pt-2 text-center text-sm text-neutral-500">
              Llegá a {league.minXP.toLocaleString('es-CL')} XP para desbloquear la Liga {league.name}
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div>
            ) : inLeague.length === 0 ? (
              <div className="rounded-3xl border border-neutral-100 bg-white p-8 text-center shadow-sm">
                <Sparkles className="mx-auto h-10 w-10 text-cyan-600" />
                <p className="mt-3 font-bold">Todavía no hay creadores en esta liga</p>
                <p className="mt-1 text-sm text-neutral-500">Sé el primero en llegar</p>
              </div>
            ) : (
              <>
                {top.map((r) => {
                  const globalRank = rows.findIndex((x) => x.user_id === r.user_id) + 1
                  const isMe = r.user_id === meId
                  if (isMe) return null
                  return (
                    <div key={r.user_id} className="flex items-center gap-4 py-3">
                      <span className="w-10 text-right text-xl font-semibold text-neutral-500 tabular-nums">{globalRank}</span>
                      <Avatar r={r} size={52} />
                      <p className="min-w-0 flex-1 truncate text-lg font-semibold">{r.name}</p>
                      <div className="text-right">
                        <p className="text-lg font-extrabold tabular-nums">{r.xp.toLocaleString('es-CL')} XP</p>
                        <p className="text-sm text-neutral-500">{r.completed} {r.completed === 1 ? 'trabajo' : 'trabajos'}</p>
                      </div>
                    </div>
                  )
                })}

                {inLeague.length > 4 && (
                  <button onClick={() => setExpanded(!expanded)}
                    className="mx-auto my-2 flex items-center gap-2 text-neutral-500 active:opacity-60">
                    <span className="h-px w-16 bg-neutral-200" />
                    {inLeague.length - 4} creadores más
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    <span className="h-px w-16 bg-neutral-200" />
                  </button>
                )}

                {/* Vos */}
                {me && isMyLeague && (
                  <div className="mt-2 flex items-center gap-4 rounded-3xl border border-cyan-200 bg-cyan-50/70 px-4 py-4">
                    <span className="text-xl font-bold text-cyan-700 tabular-nums">{myRank}</span>
                    <span className="rounded-full ring-2 ring-cyan-400"><Avatar r={me} size={52} /></span>
                    <p className="min-w-0 flex-1 truncate text-lg font-bold text-cyan-700">Vos</p>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-cyan-700 tabular-nums">{me.xp.toLocaleString('es-CL')} XP</p>
                      <p className="text-sm text-cyan-700">{me.completed} {me.completed === 1 ? 'trabajo' : 'trabajos'}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const HEX = 'polygon(50% 0%, 96% 26%, 96% 74%, 50% 100%, 4% 74%, 4% 26%)'

// Hoja de laurel: óvalo con degradado del color de la liga
function Leaf({ from, to, style }: { from: string; to: string; style: React.CSSProperties }) {
  return (
    <div className={`absolute rounded-full bg-gradient-to-b ${from} ${to} shadow-sm`}
      style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', ...style }} />
  )
}

// Insignia hexagonal detallada (todas las ligas): bisel, gema con FACETAS,
// gloss, sombra proyectada y LAURELES a los costados como SideShift.
function Hexagon({ size, from, to, muted, locked }: { size: number; from: string; to: string; muted?: boolean; locked?: boolean }) {
  const leaves = [
    { b: '2%', o: '20%', r: -62, s: 1.0 },
    { b: '22%', o: '10%', r: -38, s: 0.92 },
    { b: '42%', o: '5%', r: -16, s: 0.84 },
    { b: '60%', o: '7%', r: 6, s: 0.72 },
  ]
  return (
    <div className={`relative ${muted ? 'opacity-75' : ''}`} style={{ width: size * (muted ? 1 : 1.36), height: size * 1.12 }}>
      {/* laureles (solo insignia principal) */}
      {!muted && leaves.map((l, i) => (
        <Leaf key={`l${i}`} from={from} to={to}
          style={{ width: size * 0.16 * l.s, height: size * 0.3 * l.s, left: l.o, bottom: l.b, transform: `rotate(${l.r}deg)`, opacity: 0.9 }} />
      ))}
      {!muted && leaves.map((l, i) => (
        <Leaf key={`r${i}`} from={from} to={to}
          style={{ width: size * 0.16 * l.s, height: size * 0.3 * l.s, right: l.o, bottom: l.b, transform: `rotate(${-l.r}deg)`, opacity: 0.9 }} />
      ))}
      {/* sombra elíptica en el piso */}
      {!muted && <div className="absolute bottom-[-4%] left-1/2 h-[7%] w-[46%] -translate-x-1/2 rounded-[50%] bg-black/10 blur-[3px]" />}

      <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ width: size, height: size * 1.06, filter: muted ? undefined : 'drop-shadow(0 10px 16px rgba(0,0,0,0.2))' }}>
        {/* bisel exterior */}
        <div className={`absolute inset-0 bg-gradient-to-b ${from} ${to}`} style={{ clipPath: HEX }} />
        <div className="absolute inset-0 bg-black/25" style={{ clipPath: HEX, transform: 'translateY(2.5%)' }} />
        <div className={`absolute inset-[3%] bg-gradient-to-b ${from} ${to}`} style={{ clipPath: HEX }} />
        {/* gema interior */}
        <div className="absolute inset-[13%] bg-black/20" style={{ clipPath: HEX }} />
        <div className={`absolute inset-[15%] bg-gradient-to-br ${from} ${to} brightness-110`} style={{ clipPath: HEX }} />
        {/* FACETAS de la gema */}
        <div className="absolute inset-[15%] bg-white/20" style={{ clipPath: 'polygon(50% 0%, 96% 26%, 50% 50%)' }} />
        <div className="absolute inset-[15%] bg-black/10" style={{ clipPath: 'polygon(96% 26%, 96% 74%, 50% 50%)' }} />
        <div className="absolute inset-[15%] bg-black/20" style={{ clipPath: 'polygon(50% 100%, 96% 74%, 50% 50%)' }} />
        <div className="absolute inset-[15%] bg-white/10" style={{ clipPath: 'polygon(4% 26%, 50% 0%, 50% 50%)' }} />
        <div className="absolute inset-[15%] bg-black/5" style={{ clipPath: 'polygon(4% 74%, 4% 26%, 50% 50%)' }} />
        {/* gloss superior */}
        <div className="absolute inset-[15%] bg-gradient-to-b from-white/60 via-white/15 to-transparent" style={{ clipPath: HEX, height: '48%' }} />
        {/* contenido */}
        <div className="absolute inset-0 flex items-center justify-center">
          {locked
            ? <span className="flex h-[34%] w-[34%] items-center justify-center rounded-full bg-white/85 shadow-inner"><Lock className="h-1/2 w-1/2 text-neutral-500" /></span>
            : <Sparkles className="h-[24%] w-[24%] text-white drop-shadow-md" />}
        </div>
      </div>
    </div>
  )
}

function Avatar({ r, size }: { r: Row; size: number }) {
  return r.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.avatar} alt={r.name} width={size} height={size}
      className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-500"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {r.name.charAt(0).toUpperCase()}
    </div>
  )
}
