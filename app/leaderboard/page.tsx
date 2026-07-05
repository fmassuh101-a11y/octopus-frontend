'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCreatorLevel } from '@/lib/creatorLevel'
import { ArrowLeft } from 'lucide-react'

interface Row {
  user_id: string; name: string; avatar: string | null
  tiktok: string | null; instagram: string | null; verified: boolean
  location: string | null; completed: number
}

// colores del podio (1° oro, 2° plata, 3° bronce) — badge numerado, sin emojis
const PODIUM = [
  { ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-950' },
  { ring: 'ring-neutral-300', bg: 'bg-neutral-300', text: 'text-neutral-900' },
  { ring: 'ring-amber-600', bg: 'bg-amber-600', text: 'text-amber-50' },
]

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => (r.ok ? r.json() : { creators: [] }))
      .then((d) => setRows(d.creators || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Botón volver */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <button onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/gigs'))}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden border-b border-neutral-800">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="relative max-w-3xl mx-auto px-5 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-2">Octopus</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Ranking de creadores</h1>
          <p className="text-neutral-400 mt-2 max-w-md mx-auto">
            Los creadores que más contenido entregan y cobran en Octopus. Subí de nivel completando trabajos.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {loading ? (
          <div className="py-20 text-center text-neutral-500">Cargando ranking…</div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-neutral-400">Todavía no hay creadores en el ranking.</p>
            <Link href="/gigs" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
              Ver trabajos y empezar
            </Link>
          </div>
        ) : (
          <>
            {/* Podio top 3 */}
            <div className="grid grid-cols-3 gap-3 pt-8 items-end">
              {[1, 0, 2].map((idx) => {
                const r = top3[idx]
                if (!r) return <div key={idx} />
                const lvl = getCreatorLevel(r.completed).level
                const tall = idx === 0
                return (
                  <div key={r.user_id} className={`flex flex-col items-center ${tall ? '-mt-4' : ''}`}>
                    <div className={`mb-1 w-7 h-7 rounded-full ${PODIUM[idx].bg} ${PODIUM[idx].text} flex items-center justify-center text-sm font-black`}>
                      {idx + 1}
                    </div>
                    <div className={`rounded-full ring-2 ${PODIUM[idx].ring}`}>
                      <Avatar r={r} size={tall ? 76 : 60} />
                    </div>
                    <p className="mt-2 font-semibold text-sm text-center line-clamp-1 max-w-[100px]">{r.name}</p>
                    <span className={`mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${lvl.bg} ${lvl.color}`}>{lvl.name}</span>
                    <div className={`mt-2 w-full rounded-t-xl bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-800 flex items-center justify-center ${tall ? 'h-24' : 'h-16'}`}>
                      <span className="text-lg font-black text-emerald-400">{r.completed}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resto de la lista */}
            <div className="mt-6 space-y-2">
              {rest.map((r, i) => {
                const lvl = getCreatorLevel(r.completed).level
                return (
                  <div key={r.user_id} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3">
                    <span className="w-6 text-center font-bold text-neutral-500 tabular-nums">{i + 4}</span>
                    <Avatar r={r} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate flex items-center gap-1">
                        {r.name}
                        {r.verified && <span className="text-emerald-400 text-xs">✓</span>}
                      </p>
                      {(r.tiktok || r.location) && (
                        <p className="text-xs text-neutral-500 truncate">
                          {r.tiktok ? `@${r.tiktok.replace('@', '')}` : ''}{r.tiktok && r.location ? ' · ' : ''}{r.location || ''}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${lvl.bg} ${lvl.color}`}>{lvl.name}</span>
                    <div className="text-right w-16">
                      <span className="font-black text-emerald-400">{r.completed}</span>
                      <p className="text-[10px] text-neutral-500 -mt-0.5">trabajos</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Avatar({ r, size }: { r: Row; size: number }) {
  return r.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.avatar} alt={r.name} width={size} height={size}
      className="rounded-full object-cover ring-2 ring-neutral-700" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold ring-2 ring-neutral-700"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {r.name.charAt(0).toUpperCase()}
    </div>
  )
}
