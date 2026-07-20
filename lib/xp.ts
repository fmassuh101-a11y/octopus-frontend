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

// Ligas con tema OCÉANO (identidad Octopus — no las gemas de SideShift).
// De la orilla al abismo y las criaturas legendarias. Umbral: trabajo = 120 XP.
export const LEVELS: Level[] = [
  { key: 'bronze', name: 'Coral', minXP: 0,
    text: 'text-orange-500', chipBg: 'bg-orange-400/15', ring: 'ring-orange-400/40',
    from: 'from-orange-300', to: 'to-rose-400',
    benefit: 'Acceso completo al marketplace de campañas.',
    perks: ['Acceso completo al marketplace de campañas', 'Misiones y rachas para ganar XP'] },
  { key: 'silver', name: 'Nácar', minXP: 500,
    text: 'text-slate-500', chipBg: 'bg-slate-300/20', ring: 'ring-slate-300/50',
    from: 'from-slate-200', to: 'to-slate-400',
    benefit: 'Tu perfil se muestra más a las empresas.',
    perks: ['Tu perfil se muestra más a las empresas', 'Insignia de Nácar en tu perfil'] },
  { key: 'gold', name: 'Aguamarina', minXP: 1400,
    text: 'text-cyan-600', chipBg: 'bg-cyan-400/15', ring: 'ring-cyan-400/40',
    from: 'from-cyan-200', to: 'to-teal-400',
    benefit: 'Prioridad en el feed de las empresas.',
    perks: ['Prioridad en el feed de las empresas', 'Insignia destacada en tu perfil', 'Acceso anticipado a campañas nuevas'] },
  { key: 'amethyst', name: 'Turquesa', minXP: 2600,
    text: 'text-teal-600', chipBg: 'bg-teal-400/15', ring: 'ring-teal-400/40',
    from: 'from-teal-300', to: 'to-cyan-500',
    benefit: 'Destacado en los resultados de búsqueda.',
    perks: ['Destacado en los resultados de búsqueda', 'Invitaciones a campañas selectas'] },
  { key: 'pearl', name: 'Náutilus', minXP: 4200,
    text: 'text-amber-600', chipBg: 'bg-amber-300/15', ring: 'ring-amber-300/40',
    from: 'from-amber-200', to: 'to-yellow-500',
    benefit: 'Perfil verificado ante las marcas.',
    perks: ['Perfil verificado ante las marcas', 'Soporte prioritario'] },
  { key: 'sapphire', name: 'Marea', minXP: 6200,
    text: 'text-blue-500', chipBg: 'bg-blue-400/15', ring: 'ring-blue-400/40',
    from: 'from-sky-400', to: 'to-blue-600',
    benefit: 'Acceso prioritario a deals de influencers.',
    perks: ['Acceso prioritario a deals de influencers', 'Posición top en los resultados de búsqueda', 'Incluido en los spotlights semanales a marcas'] },
  { key: 'emerald', name: 'Corriente', minXP: 8800,
    text: 'text-emerald-500', chipBg: 'bg-emerald-400/15', ring: 'ring-emerald-400/40',
    from: 'from-emerald-400', to: 'to-teal-600',
    benefit: 'Acceso first-look a campañas de $1k+.',
    perks: ['Acceso first-look a campañas grandes ($1k+)', 'Señal de creador confiable para las marcas', 'Elegible para ser Creator Manager'] },
  { key: 'ruby', name: 'Abismo', minXP: 12000,
    text: 'text-indigo-500', chipBg: 'bg-indigo-500/15', ring: 'ring-indigo-500/40',
    from: 'from-indigo-500', to: 'to-slate-800',
    benefit: 'Exposición VIP ante las mejores agencias.',
    perks: ['Exposición VIP ante las mejores agencias', 'Acceso al grupo privado de feedback de Octopus'] },
  { key: 'amber', name: 'Kraken', minXP: 16000,
    text: 'text-purple-500', chipBg: 'bg-purple-500/15', ring: 'ring-purple-500/40',
    from: 'from-purple-500', to: 'to-fuchsia-700',
    benefit: 'Matchmaking directo con marcas.',
    perks: ['Spotlight en búsquedas de marcas y agencias', 'Matchmaking a medida con marcas', 'Presentaciones directas a campañas top'] },
  { key: 'diamond', name: 'Leviatán', minXP: 21000,
    text: 'text-cyan-500', chipBg: 'bg-cyan-400/15', ring: 'ring-cyan-400/40',
    from: 'from-cyan-300', to: 'to-sky-500',
    benefit: 'Máxima visibilidad. Top 1% de creadores.',
    perks: ['Máxima visibilidad en el marketplace', 'Respaldo oficial de Octopus como creador', 'Presentaciones a clientes enterprise', 'Bienvenido al top 1% de creadores del océano'] },
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
    { key: 'photo', label: 'Pon tu foto de perfil', desc: 'Un perfil con foto genera más confianza.', xp: XP.completeProfile, done: !!a.hasPhoto },
    { key: 'social', label: 'Conecta tus redes', desc: 'Suma TikTok, Instagram o YouTube.', xp: XP.connectSocials, done: !!a.hasSocials },
    { key: 'apply', label: 'Aplica a tu primer trabajo', desc: 'Explora campañas y postúlate.', xp: XP.apply, done: (a.applications || 0) >= 1 },
    { key: 'contract', label: 'Acepta tu primer contrato', desc: 'Cuando una marca te elige.', xp: XP.firstContract, done: (a.accepted || 0) >= 1 },
    { key: 'first', label: 'Completa tu primer trabajo', desc: 'Entrega y que te lo aprueben.', xp: XP.completeJob, done: (a.completed || 0) >= 1 },
    { key: 'five', label: 'Completa 5 trabajos', desc: 'Gana ritmo y sube de liga.', xp: XP.completeJob, done: (a.completed || 0) >= 5 },
  ]
}
