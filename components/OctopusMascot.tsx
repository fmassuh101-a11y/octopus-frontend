'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO 3D — pulpo generado en tiempo real con WebGL (Three.js).
//  Volumen, luz, materiales brillosos estilo Pixar. SIEMPRE vivo: respira,
//  flota, los tentáculos ondulan. Reacciona fluido a lo que hace el usuario:
//   · sigue con la mirada lo que escribís (side-eye)
//   · se tapa los ojos con los tentáculos en la contraseña
//   · feliz / enojado / triste con movimientos reales (no "bot")
//  Se puede tocar con el mouse.
// ─────────────────────────────────────────────────────────────────────────
export type OctoMood = 'idle' | 'happy' | 'hiding' | 'success' | 'error' | 'angry'

interface Look { x: number; y: number }

export default function OctopusMascot({
  mood = 'idle',
  size = 300,
  look = null,
  variant = 'creator',
  interactive = true,
}: {
  mood?: OctoMood
  size?: number
  look?: Look | null
  variant?: 'creator' | 'company'
  interactive?: boolean
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  // estado leído por el loop de animación (sin re-montar la escena)
  const state = useRef({ mood, look: null as Look | null, poke: null as null | 'happy' | 'angry', pokeUntil: 0 })
  state.current.mood = mood
  state.current.look = look

  const clicks = useRef<number[]>([])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Escena ──────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0.15, 8.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(size, size)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    mount.appendChild(renderer.domElement)

    // ── Luces (para el look 3D brilloso) ────────────────────
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4c1d95, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(-4, 6, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xa78bfa, 1.6)
    rim.position.set(5, 3, -4)
    scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffffff, 0.6)
    fill.position.set(5, -2, 4)
    scene.add(fill)

    // ── Materiales ──────────────────────────────────────────
    const bodyColor = variant === 'company' ? 0x6d28d9 : 0x7c3aed
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: bodyColor, roughness: 0.42, metalness: 0.0,
      clearcoat: 0.8, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color(0xc4b5fd),
    })
    const bodyBase = new THREE.Color(bodyColor)
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.5 })
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6, transparent: true, opacity: 0.5 })

    // ── Grupo raíz ──────────────────────────────────────────
    const octo = new THREE.Group()
    scene.add(octo)

    // Cabeza (mantle) por revolución — forma de gota
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.02, 1.55), new THREE.Vector2(0.28, 1.42), new THREE.Vector2(0.6, 1.18),
      new THREE.Vector2(0.86, 0.75), new THREE.Vector2(1.0, 0.28), new THREE.Vector2(1.04, -0.18),
      new THREE.Vector2(0.94, -0.62), new THREE.Vector2(0.66, -0.95), new THREE.Vector2(0.32, -1.12),
      new THREE.Vector2(0.0, -1.16),
    ]
    const head = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), bodyMat)
    head.scale.set(1.18, 1.15, 1.05)
    octo.add(head)

    // ── Tentáculo con forma cónica (tapered tube) ───────────
    function taperedTube(points: THREE.Vector3[], baseR: number, segs = 34, radial = 12) {
      const curve = new THREE.CatmullRomCurve3(points)
      const frames = curve.computeFrenetFrames(segs, false)
      const pos: number[] = [], nor: number[] = [], idx: number[] = []
      const P = new THREE.Vector3()
      for (let i = 0; i <= segs; i++) {
        const t = i / segs
        curve.getPointAt(t, P)
        const N = frames.normals[i], B = frames.binormals[i]
        const r = baseR * (1 - t * 0.82) // se afina hacia la punta
        for (let j = 0; j <= radial; j++) {
          const a = (j / radial) * Math.PI * 2
          const nx = Math.cos(a), ny = Math.sin(a)
          const normal = new THREE.Vector3().addScaledVector(N, nx).addScaledVector(B, ny).normalize()
          pos.push(P.x + normal.x * r, P.y + normal.y * r, P.z + normal.z * r)
          nor.push(normal.x, normal.y, normal.z)
        }
      }
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < radial; j++) {
          const a = i * (radial + 1) + j, b = a + radial + 1
          idx.push(a, b, b + 1, a, b + 1, a + 1)
        }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
      g.setIndex(idx)
      return g
    }

    // 8 tentáculos alrededor de la base
    const tentacles: THREE.Group[] = []
    const NT = 8
    for (let i = 0; i < NT; i++) {
      const ang = (i / NT) * Math.PI * 2
      const front = Math.cos(ang) > 0.15 && Math.abs(Math.sin(ang)) < 0.9 // los del frente se pueden levantar
      const dirX = Math.sin(ang), dirZ = Math.cos(ang)
      const baseX = dirX * 0.55, baseZ = dirZ * 0.55
      const outX = dirX * 1.5, outZ = dirZ * 1.5
      // curva: baja desde la base, se abre, y la punta se enrosca hacia arriba
      const pts = [
        new THREE.Vector3(baseX, -0.85, baseZ),
        new THREE.Vector3(baseX * 1.4, -1.55, baseZ * 1.4),
        new THREE.Vector3(outX, -2.05, outZ),
        new THREE.Vector3(outX * 1.15, -1.5, outZ * 1.15),
        new THREE.Vector3(outX * 1.05, -1.0, outZ * 1.05),
      ]
      const pivot = new THREE.Group()
      const mesh = new THREE.Mesh(taperedTube(pts, 0.3), bodyMat)
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), bodyMat)
      tip.position.copy(pts[pts.length - 1])
      pivot.add(mesh); pivot.add(tip)
      pivot.userData = { ang, front, phase: i * 0.7, baseX, baseZ }
      octo.add(pivot)
      tentacles.push(pivot)
    }

    // ── Cara ────────────────────────────────────────────────
    const face = new THREE.Group()
    face.position.set(0, 0.12, 1.02)
    octo.add(face)

    function makeEye(x: number) {
      const g = new THREE.Group()
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), whiteMat)
      sclera.scale.set(1, 1.15, 0.7)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), darkMat)
      pupil.position.z = 0.2
      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), whiteMat)
      hi.position.set(0.06, 0.07, 0.32)
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), bodyMat)
      lid.scale.set(1, 1.15, 0.75); lid.rotation.x = -0.2; lid.visible = false
      g.add(sclera); g.add(pupil); g.add(hi); g.add(lid)
      g.position.set(x, 0, 0)
      g.userData = { pupil, lid, hi }
      face.add(g)
      return g
    }
    const eyeL = makeEye(-0.42)
    const eyeR = makeEye(0.42)

    // Cejas
    function makeBrow(x: number, flip: number) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.28, 4, 8), darkMat)
      b.rotation.z = flip * 0.15
      b.position.set(x, 0.34, 0.18)
      face.add(b)
      return b
    }
    const browL = makeBrow(-0.42, 1)
    const browR = makeBrow(0.42, -1)

    // Boca (arco) — la deformamos por ánimo cambiando escala/rotación
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 10, 24, Math.PI), darkMat)
    mouth.position.set(0, -0.28, 0.16)
    mouth.rotation.z = Math.PI // sonrisa (arco hacia arriba)
    face.add(mouth)

    // Cachetes
    const cheekL = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), cheekMat)
    cheekL.position.set(-0.5, -0.12, 0.24); face.add(cheekL)
    const cheekR = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), cheekMat)
    cheekR.position.set(0.5, -0.12, 0.24); face.add(cheekR)

    // Lágrima (para triste)
    const tear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1, transparent: true, opacity: 0 }))
    tear.scale.set(1, 1.5, 1); tear.position.set(-0.42, -0.2, 0.28); face.add(tear)

    // Moñito (empresa)
    if (variant === 'company') {
      const bow = new THREE.Group()
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }))
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 16), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }))
      const wingL = wing.clone(); wingL.rotation.z = Math.PI / 2; wingL.position.x = -0.18
      const wingR = wing.clone(); wingR.rotation.z = -Math.PI / 2; wingR.position.x = 0.18
      bow.add(knot); bow.add(wingL); bow.add(wingR)
      bow.position.set(0, -0.95, 0.95); bow.scale.set(0.9, 0.9, 0.9)
      octo.add(bow)
    }

    // ── Valores animados (se interpolan → fluido, no "bot") ──
    const cur = { bounce: 0, shake: 0, cover: 0, brow: 0, red: 0, tearO: 0, smile: 1, gx: 0, gy: 0, slump: 0 }
    const tgt = { ...cur }

    // ── Loop ────────────────────────────────────────────────
    let raf = 0
    const clock = new THREE.Clock()
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    function animate() {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const st = state.current
      const poke = st.poke && performance.now() < st.pokeUntil ? st.poke : null
      const m: OctoMood = poke ? poke : st.mood

      // objetivos por ánimo
      tgt.bounce = (m === 'happy' || m === 'success') ? 1 : 0
      tgt.shake = m === 'angry' ? 1 : 0
      tgt.cover = m === 'hiding' ? 1 : 0
      tgt.red = m === 'angry' ? 1 : 0
      tgt.tearO = m === 'error' ? 1 : 0
      tgt.slump = m === 'error' ? 1 : 0
      tgt.brow = m === 'angry' ? -1 : m === 'error' ? 1 : 0
      tgt.smile = (m === 'angry' || m === 'error') ? -1 : (m === 'happy' || m === 'success') ? 1.4 : 1
      // mirada: sigue el texto (look) o queda al centro
      const look = st.look
      tgt.gx = m === 'hiding' ? 0 : look ? Math.max(-1, Math.min(1, look.x)) : 0
      tgt.gy = m === 'hiding' ? 0 : look ? (look.y ?? 0.3) : (m === 'error' ? 0.5 : m === 'happy' ? -0.3 : 0)

      const k = 0.12
      for (const key in tgt) (cur as any)[key] = lerp((cur as any)[key], (tgt as any)[key], k)

      // respira + flota SIEMPRE
      const breathe = 1 + Math.sin(t * 1.9) * 0.02
      octo.scale.set(breathe, 2 - breathe, breathe)
      octo.position.y = Math.sin(t * 1.2) * 0.08 + cur.bounce * Math.abs(Math.sin(t * 6)) * 0.35 - cur.slump * 0.18
      octo.rotation.z = Math.sin(t * 0.8) * 0.03 + cur.shake * Math.sin(t * 45) * 0.06
      octo.rotation.x = cur.slump * 0.12
      octo.rotation.y = cur.shake * Math.sin(t * 40) * 0.04

      // tentáculos ondulan; los del frente se levantan a tapar los ojos
      for (const p of tentacles) {
        const u = p.userData as any
        const wave = Math.sin(t * 2 + u.phase) * 0.12
        p.rotation.x = wave + (u.front ? cur.cover * -1.15 : 0) + cur.slump * 0.15
        p.rotation.z = Math.cos(t * 1.7 + u.phase) * 0.08 * u.baseX * 2
        if (u.front) p.rotation.y = cur.cover * (u.baseX > 0 ? -0.5 : 0.5)
      }

      // ojos: pupilas siguen la mirada; se cierran al taparse
      for (const eye of [eyeL, eyeR]) {
        const ud = eye.userData as any
        ud.pupil.position.x = cur.gx * 0.09
        ud.pupil.position.y = cur.gy * -0.08
        ud.hi.position.x = 0.06 + cur.gx * 0.09
        ud.hi.position.y = 0.07 + cur.gy * -0.08
        const closed = cur.cover > 0.5
        ud.lid.visible = closed
        ud.pupil.visible = !closed
        ud.hi.visible = !closed
      }

      // cejas
      browL.position.y = 0.34 - cur.brow * 0.06; browL.rotation.z = 0.15 + cur.brow * 0.4
      browR.position.y = 0.34 - cur.brow * 0.06; browR.rotation.z = -0.15 - cur.brow * 0.4

      // boca: sonrisa/enojo (invierte el arco)
      mouth.scale.y = cur.smile >= 0 ? 1 : -1
      mouth.scale.x = 1 + (cur.smile > 1 ? (cur.smile - 1) * 0.5 : 0)

      // color de enojo (se pone rojizo) + cachetes
      bodyMat.color.copy(bodyBase).lerp(new THREE.Color(0xdc2626), cur.red * 0.35)
      cheekMat.opacity = 0.5 + (cur.bounce + cur.red) * 0.3

      // lágrima
      ;(tear.material as THREE.MeshStandardMaterial).opacity = cur.tearO
      tear.position.y = -0.2 - (Math.sin(t * 2) * 0.5 + 0.5) * cur.tearO * 0.15

      renderer.render(scene, camera)
    }
    animate()

    // ── Interacción: tocar ──────────────────────────────────
    const onClick = () => {
      if (!interactive) return
      const now = Date.now()
      clicks.current = [...clicks.current.filter(x => now - x < 1600), now]
      const angry = clicks.current.length >= 4
      state.current.poke = angry ? 'angry' : 'happy'
      state.current.pokeUntil = performance.now() + (angry ? 1600 : 1200)
    }
    renderer.domElement.addEventListener('pointerdown', onClick)
    renderer.domElement.style.cursor = interactive ? 'pointer' : 'default'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf)
      renderer.domElement.removeEventListener('pointerdown', onClick)
      renderer.dispose()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
      })
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, variant, interactive])

  return <div ref={mountRef} style={{ width: size, height: size }} aria-hidden />
}
