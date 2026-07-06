'use client'

// Fondo Océano de Octopus (identidad propia — NO las nubes de SideShift).
// Degradado de mar con ondas suaves al pie y burbujas subiendo.
// hue: 'ocean' (default, teal/aqua), 'warm' (racha/fuego), 'sun' (misiones).
export default function Sky({
  height = 320,
  hue = 'ocean',
}: {
  height?: number
  hue?: 'ocean' | 'warm' | 'sun' | 'blue' | 'orange' | 'yellow'
}) {
  const kind = hue === 'orange' ? 'warm' : hue === 'yellow' ? 'sun' : hue === 'blue' ? 'ocean' : hue

  const grad =
    kind === 'warm'
      ? 'linear-gradient(180deg,#FB923C 0%,#FDBA74 40%,#FFEDD5 74%,rgba(255,255,255,0) 100%)'
      : kind === 'sun'
      ? 'linear-gradient(180deg,#FCD34D 0%,#FDE68A 42%,#FEF9C3 76%,rgba(255,255,255,0) 100%)'
      : 'linear-gradient(180deg,#0891B2 0%,#22D3EE 42%,#A5F3FC 74%,rgba(255,255,255,0) 100%)'

  const wave =
    kind === 'warm' ? '#FFF7ED' : kind === 'sun' ? '#FEFCE8' : '#FFFFFF'
  const bubble =
    kind === 'warm' ? 'rgba(255,255,255,0.5)' : kind === 'sun' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)'

  // posiciones de burbujas (x%, tamaño rel, y desde arriba rel)
  const bubbles = [
    { x: 14, s: 0.05, y: 0.28 }, { x: 30, s: 0.032, y: 0.5 }, { x: 47, s: 0.06, y: 0.2 },
    { x: 63, s: 0.038, y: 0.42 }, { x: 78, s: 0.05, y: 0.32 }, { x: 88, s: 0.03, y: 0.55 },
    { x: 22, s: 0.028, y: 0.66 }, { x: 70, s: 0.026, y: 0.62 },
  ]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height }}>
      <div className="absolute inset-0" style={{ background: grad }} />

      {/* burbujas subiendo */}
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${b.x}%`,
            top: height * b.y,
            width: height * b.s,
            height: height * b.s,
            background: bubble,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.4)`,
          }}
        />
      ))}

      {/* ondas suaves al pie (2 capas) — reemplazan las nubes */}
      <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 1440 220" preserveAspectRatio="none" style={{ height: height * 0.72 }}>
        <path d="M0,140 C240,90 480,190 720,150 C960,110 1200,180 1440,130 L1440,220 L0,220 Z" fill={wave} opacity="0.55" />
        <path d="M0,175 C260,130 520,215 780,175 C1040,140 1240,205 1440,170 L1440,220 L0,220 Z" fill={wave} />
      </svg>
    </div>
  )
}
