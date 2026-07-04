'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO 3D — el modelo real cuelga del login con FÍSICA de péndulo.
//  Pivotea desde arriba (como agarrado del borde), se balancea suave (chill),
//  y cada interacción le da un envión que se amortigua solo. Mira el texto que
//  escribís. En la contraseña mira para otro lado (no espía). Nada 2D.
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
  const state = useRef({ mood, look, impulse: 0 })
  state.current.mood = mood
  state.current.look = look
  const clicks = useRef<number[]>([])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(size, size)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.cursor = interactive ? 'pointer' : 'default'

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6d28d9, 1.5))
    scene.add(new THREE.AmbientLight(0xd8b4fe, 0.5))
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-4, 6, 6); scene.add(key)
    const rim = new THREE.DirectionalLight(0xc4b5fd, 1.3); rim.position.set(5, 2, -4); scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(4, -2, 5); scene.add(fill)

    // swing = pivote arriba (péndulo).  hang baja el modelo.  inner = pose/mirada.
    const swing = new THREE.Group(); scene.add(swing)
    const hang = new THREE.Group(); swing.add(hang)
    const inner = new THREE.Group(); hang.add(inner)

    let loaded = false
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco)
    const file = variant === 'company' ? '/octo/octo-company.glb' : '/octo/octo.glb'
    loader.load(file, (gltf) => {
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const dim = new THREE.Vector3(); box.getSize(dim)
      const center = new THREE.Vector3(); box.getCenter(center)
      const s = 3.7 / Math.max(dim.x, dim.y, dim.z)
      model.scale.setScalar(s)
      model.position.set(-center.x * s, -center.y * s, -center.z * s) // centrado en inner
      inner.add(model)
      const H = dim.y * s
      hang.position.y = -H / 2          // el pivote (swing) queda en la CABEZA
      camera.position.set(0, -H / 2, Math.max(6.5, H * 2.15))
      camera.lookAt(0, -H / 2, 0)
      loaded = true
    }, undefined, () => {})

    // física del péndulo
    let angle = 0, vel = 0
    let prevMood: OctoMood = 'idle'
    // pose interpolada
    const cur = { lean: 0.28, gy: 0, gx: 0, look: 0, shakeAmt: 0 }

    let raf = 0
    const clock = new THREE.Clock()
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    function animate() {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(0.033, clock.getDelta())
      const t = clock.elapsedTime
      const st = state.current
      const m = st.mood

      // impulso al cambiar de estado o al tocarlo
      if (m !== prevMood) {
        if (m === 'happy' || m === 'success') vel += 1.1
        else if (m === 'angry') vel += 2.2
        else if (m === 'hiding') vel -= 0.8
        else vel += 0.5
        prevMood = m
      }
      if (st.impulse) { vel += st.impulse; st.impulse = 0 }

      // brisa suave (chill) — se mece siempre un poquito
      const breeze = Math.sin(t * 0.9) * 0.35 + Math.sin(t * 1.7 + 1) * 0.18
      const angryExtra = m === 'angry' ? Math.sin(t * 22) * 3.2 : 0
      // péndulo: rigidez + amortiguación
      const stiffness = 9, damping = m === 'angry' ? 1.4 : 2.2
      const acc = -stiffness * angle - damping * vel + breeze + angryExtra
      vel += acc * dt
      angle += vel * dt
      angle = Math.max(-0.45, Math.min(0.45, angle))
      swing.rotation.z = angle

      if (loaded) {
        // respira
        const br = 1 + Math.sin(t * 1.9) * 0.02
        inner.scale.set(br, 2 - br, br)
        // pose objetivo según ánimo
        const tgtLean = m === 'error' ? 0.42 : m === 'hiding' ? 0.02 : 0.28
        const tgtLookUp = m === 'hiding' ? -0.55 : 0          // en contraseña mira arriba/otro lado
        const look = st.look
        const tgtGx = m === 'hiding' ? 0.7 : look ? Math.max(-1, Math.min(1, look.x)) * 0.5 : Math.sin(t * 0.5) * 0.12
        const tgtGy = look ? (look.y ?? 0.3) : 0
        cur.lean = lerp(cur.lean, tgtLean, 0.08)
        cur.look = lerp(cur.look, tgtLookUp, 0.08)
        cur.gx = lerp(cur.gx, tgtGx, 0.08)
        cur.gy = lerp(cur.gy, tgtGy, 0.08)
        inner.rotation.x = cur.lean + cur.look        // inclina adelante (asoma) / arriba (no espía)
        inner.rotation.y = cur.gx                     // gira hacia el texto
        inner.rotation.z = -angle * 0.35              // contrarresta un poco el swing (cuerpo flexible)
      }
      renderer.render(scene, camera)
    }
    animate()

    const onClick = () => {
      if (!interactive) return
      const now = Date.now()
      clicks.current = [...clicks.current.filter(x => now - x < 1400), now]
      state.current.impulse = clicks.current.length >= 4 ? 3.0 : 1.4
    }
    renderer.domElement.addEventListener('pointerdown', onClick)

    return () => {
      cancelAnimationFrame(raf)
      renderer.domElement.removeEventListener('pointerdown', onClick)
      renderer.dispose()
      scene.traverse((o) => { const mm = o as THREE.Mesh; if (mm.geometry) mm.geometry.dispose() })
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, variant, interactive])

  return <div ref={mountRef} style={{ width: size, height: size }} aria-hidden />
}
