// Sistema de niveles del creador — estilo SideShift (gamificación).
// Deriva el nivel de la cantidad de trabajos completados. Sin cambios de DB.

export interface CreatorLevel {
  key: 'bronze' | 'silver' | 'gold' | 'platinum'
  name: string
  min: number
  next?: number
  color: string      // texto/acento
  bg: string         // fondo del badge
  ring: string       // borde
}

export const LEVELS: CreatorLevel[] = [
  { key: 'bronze',   name: 'Bronce',   min: 0,  next: 3,  color: 'text-amber-500',   bg: 'bg-amber-500/10',   ring: 'ring-amber-500/30' },
  { key: 'silver',   name: 'Plata',    min: 3,  next: 10, color: 'text-neutral-300', bg: 'bg-neutral-400/10', ring: 'ring-neutral-400/30' },
  { key: 'gold',     name: 'Oro',      min: 10, next: 25, color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  ring: 'ring-yellow-400/30' },
  { key: 'platinum', name: 'Platino',  min: 25,           color: 'text-emerald-400', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/30' },
]

/** Devuelve el nivel actual + progreso al siguiente, según trabajos completados. */
export function getCreatorLevel(completed: number) {
  let level = LEVELS[0]
  for (const l of LEVELS) if (completed >= l.min) level = l
  const progress =
    level.next != null
      ? Math.min(100, Math.round(((completed - level.min) / (level.next - level.min)) * 100))
      : 100
  const toNext = level.next != null ? Math.max(0, level.next - completed) : 0
  return { level, progress, toNext, completed }
}
