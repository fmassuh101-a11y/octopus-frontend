'use client'

import { useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO — usa la IMAGEN 3D real (la que Felipe hizo con Gemini) y le da vida
//  con movimientos reales por cada emoción. NO es un dibujo SVG.
//
//  Poné tus PNG (fondo transparente) en  frontend/public/octo/ :
//    idle.png     ← base, obligatorio (Octo tranquilo)
//    happy.png    ← sonriendo (opcional; si no está, usa idle)
//    hiding.png   ← tapándose los ojos con los tentáculos (opcional)
//    angry.png    ← enojado (opcional)
//    sad.png      ← triste (opcional)
//  Para la versión empresa (con traje): idle-company.png, etc. (opcional)
//
//  Cada emoción, además de la pose, tiene su PROPIO movimiento:
//    idle=flota+respira · happy=salta+se menea · angry=tiembla fuerte+brillo rojo
//    hiding=se agacha · success=brinca · error=se cae de ánimo
// ─────────────────────────────────────────────────────────────────────────
export type OctoMood = 'idle' | 'happy' | 'hiding' | 'success' | 'error' | 'angry'

const POSE: Record<OctoMood, string> = {
  idle: 'idle', happy: 'happy', success: 'happy', hiding: 'hiding', error: 'sad', angry: 'angry',
}

export default function OctopusMascot({
  mood = 'idle',
  size = 240,
  variant = 'creator',
  interactive = true,
}: {
  mood?: OctoMood
  size?: number
  look?: { x: number; y: number } | null
  variant?: 'creator' | 'company'
  interactive?: boolean
}) {
  const [play, setPlay] = useState<OctoMood | null>(null)
  const [broken, setBroken] = useState(false)
  const clicks = useRef<number[]>([])
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const eff: OctoMood = mood !== 'idle' ? mood : (play ?? 'idle')
  const suffix = variant === 'company' ? '-company' : ''
  const src = `/octo/${POSE[eff]}${suffix}.png`

  const poke = () => {
    if (!interactive) return
    const now = Date.now()
    clicks.current = [...clicks.current.filter(t => now - t < 1600), now]
    const angry = clicks.current.length >= 4
    setPlay(angry ? 'angry' : 'happy')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPlay(null), angry ? 1500 : 1200)
  }

  if (broken) {
    // Si todavía no hay imagen, no mostramos nada roto (queda limpio).
    return <div aria-hidden style={{ width: size, height: size }} />
  }

  return (
    <div
      className={`octo octo--${eff} ${interactive ? 'octo--poke' : ''}`}
      style={{ width: size, height: size }}
      onClick={poke}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? 'Octo, la mascota (tocala)' : 'Octo'}
    >
      <div className="octo-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="octo-img"
          src={src}
          alt="Octo"
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget
            if (el.src.includes('/octo/idle.png')) setBroken(true)
            else el.src = `/octo/idle${suffix}.png`
          }}
        />
        <div className="octo-floor" />
      </div>

      <style jsx>{`
        .octo { position: relative; display: inline-block; user-select: none; }
        .octo--poke { cursor: pointer; }
        .octo-stage {
          position: relative; width: 100%; height: 100%;
          display: flex; align-items: flex-end; justify-content: center;
          transform-origin: 50% 90%;
          animation: floatStage 4.2s ease-in-out infinite;
          will-change: transform;
        }
        .octo-img {
          width: 92%; height: auto; max-height: 100%; object-fit: contain;
          transform-origin: 50% 85%;
          filter: drop-shadow(0 14px 16px rgba(4,47,32,0.45));
          animation: breathe 2.9s ease-in-out infinite;
          will-change: transform, filter;
        }
        .octo-floor {
          position: absolute; bottom: 2%; left: 50%; width: 46%; height: 8%;
          transform: translateX(-50%);
          background: radial-gradient(closest-side, rgba(4,47,32,0.5), rgba(4,47,32,0));
          animation: floor 4.2s ease-in-out infinite;
        }

        @keyframes floatStage { 0%,100% { transform: translateY(2px) rotate(-1.5deg); } 50% { transform: translateY(-9px) rotate(1.5deg); } }
        @keyframes breathe    { 0%,100% { transform: scale(1,1); }                       50% { transform: scale(1.03,0.97); } }
        @keyframes floor      { 0%,100% { transform: translateX(-50%) scaleX(1); opacity: .5; } 50% { transform: translateX(-50%) scaleX(.8); opacity: .35; } }

        /* FELIZ / CELEBRA — salta y se menea */
        .octo--happy .octo-stage, .octo--success .octo-stage { animation: jump 1.15s cubic-bezier(.34,1.56,.64,1) infinite; }
        .octo--happy .octo-img,   .octo--success .octo-img   { animation: wiggle 0.7s ease-in-out infinite; }
        @keyframes jump   { 0%,100% { transform: translateY(2px); } 40% { transform: translateY(-24px) scaleY(1.02); } 55% { transform: translateY(-24px); } 75% { transform: translateY(0) scaleY(.94); } }
        @keyframes wiggle { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }

        /* ENOJADO — tiembla fuerte + brillo rojo + se sacude */
        .octo--angry .octo-stage { animation: angryHop .5s ease-in-out infinite; }
        .octo--angry .octo-img   { animation: angryShake .09s linear infinite; filter: drop-shadow(0 14px 16px rgba(4,47,32,.45)) drop-shadow(0 0 10px rgba(239,68,68,.75)) saturate(1.25); }
        @keyframes angryShake { 0%,100% { transform: translateX(-2.5px) rotate(-1.5deg); } 50% { transform: translateX(2.5px) rotate(1.5deg); } }
        @keyframes angryHop   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        /* TAPÁNDOSE / VERGÜENZA — se agacha un poco */
        .octo--hiding .octo-stage { animation: duck .5s cubic-bezier(.34,1.4,.64,1) forwards; }
        @keyframes duck { to { transform: translateY(10px) scale(.96); } }

        /* TRISTE / ERROR — se cae de ánimo y tiembla */
        .octo--error .octo-stage { animation: droop .5s ease forwards; }
        .octo--error .octo-img   { animation: sadShiver .5s ease-in-out 2; }
        @keyframes droop     { to { transform: translateY(8px) rotate(-2deg); } }
        @keyframes sadShiver { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

        @media (prefers-reduced-motion: reduce) {
          .octo-stage, .octo-img, .octo-floor { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
