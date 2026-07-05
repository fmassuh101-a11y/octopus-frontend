// Sistema de XP y niveles — inspirado en SideShift (Bronce → Diamante).
// Se gana XP con acciones reales (aplicar, aceptar 1er contrato, completar
// trabajos, cumplir misiones). El XP se DERIVA de datos que ya existen,
// sin cambios de base. Valores calibrados: cuesta esfuerzo, pero es alcanzable.

export interface Level {
  key: string
  name: string
  minXP: number
  // clases tailwind para el diseño
  text: string      // color de texto/acento
  chipBg: string    // fondo del chip
  ring: string      // borde/anillo
  from: string      // gradiente inicio
  to: string        // gradiente fin
  benefit: string   // beneficio del nivel
}

// Umbrales pensados con "completar un trabajo = 120 XP":
// Plata ≈ 4 trabajos, Oro ≈ 11, Platino ≈ 27, Diamante ≈ 62. Hay que esforzarse.
export const LEVELS: Level[] = [
  { key: 'bronze',   name: 'Bronce',   minXP: 0,
    text: 'text-amber-400',  chipBg: 'bg-amber-500/15',  ring: 'ring-amber-500/40',
    from: 'from-amber-500',  to: 'to-orange-600',
    benefit: 'Acceso completo al marketplace de campañas.' },
  { key: 'silver',   name: 'Plata',    minXP: 500,
    text: 'text-slate-200',  chipBg: 'bg-slate-300/15',  ring: 'ring-slate-300/40',
    from: 'from-slate-300',  to: 'to-slate-500',
    benefit: 'Tu perfil se muestra más a las empresas.' },
  { key: 'gold',     name: 'Oro',      minXP: 1400,
    text: 'text-yellow-300', chipBg: 'bg-yellow-400/15', ring: 'ring-yellow-400/40',
    from: 'from-yellow-300', to: 'to-amber-500',
    benefit: 'Prioridad en el feed y badge destacado en tu perfil.' },
  { key: 'platinum', name: 'Platino',  minXP: 3200,
    text: 'text-cyan-300',   chipBg: 'bg-cyan-400/15',   ring: 'ring-cyan-400/40',
    from: 'from-cyan-300',   to: 'to-emerald-500',
    benefit: 'Invitaciones a campañas exclusivas antes que nadie.' },
  { key: 'diamond',  name: 'Diamante', minXP: 7500,
    text: 'text-violet-300', chipBg: 'bg-violet-400/15', ring: 'ring-violet-400/40',
    from: 'from-violet-400', to: 'to-fuchsia-500',
    benefit: 'Comisión reducida, ser el nº1 en campañas top y sorteos.' },
]

// Cuánto XP da cada acción.
export const XP = {
  apply: 15,            // aplicar a un trabajo (actividad)
  firstContract: 75,    // aceptar tu primer contrato (una sola vez)
  completeJob: 120,     // entregar un trabajo aprobado (lo más importante)
  completeProfile: 60,  // misión: foto de perfil
  connectSocials: 60,   // misión: conectar redes
}

export interface XPInput {
  applications: number
  accepted: number
  completed: number
  hasPhoto: boolean
  hasSocials: boolean
}

export function computeXP(a: XPInput): number {
  let xp = 0
  xp += (a.applications || 0) * XP.apply
  if ((a.accepted || 0) > 0) xp += XP.firstContract
  xp += (a.completed || 0) * XP.completeJob
  if (a.hasPhoto) xp += XP.completeProfile
  if (a.hasSocials) xp += XP.connectSocials
  return xp
}

export function getLevel(xp: number) {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].minXP) idx = i
  const level = LEVELS[idx]
  const next = LEVELS[idx + 1] || null
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((xp - level.minXP) / (next.minXP - level.minXP)) * 100)))
    : 100
  const xpToNext = next ? Math.max(0, next.minXP - xp) : 0
  return { level, next, progress, xpToNext, xp, index: idx }
}

export interface Mission { key: string; label: string; desc: string; xp: number; done: boolean }

export function getMissions(a: XPInput): Mission[] {
  return [
    { key: 'photo',   label: 'Poné tu foto de perfil', desc: 'Un perfil con foto genera más confianza.', xp: XP.completeProfile, done: !!a.hasPhoto },
    { key: 'social',  label: 'Conectá tus redes',       desc: 'Sumá TikTok, Instagram o YouTube.',        xp: XP.connectSocials,  done: !!a.hasSocials },
    { key: 'apply',   label: 'Aplicá a tu primer trabajo', desc: 'Explorá campañas y postulate.',          xp: XP.apply,           done: (a.applications || 0) >= 1 },
    { key: 'contract',label: 'Aceptá tu primer contrato',  desc: 'Cuando una marca te elige.',              xp: XP.firstContract,   done: (a.accepted || 0) >= 1 },
    { key: 'first',   label: 'Completá tu primer trabajo', desc: 'Entregá y que te lo aprueben.',           xp: XP.completeJob,     done: (a.completed || 0) >= 1 },
    { key: 'five',    label: 'Completá 5 trabajos',        desc: 'Ganá ritmo y subí de liga.',              xp: XP.completeJob,     done: (a.completed || 0) >= 5 },
  ]
}
