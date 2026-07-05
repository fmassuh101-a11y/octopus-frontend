'use client'

import { getMissions, XPInput } from '@/lib/xp'
import { Check, Circle, Target } from 'lucide-react'

// Misiones del creador: tareas que dan XP para subir de liga.
// Se derivan de datos que ya existen. Diseño limpio, sin emojis.
export default function CreatorRewards(props: XPInput) {
  const missions = getMissions(props)
  const done = missions.filter(m => m.done).length

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white">Misiones</h3>
        </div>
        <span className="text-sm text-neutral-500 tabular-nums">{done}/{missions.length}</span>
      </div>

      <div className="space-y-2">
        {missions.map(m => (
          <div key={m.key}
            className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border transition-colors ${
              m.done ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-neutral-800/40 border-white/5'}`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              m.done ? 'bg-emerald-500 text-white' : 'bg-neutral-700/70 text-neutral-500'}`}>
              {m.done ? <Check className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${m.done ? 'text-white' : 'text-neutral-300'}`}>{m.label}</p>
              <p className="text-xs text-neutral-500 leading-tight">{m.desc}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-1 rounded-lg ${
              m.done ? 'text-emerald-400' : 'text-neutral-400 bg-neutral-800'}`}>
              +{m.xp} XP
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
