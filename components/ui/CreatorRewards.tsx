'use client'

import { Award, Lock, Check } from 'lucide-react'

// Logros/recompensas del creador. Se derivan de datos que ya existen
// (trabajos completados + perfil), sin cambios de base. Sin emojis.
interface Props {
  completed: number
  hasSocials?: boolean
  hasPhoto?: boolean
}

export default function CreatorRewards({ completed, hasSocials, hasPhoto }: Props) {
  const achievements = [
    { key: 'first', label: 'Primer trabajo', desc: 'Completá tu primer trabajo', done: completed >= 1 },
    { key: 'photo', label: 'Perfil con foto', desc: 'Subí tu foto de perfil', done: !!hasPhoto },
    { key: 'social', label: 'Redes conectadas', desc: 'Agregá tus redes sociales', done: !!hasSocials },
    { key: 'five', label: 'En marcha', desc: 'Completá 5 trabajos', done: completed >= 5 },
    { key: 'ten', label: 'Profesional', desc: 'Completá 10 trabajos', done: completed >= 10 },
    { key: 'legend', label: 'Leyenda Octopus', desc: 'Completá 25 trabajos', done: completed >= 25 },
  ]
  const unlocked = achievements.filter(a => a.done).length

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white">Logros</h3>
        </div>
        <span className="text-sm text-neutral-400 tabular-nums">{unlocked}/{achievements.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {achievements.map(a => (
          <div key={a.key}
            className={`rounded-xl p-3 border ${a.done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-800/50 border-neutral-800'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${a.done ? 'bg-emerald-500 text-white' : 'bg-neutral-700 text-neutral-500'}`}>
              {a.done ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
            <p className={`text-sm font-semibold ${a.done ? 'text-white' : 'text-neutral-400'}`}>{a.label}</p>
            <p className="text-xs text-neutral-500 leading-tight mt-0.5">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
