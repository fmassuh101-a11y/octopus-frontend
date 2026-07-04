'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO 3D — carga el modelo 3D real (Meshy) y lo trae a la vida en WebGL.
//  Se inclina hacia adelante (asomándose), respira, flota, gira hacia el
//  texto que escribís, y reacciona a cada estado. NADA de dibujos 2D.
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
  const state = useRef({ mood, look, poke: null as null | 'happy' | 'angry', pokeUntil: 0 })
  state.current.mood = mood
  state.current.look = look
  const clicks = useRef<number[]>([])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0.1, 8.5)

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

    // luz pareja y brillosa (para que se vea 3D, no plano)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6d28d9, 1.5))
    scene.add(new THREE.AmbientLight(0xd8b4fe, 0.5))
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-4, 6, 6); scene.add(key)
    const rim = new THREE.DirectionalLight(0xc4b5fd, 1.3); rim.position.set(5, 2, -4); scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(4, -2, 5); scene.add(fill)

    const octo = new THREE.Group()
    scene.add(octo)

    let loaded = false
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco)
    const file = variant === 'company' ? '/octo/octo-company.glb' : '/octo/octo.glb'
    loader.load(file, (gltf) => {
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const dim = new THREE.Vector3(); box.getSize(dim)
      const center = new THREE.Vector3(); box.getCenter(center)
      const s = 4.6 / Math.max(dim.x, dim.y, dim.z)
      model.scale.setScalar(s)
      // centrado horizontal; un poco elevado para que los tentáculos cuelguen abajo
      model.position.set(-center.x * s, -center.y * s + 0.3, -center.z * s)
      octo.add(model)
      loaded = true
    }, undefined, () => { /* si falla, queda vacío (no mostramos nada feo) */ })

    // valores interpolados (fluido)
    const cur = { bounce: 0, shake: 0, cover: 0, red: 0, slump: 0, gx: 0, gy: 0, lean: 0 }
    const tgt = { ...cur }
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    let raf = 0
    const clock = new THREE.Clock()
    function animate() {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const st = state.current
      const poke = st.poke && performance.now() < st.pokeUntil ? st.poke : null
      const m: OctoMood = poke ? poke : st.mood

      tgt.bounce = (m === 'happy' || m === 'success') ? 1 : 0
      tgt.shake = m === 'angry' ? 1 : 0
      tgt.cover = m === 'hiding' ? 1 : 0
      tgt.slump = m === 'error' ? 1 : 0
      tgt.lean = 1 // siempre inclinado hacia adelante (asomándose)
      const look = st.look
      tgt.gx = look ? Math.max(-1, Math.min(1, look.x)) : 0
      tgt.gy = look ? (look.y ?? 0.3) : 0
      for (const k in tgt) (cur as any)[k] = lerp((cur as any)[k], (tgt as any)[k], 0.1)

      if (loaded) {
        // respira (squash & stretch)
        const br = 1 + Math.sin(t * 1.9) * 0.022
        octo.scale.set(br, 2 - br, br)
        // flota + rebota
        octo.position.y = Math.sin(t * 1.15) * 0.09 + cur.bounce * Math.abs(Math.sin(t * 6)) * 0.4 - cur.slump * 0.2
        // INCLINADO hacia adelante (asomándose sobre el login) + se agacha al taparse
        octo.rotation.x = cur.lean * 0.34 + cur.cover * 0.4 + cur.slump * 0.15
        // gira hacia el texto + vaivén vivo + temblor de enojo
        octo.rotation.y = (loaded ? cur.gx * 0.55 : 0) + Math.sin(t * 0.6) * 0.12 + cur.shake * Math.sin(t * 40) * 0.06
        octo.rotation.z = Math.sin(t * 0.8) * 0.03 + cur.shake * Math.sin(t * 46) * 0.05
      }
      renderer.render(scene, camera)
    }
    animate()

    const onClick = () => {
      if (!interactive) return
      const now = Date.now()
      clicks.current = [...clicks.current.filter(x => now - x < 1600), now]
      const angry = clicks.current.length >= 4
      state.current.poke = angry ? 'angry' : 'happy'
      state.current.pokeUntil = performance.now() + (angry ? 1500 : 1200)
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
