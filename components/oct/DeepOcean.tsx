'use client'

import { useEffect, useRef } from 'react'

// Fondo "océano profundo" inmersivo (canvas): rayos de luz cayendo desde la
// superficie + peces nadando + partículas. El vibe 3D de la referencia de
// Felipe, con tecnología propia (nada de videos ajenos). Respeta
// prefers-reduced-motion (queda la escena estática).
export default function DeepOcean() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0, raf = 0
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * DPR; canvas.height = h * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // peces (siluetas cálidas, como la referencia)
    const fishes = Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * 1.2 - 0.1, y: 0.25 + Math.random() * 0.55,
      s: 0.5 + Math.random() * 0.9, v: (0.0006 + Math.random() * 0.0012) * (i % 3 === 0 ? -1 : 1),
      wob: Math.random() * Math.PI * 2, hue: i % 4 === 0 ? 16 : i % 3 === 0 ? 32 : 24,
    }))
    // partículas subiendo
    const parts = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.6, v: 0.0004 + Math.random() * 0.001,
    }))

    const drawFish = (fx: number, fy: number, size: number, dir: number, hue: number, t: number) => {
      ctx.save()
      ctx.translate(fx, fy)
      ctx.scale(dir, 1)
      const tail = Math.sin(t * 6 + fx) * 3 * size
      ctx.fillStyle = `hsla(${hue}, 85%, 60%, 0.85)`
      ctx.beginPath()
      ctx.ellipse(0, 0, 11 * size, 5 * size, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-9 * size, 0)
      ctx.lineTo(-16 * size, -5 * size + tail)
      ctx.lineTo(-16 * size, 5 * size + tail)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.arc(6.5 * size, -1 * size, 1.2 * size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    let t = 0
    const frame = () => {
      t += 0.016
      // fondo: azul profundo con gradiente
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#0a2e42')
      g.addColorStop(0.45, '#072536')
      g.addColorStop(1, '#03141f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // "superficie" arriba con brillo
      const surf = ctx.createLinearGradient(0, 0, 0, h * 0.22)
      surf.addColorStop(0, 'rgba(125, 211, 252, 0.35)')
      surf.addColorStop(1, 'rgba(125, 211, 252, 0)')
      ctx.fillStyle = surf
      ctx.fillRect(0, 0, w, h * 0.22)

      // rayos de luz cayendo (se mecen suave)
      for (let i = 0; i < 5; i++) {
        const cx = w * (0.22 + i * 0.15) + Math.sin(t * 0.3 + i * 1.7) * w * 0.02
        const spread = w * (0.05 + (i % 2) * 0.03)
        const ray = ctx.createLinearGradient(0, 0, 0, h)
        ray.addColorStop(0, `rgba(186, 230, 253, ${0.16 - i * 0.02})`)
        ray.addColorStop(0.75, 'rgba(186, 230, 253, 0)')
        ctx.fillStyle = ray
        ctx.beginPath()
        ctx.moveTo(cx - spread * 0.35, 0)
        ctx.lineTo(cx + spread * 0.35, 0)
        ctx.lineTo(cx + spread * 1.7, h * 0.85)
        ctx.lineTo(cx - spread * 1.7, h * 0.85)
        ctx.closePath()
        ctx.fill()
      }

      // partículas
      ctx.fillStyle = 'rgba(186, 230, 253, 0.35)'
      for (const p of parts) {
        if (!reduced) { p.y -= p.v; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() } }
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.s, 0, Math.PI * 2)
        ctx.fill()
      }

      // peces
      for (const f of fishes) {
        if (!reduced) {
          f.x += f.v
          if (f.v > 0 && f.x > 1.15) f.x = -0.15
          if (f.v < 0 && f.x < -0.15) f.x = 1.15
        }
        const fy = f.y * h + Math.sin(t * 1.2 + f.wob) * 6
        drawFish(f.x * w, fy, f.s, f.v > 0 ? 1 : -1, f.hue, t)
      }

      // piso iluminado
      const floor = ctx.createRadialGradient(w * 0.5, h * 1.05, 10, w * 0.5, h * 1.05, w * 0.6)
      floor.addColorStop(0, 'rgba(125, 211, 252, 0.18)')
      floor.addColorStop(1, 'rgba(125, 211, 252, 0)')
      ctx.fillStyle = floor
      ctx.fillRect(0, h * 0.6, w, h * 0.4)

      if (!reduced) raf = requestAnimationFrame(frame)
    }
    frame()

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
}
