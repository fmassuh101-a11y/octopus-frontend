// Academia Octapi — mapa de aprendizaje estilo Duolingo/Candy Crush.
// Las lecciones vienen de Supabase (tabla academy_lessons, editable por el admin),
// con este SEED como fallback para que la sección funcione siempre.

export interface Lesson {
  id: string
  position: number
  title: string
  subtitle: string
  video_url: string | null
  duration_sec?: number | null
}

// Nombre de la insignia al completar la Academia (cambiable).
export const ACADEMY_BADGE = 'Creador Kraken'

// 15 lecciones semilla (el admin puede editar/agregar/borrar en /admin/academia).
// Título con gancho + subtítulo cortito de qué aprendes.
export const SEED_LESSONS: Lesson[] = [
  { id: 'l1',  position: 1,  title: 'Bienvenido al océano', subtitle: 'Cómo funciona Octapi y cómo se gana plata', video_url: null },
  { id: 'l2',  position: 2,  title: 'Calienta el algoritmo', subtitle: 'Preparar tu cuenta antes de publicar', video_url: null },
  { id: 'l3',  position: 3,  title: 'Luces, cámara, acción', subtitle: 'Crea y sube tu primer video paso a paso', video_url: null },
  { id: 'l4',  position: 4,  title: 'El perfil imán', subtitle: 'Arma el perfil que las marcas eligen', video_url: null },
  { id: 'l5',  position: 5,  title: 'Postula como pro', subtitle: 'Destaca entre todos los que aplican', video_url: null },
  { id: 'l6',  position: 6,  title: 'La letra chica', subtitle: 'Lee y entiende un contrato antes de aceptar', video_url: null },
  { id: 'l7',  position: 7,  title: 'Entrega y que aprueben', subtitle: 'Contenido que las marcas aceptan al toque', video_url: null },
  { id: 'l8',  position: 8,  title: 'Tu plata, tu retiro', subtitle: 'Cómo cobrar sin vueltas', video_url: null },
  { id: 'l9',  position: 9,  title: 'Frena el scroll', subtitle: 'Ganchos que atrapan en 3 segundos', video_url: null },
  { id: 'l10', position: 10, title: 'Guiones que venden', subtitle: 'Escribe para que la gente actúe', video_url: null },
  { id: 'l11', position: 11, title: 'El arte del UGC', subtitle: 'Qué es y cómo lo piden las marcas', video_url: null },
  { id: 'l12', position: 12, title: 'Clipping = plata', subtitle: 'Gana por views con el pay-per-view', video_url: null },
  { id: 'l13', position: 13, title: 'Sin dar la cara', subtitle: 'Contenido faceless que igual funciona', video_url: null },
  { id: 'l14', position: 14, title: 'Sube de liga', subtitle: 'Más XP, más visibilidad, más plata', video_url: null },
  { id: 'l15', position: 15, title: 'Los errores que cuestan', subtitle: 'Lo que NO tienes que hacer con las marcas', video_url: null },
]

const KEY = 'oct-academy-done'

export function getDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}
export function markDone(id: string) {
  try {
    const s = getDone(); s.add(id)
    localStorage.setItem(KEY, JSON.stringify(Array.from(s)))
  } catch {}
}
export function isUnlocked(lessons: Lesson[], id: string, done: Set<string>): boolean {
  const idx = lessons.findIndex((l) => l.id === id)
  if (idx <= 0) return true
  return done.has(lessons[idx - 1].id) // se desbloquea al completar la anterior
}
