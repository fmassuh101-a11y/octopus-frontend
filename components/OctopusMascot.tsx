'use client'

import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO — la mascota de Octopus.  Estilo Pixar: pulpo "adolescente", cabeza
//  puntiaguda, cejas expresivas, ojos grandes brillosos, cachetes, y
//  tentáculos que se enroscan con ventosas. SIEMPRE vivo (respira, flota,
//  parpadea, mira alrededor). Reacciona a lo que hace el usuario y se puede
//  tocar con el mouse (feliz una vez; si lo molestás mucho, se enoja 😤).
//
//  variant 'creator' = amigable / chill.   variant 'company' = con moñito, formal.
// ─────────────────────────────────────────────────────────────────────────
export type OctoMood = 'idle' | 'happy' | 'hiding' | 'success' | 'error' | 'angry'

export default function OctopusMascot({
  mood = 'idle',
  size = 190,
  look = null,
  variant = 'creator',
  interactive = true,
}: {
  mood?: OctoMood
  size?: number
  look?: { x: number; y: number } | null
  variant?: 'creator' | 'company'
  interactive?: boolean
}) {
  const [blink, setBlink] = useState(false)
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [play, setPlay] = useState<OctoMood | null>(null) // reacción al tocarlo
  const clicks = useRef<number[]>([])
  const playTimer = useRef<ReturnType<typeof setTimeout>>()
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }, [])

  // el mood que manda el padre tiene prioridad; si está idle, mandan los clics
  const effMood: OctoMood = mood !== 'idle' ? mood : (play ?? 'idle')

  // Parpadeo natural (pausado si se tapa los ojos)
  useEffect(() => {
    if (effMood === 'hiding' || reduced.current) return
    let alive = true
    let h: ReturnType<typeof setTimeout>
    const loop = () => {
      h = setTimeout(() => {
        if (!alive) return
        setBlink(true); setTimeout(() => setBlink(false), 130)
        if (Math.random() > 0.7) setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 120) }, 290)
        loop()
      }, 2400 + Math.random() * 2800)
    }
    loop()
    return () => { alive = false; clearTimeout(h) }
  }, [effMood])

  // Mirada viva
  useEffect(() => {
    if (reduced.current) return
    if (look) { setGaze({ x: Math.max(-6, Math.min(6, look.x * 6)), y: (look.y ?? 0.6) * 6 }); return }
    if (effMood === 'happy' || effMood === 'success') { setGaze({ x: 0, y: -3 }); return }
    if (effMood === 'error') { setGaze({ x: 0, y: 4 }); return }
    if (effMood === 'angry') { setGaze({ x: 0, y: 0 }); return }
    if (effMood === 'hiding') return
    let alive = true
    let h: ReturnType<typeof setTimeout>
    const targets = [{ x: 0, y: 0 }, { x: -4, y: -1 }, { x: 4, y: -1 }, { x: 0, y: 2 }, { x: -3, y: 2 }, { x: 3, y: 1 }]
    const loop = () => {
      h = setTimeout(() => { if (!alive) return; setGaze(targets[Math.floor(Math.random() * targets.length)]); loop() }, 1600 + Math.random() * 2200)
    }
    loop()
    return () => { alive = false; clearTimeout(h) }
  }, [effMood, look?.x, look?.y])

  // Tocarlo con el mouse: 1 vez feliz; muchas veces seguidas → se enoja
  const handlePoke = () => {
    if (!interactive) return
    const now = Date.now()
    clicks.current = [...clicks.current.filter(t => now - t < 1600), now]
    const angry = clicks.current.length >= 4
    setPlay(angry ? 'angry' : 'happy')
    clearTimeout(playTimer.current)
    playTimer.current = setTimeout(() => setPlay(null), angry ? 1400 : 1100)
  }

  const hiding = effMood === 'hiding'
  const happy = effMood === 'happy' || effMood === 'success'
  const angry = effMood === 'angry'
  const sad = effMood === 'error'
  const eyesClosed = blink || hiding
  const pupilStyle = { transform: `translate(${gaze.x}px, ${gaze.y}px)` }

  // cejas según ánimo (expresividad "adolescente")
  const browL = angry ? 'M70 88 L100 100' : sad ? 'M70 96 L100 88' : 'M70 92 Q84 84 100 90'
  const browR = angry ? 'M170 88 L140 100' : sad ? 'M170 96 L140 88' : 'M170 92 Q156 84 140 90'

  return (
    <div
      className={`octo octo--${effMood} ${interactive ? 'octo--poke' : ''}`}
      style={{ width: size, height: size }}
      onClick={handlePoke}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? 'Octo, la mascota (tocala)' : undefined}
    >
      <svg viewBox="0 0 240 268" width={size} height={size}>
        <defs>
          <radialGradient id="oBody" cx="38%" cy="26%" r="85%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="38%" stopColor="#34d399" />
            <stop offset="78%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          <linearGradient id="oLeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4a7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <radialGradient id="oBelly" cx="50%" cy="46%" r="60%">
            <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="oRim" cx="34%" cy="20%" r="42%">
            <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f0fdf4" stopOpacity="0" />
          </radialGradient>
          <filter id="oSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#065f46" floodOpacity="0.4" />
          </filter>
          <clipPath id="cEyeL"><ellipse cx="96" cy="116" rx="20" ry="23" /></clipPath>
          <clipPath id="cEyeR"><ellipse cx="144" cy="116" rx="20" ry="23" /></clipPath>
        </defs>

        {/* sombra piso */}
        <ellipse className="o-shadow" cx="120" cy="252" rx="56" ry="10" fill="#065f46" opacity="0.28" />

        <g className="o-float">
          <g className="o-breathe" filter="url(#oSoft)">

            {/* TENTÁCULOS traseros (patas) — tubos con ventosas y punta enroscada */}
            <g className="o-legs" fill="none" stroke="url(#oLeg)" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round">
              <path className="leg lg1" d="M92 168 C 70 188 54 196 50 220 C 48 232 60 236 66 226" />
              <path className="leg lg2" d="M108 176 C 100 200 94 214 96 234 C 97 244 108 246 112 236" />
              <path className="leg lg3" d="M132 176 C 140 200 146 214 144 234 C 143 244 132 246 128 236" />
              <path className="leg lg4" d="M148 168 C 170 188 186 196 190 220 C 192 232 180 236 174 226" />
            </g>
            {/* ventosas de las patas */}
            <g className="o-legs" fill="#6ee7b7" opacity="0.8">
              <circle cx="60" cy="212" r="3.2" /><circle cx="58" cy="222" r="2.6" />
              <circle cx="180" cy="212" r="3.2" /><circle cx="182" cy="222" r="2.6" />
              <circle cx="104" cy="220" r="2.8" /><circle cx="136" cy="220" r="2.8" />
            </g>

            {/* BRAZOS delanteros que se enroscan hacia arriba (la firma del pulpo) */}
            <g className="o-arms" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path className="arm arm-l" d="M82 152 C 52 150 30 156 24 132 C 20 116 34 108 44 118 C 51 125 44 134 37 129"
                stroke="url(#oLeg)" strokeWidth="15" />
              <path className="arm arm-r" d="M158 152 C 188 150 210 156 216 132 C 220 116 206 108 196 118 C 189 125 196 134 203 129"
                stroke="url(#oLeg)" strokeWidth="15" />
            </g>
            <g className="o-arms" fill="#6ee7b7" opacity="0.8">
              <circle cx="40" cy="146" r="2.6" /><circle cx="30" cy="138" r="2.6" />
              <circle cx="200" cy="146" r="2.6" /><circle cx="210" cy="138" r="2.6" />
            </g>

            {/* CABEZA puntiaguda (teardrop) */}
            <path className="o-head" d="M120 22
              C 152 26 180 58 182 100
              C 183 128 172 150 152 160
              C 134 169 106 169 88 160
              C 68 150 57 128 58 100
              C 60 58 88 26 120 22 Z" fill="url(#oBody)" />
            {/* pancita clara + brillo */}
            <ellipse cx="120" cy="132" rx="48" ry="40" fill="url(#oBelly)" />
            <ellipse cx="92" cy="66" rx="24" ry="16" fill="url(#oRim)" />

            {/* CEJAS */}
            <path className="brow" d={browL} stroke="#0f172a" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path className="brow" d={browR} stroke="#0f172a" strokeWidth="6" fill="none" strokeLinecap="round" />

            {/* CACHETES */}
            <ellipse className="cheek" cx="70" cy="136" rx="13" ry="9" fill="#fb7185" opacity="0.5" />
            <ellipse className="cheek" cx="170" cy="136" rx="13" ry="9" fill="#fb7185" opacity="0.5" />

            {/* OJOS grandes con párpado suave */}
            <g className="o-eyes">
              <g clipPath="url(#cEyeL)">
                <ellipse cx="96" cy="116" rx="20" ry="23" fill="#ffffff" />
                <g className="pupil" style={pupilStyle}>
                  <circle cx="99" cy="118" r="10.5" fill="#0f172a" />
                  <circle cx="103" cy="113" r="3.4" fill="#fff" />
                  <circle cx="94" cy="123" r="1.8" fill="#fff" opacity="0.85" />
                </g>
                <rect className={`lid ${eyesClosed ? 'shut' : ''}`} x="74" y="92" width="44" height="48" fill="#22b583" />
              </g>
              <g clipPath="url(#cEyeR)">
                <ellipse cx="144" cy="116" rx="20" ry="23" fill="#ffffff" />
                <g className="pupil" style={pupilStyle}>
                  <circle cx="147" cy="118" r="10.5" fill="#0f172a" />
                  <circle cx="151" cy="113" r="3.4" fill="#fff" />
                  <circle cx="142" cy="123" r="1.8" fill="#fff" opacity="0.85" />
                </g>
                <rect className={`lid ${eyesClosed ? 'shut' : ''}`} x="122" y="92" width="44" height="48" fill="#22b583" />
              </g>
            </g>

            {/* BOCA */}
            {happy ? (
              <path d="M104 146 q16 16 32 0" stroke="#0f172a" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            ) : angry ? (
              <path d="M104 152 q16 -10 32 0" stroke="#0f172a" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            ) : sad ? (
              <path d="M106 152 q14 -12 28 0" stroke="#0f172a" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            ) : hiding ? (
              <path d="M112 148 q8 6 16 0" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M108 148 q12 9 24 0" stroke="#0f172a" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            )}

            {/* TENTÁCULOS que suben a taparse los ojos (peek-a-boo) */}
            <g className={`o-cover ${hiding ? 'is-on' : ''}`}>
              <path className="cov cov-l" d="M52 176 C 40 150 58 120 96 118" stroke="url(#oLeg)" strokeWidth="22" fill="none" strokeLinecap="round" />
              <path className="cov cov-r" d="M188 176 C 200 150 182 120 144 118" stroke="url(#oLeg)" strokeWidth="22" fill="none" strokeLinecap="round" />
              <g fill="#6ee7b7" opacity="0.85">
                <circle className="cov cov-l" cx="70" cy="126" r="3" /><circle className="cov cov-l" cx="86" cy="120" r="3" />
                <circle className="cov cov-r" cx="170" cy="126" r="3" /><circle className="cov cov-r" cx="154" cy="120" r="3" />
              </g>
            </g>

            {/* TRAJE (solo empresas): moñito + cuello */}
            {variant === 'company' && (
              <g className="o-suit">
                <path d="M96 166 L120 176 L96 186 Z" fill="#e5e7eb" />
                <path d="M144 166 L120 176 L144 186 Z" fill="#e5e7eb" />
                <path d="M108 170 L120 176 L108 182 Z" fill="#334155" />
                <path d="M132 170 L120 176 L132 182 Z" fill="#334155" />
                <circle cx="120" cy="176" r="4.5" fill="#1e293b" />
              </g>
            )}

            {/* estrellitas al celebrar */}
            {effMood === 'success' && (
              <g className="o-stars">
                <path className="st st1" d="M44 60 l3.6 8 l8 3.6 l-8 3.6 l-3.6 8 l-3.6 -8 l-8 -3.6 l8 -3.6 z" fill="#fde047" />
                <path className="st st2" d="M198 52 l2.6 6 l6 2.6 l-6 2.6 l-2.6 6 l-2.6 -6 l-6 -2.6 l6 -2.6 z" fill="#fde047" />
                <path className="st st3" d="M188 100 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fcd34d" />
              </g>
            )}

            {/* enojo: nubecitas de humo */}
            {angry && (
              <g className="o-steam" fill="#94a3b8" opacity="0.7">
                <circle className="stm s1" cx="66" cy="40" r="5" />
                <circle className="stm s2" cx="174" cy="40" r="5" />
              </g>
            )}
          </g>
        </g>
      </svg>

      <style jsx>{`
        .octo { position: relative; display: inline-block; user-select: none; }
        .octo--poke { cursor: pointer; }
        .octo svg { display: block; overflow: visible; }

        .o-float { transform-box: fill-box; transform-origin: 50% 62%; animation: oFloat 4.2s ease-in-out infinite; will-change: transform; }
        @keyframes oFloat { 0%,100% { transform: translateY(2px) rotate(-2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }

        .o-breathe { transform-box: fill-box; transform-origin: 50% 70%; animation: oBreathe 2.9s ease-in-out infinite; will-change: transform; }
        @keyframes oBreathe { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.035,.965); } }

        .o-shadow { transform-box: fill-box; transform-origin: center; animation: oShadow 4.2s ease-in-out infinite; }
        @keyframes oShadow { 0%,100% { transform: scaleX(1); opacity:.28; } 50% { transform: scaleX(.82); opacity:.2; } }

        .leg, .arm { transform-box: fill-box; transform-origin: top center; will-change: transform; }
        .lg1 { animation: sway 2.7s ease-in-out infinite; }
        .lg2 { animation: sway 3.0s ease-in-out .18s infinite; }
        .lg3 { animation: sway 2.6s ease-in-out .3s infinite; }
        .lg4 { animation: sway 2.85s ease-in-out .12s infinite; }
        .arm-l { animation: sway 3.2s ease-in-out .1s infinite; transform-origin: right center; }
        .arm-r { animation: sway 3.2s ease-in-out .25s infinite; transform-origin: left center; }
        @keyframes sway { 0%,100% { transform: rotate(-3.5deg); } 50% { transform: rotate(3.5deg); } }

        .pupil { transition: transform .5s cubic-bezier(.22,1,.36,1); }
        .cheek { transition: opacity .3s ease; }
        .brow { transition: d .2s ease; }

        .lid { transform-box: fill-box; transform-origin: top center; transform: translateY(-100%); transition: transform .12s ease; }
        .lid.shut { transform: translateY(0); }

        /* tentáculos que tapan los ojos */
        .o-cover .cov { opacity: 0; transform-box: fill-box; transform-origin: 50% 100%; transform: translateY(26px) scaleY(.7); transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .25s ease; }
        .o-cover.is-on .cov { opacity: 1; transform: translateY(0) scaleY(1); }

        .octo--happy .o-float, .octo--success .o-float { animation: oBounce 1.4s cubic-bezier(.34,1.56,.64,1) infinite; }
        @keyframes oBounce { 0%,100% { transform: translateY(2px) rotate(0); } 35% { transform: translateY(-15px) rotate(-3deg); } 65% { transform: translateY(-3px) rotate(3deg); } }
        .octo--happy .cheek, .octo--success .cheek { opacity:.85; }

        .octo--error .o-breathe { animation: oShake .4s ease-in-out 2; }
        .octo--angry .o-breathe { animation: oShake .28s ease-in-out 4; }
        @keyframes oShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-7px) rotate(-3deg); } 75% { transform: translateX(7px) rotate(3deg); } }
        .octo--angry .cheek { opacity:.9; }

        .o-stars .st { transform-box: fill-box; transform-origin: center; }
        .st1 { animation: pop .6s ease-out both; } .st2 { animation: pop .6s ease-out .1s both; } .st3 { animation: pop .6s ease-out .2s both; }
        @keyframes pop { 0% { opacity:0; transform: scale(.2) rotate(-40deg); } 70% { opacity:1; transform: scale(1.2) rotate(8deg); } 100% { opacity:1; transform: scale(1) rotate(0); } }

        .stm { transform-box: fill-box; transform-origin: center; }
        .s1 { animation: steam 1s ease-out infinite; } .s2 { animation: steam 1s ease-out .3s infinite; }
        @keyframes steam { 0% { opacity:.7; transform: translateY(0) scale(.6); } 100% { opacity:0; transform: translateY(-14px) scale(1.3); } }

        @media (prefers-reduced-motion: reduce) { .o-float,.o-breathe,.o-shadow,.leg,.arm { animation: none !important; } }
      `}</style>
    </div>
  )
}
