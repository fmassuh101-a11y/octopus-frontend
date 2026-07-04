'use client'

import { useEffect, useState } from 'react'

// Estados de ánimo del pulpo Octo.
//  - idle:   flota tranquilo, parpadea, mueve los tentáculos
//  - happy:  sonríe y rebota (cuando escribís tu nombre/email)
//  - hiding: se tapa los ojos con los tentáculos (cuando escribís la contraseña)
//  - success: celebra
//  - error:  se pone triste un segundo
export type OctoMood = 'idle' | 'happy' | 'hiding' | 'success' | 'error'

export default function OctopusMascot({
  mood = 'idle',
  size = 180,
}: {
  mood?: OctoMood
  size?: number
}) {
  const [blink, setBlink] = useState(false)

  // parpadeo natural cada pocos segundos (pausado cuando se tapa los ojos)
  useEffect(() => {
    if (mood === 'hiding') return
    let alive = true
    const loop = () => {
      const next = 2200 + Math.random() * 2600
      const t = setTimeout(() => {
        if (!alive) return
        setBlink(true)
        setTimeout(() => setBlink(false), 140)
        loop()
      }, next)
      return t
    }
    const t = loop()
    return () => { alive = false; clearTimeout(t) }
  }, [mood])

  const hiding = mood === 'hiding'
  const happy = mood === 'happy' || mood === 'success'
  const eyesClosed = blink || hiding || mood === 'error'

  return (
    <div className={`octo octo--${mood}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <radialGradient id="octoBody" cx="42%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </radialGradient>
          <radialGradient id="octoBelly" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#d1fae5" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </radialGradient>
          <filter id="octoSoft" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#059669" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* grupo que flota */}
        <g className="octo-float" filter="url(#octoSoft)">
          {/* tentáculos traseros */}
          <g className="octo-legs">
            <path className="leg leg1" d="M62 128 q-22 20 -14 44 q4 12 16 4 q-8 -18 6 -34 z" fill="#0ea371" />
            <path className="leg leg2" d="M80 138 q-10 26 -4 44 q4 10 14 2 q-6 -20 2 -40 z" fill="#12b981" />
            <path className="leg leg3" d="M120 138 q10 26 4 44 q-4 10 -14 2 q6 -20 -2 -40 z" fill="#12b981" />
            <path className="leg leg4" d="M138 128 q22 20 14 44 q-4 12 -16 4 q8 -18 -6 -34 z" fill="#0ea371" />
            <path className="leg leg5" d="M100 146 q0 24 0 40 q0 8 0 8 q0 -22 0 -46 z" fill="#0d9c6f" />
          </g>

          {/* cuerpo / cabeza */}
          <ellipse cx="100" cy="92" rx="64" ry="60" fill="url(#octoBody)" />
          {/* pancita clara */}
          <ellipse cx="100" cy="108" rx="40" ry="34" fill="url(#octoBelly)" opacity="0.75" />

          {/* brillo */}
          <ellipse cx="74" cy="60" rx="16" ry="11" fill="#ffffff" opacity="0.35" />

          {/* cachetes */}
          <circle className="cheek" cx="60" cy="104" r="10" fill="#fb7185" opacity="0.55" />
          <circle className="cheek" cx="140" cy="104" r="10" fill="#fb7185" opacity="0.55" />

          {/* ojos */}
          <g className="octo-eyes">
            {eyesClosed ? (
              <>
                <path d="M64 86 q14 10 28 0" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M108 86 q14 10 28 0" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="78" cy="84" rx="13" ry="15" fill="#ffffff" />
                <ellipse cx="122" cy="84" rx="13" ry="15" fill="#ffffff" />
                <circle className="pupil" cx="80" cy="86" r="7" fill="#0f172a" />
                <circle className="pupil" cx="124" cy="86" r="7" fill="#0f172a" />
                <circle cx="83" cy="83" r="2.4" fill="#ffffff" />
                <circle cx="127" cy="83" r="2.4" fill="#ffffff" />
              </>
            )}
          </g>

          {/* boca */}
          {happy ? (
            <path d="M84 110 q16 16 32 0" stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          ) : mood === 'error' ? (
            <path d="M86 116 q14 -12 28 0" stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M88 112 q12 8 24 0" stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          )}

          {/* brazos que tapan los ojos */}
          <g className={`octo-arms ${hiding ? 'is-hiding' : ''}`}>
            <path className="arm arm-left" d="M46 118 q-20 -8 -22 -30 q-1 -12 10 -12 q10 0 8 12 q-2 16 18 22 z" fill="#10b981" />
            <path className="arm arm-right" d="M154 118 q20 -8 22 -30 q1 -12 -10 -12 q-10 0 -8 12 q2 16 -18 22 z" fill="#10b981" />
          </g>

          {/* estrellitas de éxito */}
          {mood === 'success' && (
            <g className="octo-stars">
              <path d="M40 40 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#fde047" />
              <path d="M162 34 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fde047" />
            </g>
          )}
        </g>
      </svg>

      <style jsx>{`
        .octo { position: relative; display: inline-block; }
        .octo svg { display: block; overflow: visible; }

        .octo-float { transform-origin: 100px 100px; animation: octoFloat 3.6s ease-in-out infinite; }
        @keyframes octoFloat {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50%      { transform: translateY(-8px) rotate(1.5deg); }
        }

        .leg { transform-origin: top center; animation: legSway 2.8s ease-in-out infinite; }
        .leg2 { animation-delay: .15s; } .leg3 { animation-delay: .3s; }
        .leg4 { animation-delay: .45s; } .leg5 { animation-delay: .1s; }
        @keyframes legSway {
          0%, 100% { transform: rotate(-3deg); }
          50%      { transform: rotate(3deg); }
        }

        .pupil { transition: transform .25s ease; }
        .cheek { transition: opacity .3s ease; }

        /* brazos: normalmente abajo, escondidos; cuando se tapa, suben a los ojos */
        .octo-arms .arm { transform-origin: center bottom; opacity: 0; transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .3s ease; }
        .arm-left  { transform: translate(18px, 26px) rotate(35deg); }
        .arm-right { transform: translate(-18px, 26px) rotate(-35deg); }
        .octo-arms.is-hiding .arm { opacity: 1; }
        .octo-arms.is-hiding .arm-left  { transform: translate(30px, -8px) rotate(-8deg); }
        .octo-arms.is-hiding .arm-right { transform: translate(-30px, -8px) rotate(8deg); }

        /* feliz: rebote */
        .octo--happy .octo-float, .octo--success .octo-float { animation: octoBounce 1.4s ease-in-out infinite; }
        @keyframes octoBounce {
          0%, 100% { transform: translateY(0) rotate(0); }
          30%      { transform: translateY(-12px) rotate(-3deg); }
          60%      { transform: translateY(-4px) rotate(3deg); }
        }
        .octo--happy .cheek, .octo--success .cheek { opacity: .8; }

        /* error: temblorcito */
        .octo--error .octo-float { animation: octoShake .4s ease-in-out 2; }
        @keyframes octoShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px) rotate(-2deg); }
          75% { transform: translateX(6px) rotate(2deg); }
        }

        .octo-stars { animation: starsPop .5s ease-out; transform-origin: center; }
        @keyframes starsPop { 0% { opacity: 0; transform: scale(.4); } 100% { opacity: 1; transform: scale(1); } }

        @media (prefers-reduced-motion: reduce) {
          .octo-float, .leg { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
