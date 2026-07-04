'use client'

import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO — la mascota de Octopus.
//  Diseño estilo Pixar/Disney: redondo, suave, expresivo. SIEMPRE está vivo
//  (respira, flota, mueve los tentáculos, parpadea, mira alrededor). Reacciona
//  a lo que hace el usuario. Todo con SVG + CSS puro (rápido, sin librerías).
//
//  Moods:
//   - idle:    respira, flota, mira de a ratos, parpadea
//   - happy:   sonríe, mira arriba, rebota suave (al escribir tu email/nombre)
//   - hiding:  se tapa los ojos con los tentáculos (al escribir la contraseña)
//   - success: celebra con estrellitas
//   - error:   se pone triste y tiembla un segundo
// ─────────────────────────────────────────────────────────────────────────
export type OctoMood = 'idle' | 'happy' | 'hiding' | 'success' | 'error'

export default function OctopusMascot({
  mood = 'idle',
  size = 180,
  look = null,
}: {
  mood?: OctoMood
  size?: number
  // Cuando el usuario escribe su email, Octo "lee" y sigue el texto con la mirada.
  // look.x: -1 (inicio del campo) a 1 (final). look.y opcional (mira hacia abajo).
  look?: { x: number; y: number } | null
}) {
  const [blink, setBlink] = useState(false)
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Parpadeo natural e irregular (se pausa cuando se tapa los ojos)
  useEffect(() => {
    if (mood === 'hiding' || reduced.current) return
    let alive = true
    let handle: ReturnType<typeof setTimeout>
    const schedule = () => {
      handle = setTimeout(() => {
        if (!alive) return
        setBlink(true)
        setTimeout(() => setBlink(false), 130)
        // de vez en cuando, doble parpadeo (más natural)
        if (Math.random() > 0.7) {
          setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 120) }, 280)
        }
        schedule()
      }, 2400 + Math.random() * 2800)
    }
    schedule()
    return () => { alive = false; clearTimeout(handle) }
  }, [mood])

  // Mirada viva: en idle mira despacio a distintos lados; según el mood, dirige la vista
  useEffect(() => {
    if (reduced.current) return
    // si el padre manda una mirada (siguiendo el texto que escribís), Octo la sigue
    if (look) { setGaze({ x: Math.max(-6, Math.min(6, look.x * 6)), y: (look.y ?? 0.6) * 6 }); return }
    if (mood === 'happy' || mood === 'success') { setGaze({ x: 0, y: -3 }); return }
    if (mood === 'error') { setGaze({ x: 0, y: 3 }); return }
    if (mood === 'hiding') return
    let alive = true
    let handle: ReturnType<typeof setTimeout>
    const targets = [{ x: 0, y: 0 }, { x: -4, y: -1 }, { x: 4, y: -1 }, { x: 0, y: 2 }, { x: -3, y: 2 }, { x: 3, y: 1 }]
    const schedule = () => {
      handle = setTimeout(() => {
        if (!alive) return
        setGaze(targets[Math.floor(Math.random() * targets.length)])
        schedule()
      }, 1600 + Math.random() * 2200)
    }
    schedule()
    return () => { alive = false; clearTimeout(handle) }
  }, [mood, look?.x, look?.y])

  const hiding = mood === 'hiding'
  const happy = mood === 'happy' || mood === 'success'
  const eyesClosed = blink || hiding
  const pupilStyle = { transform: `translate(${gaze.x}px, ${gaze.y}px)` }

  return (
    <div className={`octo octo--${mood}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 240 240" width={size} height={size}>
        <defs>
          <radialGradient id="octoBody" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="45%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          <radialGradient id="octoBelly" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="octoLeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <radialGradient id="octoRim" cx="35%" cy="22%" r="40%">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d1fae5" stopOpacity="0" />
          </radialGradient>
          <filter id="octoSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#065f46" floodOpacity="0.35" />
          </filter>
          <clipPath id="clipEyeL"><ellipse cx="94" cy="104" rx="18" ry="20" /></clipPath>
          <clipPath id="clipEyeR"><ellipse cx="146" cy="104" rx="18" ry="20" /></clipPath>
        </defs>

        {/* sombra en el piso */}
        <ellipse className="octo-shadow" cx="120" cy="226" rx="52" ry="9" fill="#065f46" opacity="0.25" />

        {/* flotación (siempre activa) */}
        <g className="octo-float">
          {/* respiración (siempre activa) */}
          <g className="octo-breathe" filter="url(#octoSoft)">

            {/* tentáculos traseros */}
            <g className="octo-legs">
              <path className="leg lg1" d="M78 150 q-30 18 -34 52 q-2 16 12 16 q12 0 10 -14 q-3 -26 22 -42 z" fill="url(#octoLeg)" />
              <path className="leg lg2" d="M96 158 q-20 26 -18 56 q1 15 13 12 q10 -3 6 -18 q-6 -24 10 -46 z" fill="url(#octoLeg)" />
              <path className="leg lg3" d="M144 158 q20 26 18 56 q-1 15 -13 12 q-10 -3 -6 -18 q6 -24 -10 -46 z" fill="url(#octoLeg)" />
              <path className="leg lg4" d="M162 150 q30 18 34 52 q2 16 -12 16 q-12 0 -10 -14 q3 -26 -22 -42 z" fill="url(#octoLeg)" />
              <path className="leg lg5" d="M116 162 q-8 28 -4 52 q2 14 8 14 q6 0 6 -14 q-2 -26 2 -50 z" fill="#0d9668" />
              <path className="leg lg6" d="M124 162 q8 28 4 52 q-2 14 -8 14 q-6 0 -6 -14 q2 -26 -2 -50 z" fill="#0d9668" />
            </g>

            {/* cuerpo / cabeza */}
            <path className="octo-head" d="M120 44
              C 80 44 54 74 54 112
              C 54 146 82 168 120 168
              C 158 168 186 146 186 112
              C 186 74 160 44 120 44 Z" fill="url(#octoBody)" />
            {/* pancita clara */}
            <ellipse cx="120" cy="126" rx="46" ry="38" fill="url(#octoBelly)" />
            {/* luz de borde arriba-izq */}
            <ellipse cx="90" cy="72" rx="26" ry="18" fill="url(#octoRim)" />

            {/* cachetes */}
            <ellipse className="cheek" cx="72" cy="122" rx="12" ry="9" fill="#fb7185" opacity="0.5" />
            <ellipse className="cheek" cx="168" cy="122" rx="12" ry="9" fill="#fb7185" opacity="0.5" />

            {/* OJOS (con párpados suaves) */}
            <g className="octo-eyes">
              {/* ojo izquierdo */}
              <g clipPath="url(#clipEyeL)">
                <ellipse cx="94" cy="104" rx="18" ry="20" fill="#ffffff" />
                <g className="pupil" style={pupilStyle}>
                  <circle cx="96" cy="106" r="9" fill="#0f172a" />
                  <circle cx="99.5" cy="102" r="3" fill="#ffffff" />
                  <circle cx="92" cy="110" r="1.6" fill="#ffffff" opacity="0.8" />
                </g>
                <rect className={`lid ${eyesClosed ? 'shut' : ''}`} x="74" y="82" width="40" height="44" fill="#12b981" />
              </g>
              {/* ojo derecho */}
              <g clipPath="url(#clipEyeR)">
                <ellipse cx="146" cy="104" rx="18" ry="20" fill="#ffffff" />
                <g className="pupil" style={pupilStyle}>
                  <circle cx="148" cy="106" r="9" fill="#0f172a" />
                  <circle cx="151.5" cy="102" r="3" fill="#ffffff" />
                  <circle cx="144" cy="110" r="1.6" fill="#ffffff" opacity="0.8" />
                </g>
                <rect className={`lid ${eyesClosed ? 'shut' : ''}`} x="126" y="82" width="40" height="44" fill="#12b981" />
              </g>
            </g>

            {/* BOCA */}
            {mood === 'success' ? (
              <g className="mouth-happy">
                <path d="M104 134 q16 22 32 0 q-16 10 -32 0 z" fill="#0f172a" />
                <path d="M110 138 q10 8 20 0 q-10 4 -20 0 z" fill="#fb7185" />
              </g>
            ) : happy ? (
              <path d="M104 134 q16 18 32 0" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
            ) : mood === 'error' ? (
              <path d="M106 140 q14 -12 28 0" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M108 136 q12 9 24 0" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
            )}

            {/* BRAZOS que tapan los ojos (peek-a-boo) */}
            <g className={`octo-arms ${hiding ? 'is-hiding' : ''}`}>
              <path className="arm arm-l" d="M58 132 q-26 -6 -30 -34 q-2 -16 12 -16 q13 0 11 16 q-3 22 26 30 z" fill="url(#octoLeg)" />
              <path className="arm arm-r" d="M182 132 q26 -6 30 -34 q2 -16 -12 -16 q-13 0 -11 16 q3 22 -26 30 z" fill="url(#octoLeg)" />
            </g>

            {/* estrellitas al lograrlo */}
            {mood === 'success' && (
              <g className="octo-stars">
                <path className="st st1" d="M46 54 l3.5 8 l8 3.5 l-8 3.5 l-3.5 8 l-3.5 -8 l-8 -3.5 l8 -3.5 z" fill="#fde047" />
                <path className="st st2" d="M196 46 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5 z" fill="#fde047" />
                <path className="st st3" d="M182 92 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fcd34d" />
              </g>
            )}
          </g>
        </g>
      </svg>

      <style jsx>{`
        .octo { position: relative; display: inline-block; user-select: none; }
        .octo svg { display: block; overflow: visible; }

        /* flotación suave y continua */
        .octo-float {
          transform-box: fill-box; transform-origin: 50% 60%;
          animation: octoFloat 4.2s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes octoFloat {
          0%, 100% { transform: translateY(2px) rotate(-2deg); }
          50%      { transform: translateY(-8px) rotate(2deg); }
        }

        /* respiración: sutil squash & stretch, SIEMPRE viva */
        .octo-breathe {
          transform-box: fill-box; transform-origin: 50% 72%;
          animation: octoBreathe 2.9s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes octoBreathe {
          0%, 100% { transform: scale(1, 1); }
          50%      { transform: scale(1.035, 0.965); }
        }

        /* sombra late con la respiración */
        .octo-shadow { animation: octoShadow 4.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes octoShadow {
          0%, 100% { transform: scaleX(1); opacity: .25; }
          50%      { transform: scaleX(.82); opacity: .18; }
        }

        /* tentáculos: cada uno ondula con su propio ritmo (movimiento orgánico) */
        .leg { transform-box: fill-box; transform-origin: top center; will-change: transform; }
        .lg1 { animation: legWave 2.6s ease-in-out infinite; }
        .lg2 { animation: legWave 2.9s ease-in-out infinite .18s; }
        .lg3 { animation: legWave 3.1s ease-in-out infinite .32s; }
        .lg4 { animation: legWave 2.7s ease-in-out infinite .12s; }
        .lg5 { animation: legWave 2.4s ease-in-out infinite .24s; }
        .lg6 { animation: legWave 2.55s ease-in-out infinite .4s; }
        @keyframes legWave {
          0%, 100% { transform: rotate(-4deg); }
          50%      { transform: rotate(4deg); }
        }

        .pupil { transition: transform .5s cubic-bezier(.22,1,.36,1); }
        .cheek { transition: opacity .3s ease; }

        /* párpados: bajan suave para parpadear/cerrar */
        .lid {
          transform-box: fill-box; transform-origin: top center;
          transform: translateY(-100%); transition: transform .12s ease;
        }
        .lid.shut { transform: translateY(0); }

        /* brazos peek-a-boo */
        .octo-arms .arm {
          transform-box: fill-box; transform-origin: 50% 100%;
          opacity: 0; transition: transform .42s cubic-bezier(.34,1.56,.64,1), opacity .25s ease;
        }
        .arm-l { transform: translate(24px, 34px) rotate(28deg) scale(.9); }
        .arm-r { transform: translate(-24px, 34px) rotate(-28deg) scale(.9); }
        .octo-arms.is-hiding .arm { opacity: 1; }
        .octo-arms.is-hiding .arm-l { transform: translate(40px, -6px) rotate(-6deg); }
        .octo-arms.is-hiding .arm-r { transform: translate(-40px, -6px) rotate(6deg); }

        /* feliz: rebote alegre encima de la flotación */
        .octo--happy .octo-float, .octo--success .octo-float { animation: octoBounce 1.5s cubic-bezier(.34,1.56,.64,1) infinite; }
        @keyframes octoBounce {
          0%, 100% { transform: translateY(2px) rotate(0deg); }
          35%      { transform: translateY(-14px) rotate(-3deg); }
          65%      { transform: translateY(-3px) rotate(3deg); }
        }

        /* error: temblorcito triste */
        .octo--error .octo-breathe { animation: octoShake .38s ease-in-out 2; }
        @keyframes octoShake {
          0%,100% { transform: translateX(0) scale(1,1); }
          25% { transform: translateX(-7px) rotate(-3deg); }
          75% { transform: translateX(7px) rotate(3deg); }
        }

        .octo-stars .st { transform-box: fill-box; transform-origin: center; }
        .st1 { animation: starPop .6s ease-out both; }
        .st2 { animation: starPop .6s ease-out .1s both; }
        .st3 { animation: starPop .6s ease-out .2s both; }
        @keyframes starPop {
          0% { opacity: 0; transform: scale(.2) rotate(-40deg); }
          70% { opacity: 1; transform: scale(1.2) rotate(8deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .octo-float, .octo-breathe, .octo-shadow, .leg { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
