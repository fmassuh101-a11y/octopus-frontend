// Sistema de XP y ligas — copiado de SideShift (10 ligas, Bronce → Diamante).
// Se gana XP con acciones reales (aplicar, 1er contrato, completar trabajos,
// misiones). El XP se DERIVA de datos existentes, sin cambios de base.

export interface Level {
  key: string
  name: string
  minXP: number
  // clases tailwind para el diseño
  text: string
  chipBg: string
  ring: string
  from: string
  to: string
  benefit: string      // perk principal (compat)
  perks: string[]      // perks completos de la liga
}

// Umbral pensado con "completar un trabajo = 120 XP": hay que esforzarse.
export const LEVELS: Level[] = [
  { key: 'bronze', name: 'Bronce', minXP: 0,
    text: 'text-amber-600', chipBg: 'bg-amber-500/15', ring: 'ring-amber-500/40',
    from: 'from-amber-400', to: 'to-orange-600',
    benefit: 'Acceso completo al marketplace de campañas.',
    perks: ['Acceso completo al marketplace de campañas', 'Misiones y rachas para ganar XP'] },
  { key: 'silver', name: 'Plata', minXP: 500,
    text: 'text-slate-500', chipBg: 'bg-slate-300/20', ring: 'ring-slate-300/50',
    from: 'from-slate-300', to: 'to-slate-500',
    benefit: 'Tu perfil se muestra más a las empresas.',
    perks: ['Tu perfil se muestra más a las empresas', 'Badge de Plata en tu perfil'] },
  { key: 'gold', name: 'Oro', minXP: 1400,
    text: 'text-yellow-600', chipBg: 'bg-yellow-400/15', ring: 'ring-yellow-400/40',
    from: 'from-yellow-300', to: 'to-amber-500',
    benefit: 'Prioridad en el feed de las empresas.',
    perks: ['Prioridad en el feed de las empresas', 'Badge dorado destacado', 'Acceso anticipado a campañas nuevas'] },
  { key: 'amethyst', name: 'Amatista', minXP: 2600,
    text: 'text-purple-500', chipBg: 'bg-purple-400/15', ring: 'ring-purple-400/40',
    from: 'from-purple-400', to: 'to-fuchsia-600',
    benefit: 'Destacado en los resultados de búsqueda.',
    perks: ['Destacado en los resultados de búsqueda', 'Invitaciones a campañas selectas'] },
  { key: 'pearl', name: 'Perla', minXP: 4200,
    text: 'text-rose-400', chipBg: 'bg-rose-300/15', ring: 'ring-rose-300/40',
    from: 'from-rose-200', to: 'to-purple-300',
    benefit: 'Perfil verificado ante las marcas.',
    perks: ['Perfil verificado ante las marcas', 'Soporte prioritario'] },
  { key: 'sapphire', name: 'Zafiro', minXP: 6200,
    text: 'text-blue-500', chipBg: 'bg-blue-400/15', ring: 'ring-blue-400/40',
    from: 'from-blue-400', to: 'to-indigo-600',
    benefit: 'Acceso prioritario a deals de influencers.',
    perks: ['Acceso prioritario a deals de influencers', 'Posición top en los resultados de búsqueda', 'Incluido en los spotlights semanales a marcas'] },
  { key: 'emerald', name: 'Esmeralda', minXP: 8800,
    text: 'text-emerald-500', chipBg: 'bg-emerald-400/15', ring: 'ring-emerald-400/40',
    from: 'from-emerald-400', to: 'to-teal-600',
    benefit: 'Acceso first-look a campañas de $1k+.',
    perks: ['Acceso first-look a campañas grandes ($1k+)', 'Señal de creador confiable para las marcas', 'Elegible para ser Creator Manager'] },
  { key: 'ruby', name: 'Rubí', minXP: 12000,
    text: 'text-rose-600', chipBg: 'bg-rose-500/15', ring: 'ring-rose-500/40',
    from: 'from-rose-400', to: 'to-red-600',
    benefit: 'Exposición VIP ante las mejores agencias.',
    perks: ['Exposición VIP ante las mejores agencias', 'Acceso al grupo privado de feedback de Octopus'] },
  { key: 'amber', name: 'Ámbar', minXP: 16000,
    text: 'text-amber-500', chipBg: 'bg-amber-400/15', ring: 'ring-amber-400/40',
    from: 'from-amber-300', to: 'to-yellow-600',
    benefit: 'Matchmaking directo con marcas.',
    perks: ['Spotlight en búsquedas de marcas y agencias', 'Matchmaking white-glove con marcas', 'Presentaciones directas a campañas top'] },
  { key: 'diamond', name: 'Diamante', minXP: 21000,
    text: 'text-cyan-500', chipBg: 'bg-cyan-400/15', ring: 'ring-cyan-400/40',
    from: 'from-cyan-300', to: 'to-sky-500',
    benefit: 'Máxima visibilidad. Top 1% de creadores.',
    perks: ['Máxima visibilidad en el marketplace', 'Respaldo oficial de Octopus como creador', 'Presentaciones a clientes enterprise', 'Bienvenido al top 1% de creadores'] },
]

// Cuánto XP da cada acción.
export const XP = {
  apply: 15,            // aplicar a un trabajo
  firstContract: 75,    // aceptar tu primer contrato (una sola vez)
  completeJob: 120,     // entregar un trabajo aprobado
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
    { key: 'photo', label: 'Poné tu foto de perfil', desc: 'Un perfil con foto genera más confianza.', xp: XP.completeProfile, done: !!a.hasPhoto },
    { key: 'social', label: 'Conectá tus redes', desc: 'Sumá TikTok, Instagram o YouTube.', xp: XP.connectSocials, done: !!a.hasSocials },
    { key: 'apply', label: 'Aplicá a tu primer trabajo', desc: 'Explorá campañas y postulate.', xp: XP.apply, done: (a.applications || 0) >= 1 },
    { key: 'contract', label: 'Aceptá tu primer contrato', desc: 'Cuando una marca te elige.', xp: XP.firstContract, done: (a.accepted || 0) >= 1 },
    { key: 'first', label: 'Completá tu primer trabajo', desc: 'Entregá y que te lo aprueben.', xp: XP.completeJob, done: (a.completed || 0) >= 1 },
    { key: 'five', label: 'Completá 5 trabajos', desc: 'Ganá ritmo y subí de liga.', xp: XP.completeJob, done: (a.completed || 0) >= 5 },
  ]
}
