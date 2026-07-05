'use client'

import { getLevel } from '@/lib/xp'
import { Shield, ChevronRight } from 'lucide-react'

// Tarjeta de Liga del creador: nivel actual, XP, progreso a la siguiente liga
// y el beneficio. Diseño premium, sin emojis.
export default function CreatorLeagueCard({ xp }: { xp: number }) {
  const { level, next, progress, xpToNext } = getLevel(xp)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
      {/* brillo del color de la liga */}
      <div className={`pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gradient-to-br ${level.from} ${level.to} opacity-20 blur-3xl`} />

      <div className="relative p-5">
        <div className="flex items-center gap-4">
          {/* emblema */}
          <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${level.from} ${level.to} flex items-center justify-center shadow-lg`}>
            <Shield className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Tu liga</p>
            <h3 className="text-2xl font-black text-white leading-tight">{level.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white tabular-nums">{xp.toLocaleString('es')}</p>
            <p className="text-xs text-neutral-500 -mt-0.5">XP</p>
          </div>
        </div>

        {/* progreso a la siguiente liga */}
        <div className="mt-4">
          <div className="h-2.5 rounded-full bg-neutral-800 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${level.from} ${level.to} transition-[width] duration-700`}
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            {next ? (
              <>
                <span className="text-neutral-400">
                  <span className="text-white font-semibold tabular-nums">{xpToNext.toLocaleString('es')} XP</span> para {next.name}
                </span>
                <span className="text-neutral-500 font-medium">{progress}%</span>
              </>
            ) : (
              <span className="text-neutral-400">Alcanzaste la liga más alta. Sos leyenda.</span>
            )}
          </div>
        </div>

        {/* beneficio */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-neutral-800/60 border border-white/5 px-3.5 py-3">
          <ChevronRight className={`w-4 h-4 mt-0.5 ${level.text}`} />
          <p className="text-sm text-neutral-300 leading-snug">{level.benefit}</p>
        </div>
      </div>
    </div>
  )
}
