'use client'

import { Trophy } from 'lucide-react'
import { getCreatorLevel } from '@/lib/creatorLevel'

/**
 * Badge de nivel del creador (estilo SideShift). Muestra el nivel y,
 * opcionalmente, la barra de progreso al siguiente nivel.
 */
export default function CreatorLevelBadge({
  completed = 0,
  showProgress = false,
}: {
  completed?: number
  showProgress?: boolean
}) {
  const { level, progress, toNext } = getCreatorLevel(completed)

  return (
    <div className="w-full">
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ring-1 ${level.bg} ${level.ring} ${level.color}`}
      >
        <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} />
        <span className="text-xs font-semibold">Nivel {level.name}</span>
      </div>

      {showProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
            <span>{completed} trabajos completados</span>
            {toNext > 0 ? (
              <span>{toNext} para subir de nivel</span>
            ) : (
              <span className="text-emerald-400">Nivel máximo</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
