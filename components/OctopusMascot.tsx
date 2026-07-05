'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// ─────────────────────────────────────────────────────────────────────────
//  OCTO 3D — modelo RIGGED (con huesos). Controlo los tentáculos por código:
//   · idle: los tentáculos ondulan chill (cada uno su ritmo)
//   · email: la cabeza sigue el texto que escribís
//   · contraseña: los 2 tentáculos del frente SUBEN a taparse los ojos (como el oso)
//  Cuelga del login con física de péndulo.
//  Huesos front (tapar ojos): Bone_008 y Bone_014.
// ─────────────────────────────────────────────────────────────────────────
export type OctoMood = 'idle' | 'happy' | 'hiding' | 'success' | 'error' | 'angry'
interface Look { x: number; y: number }

const TENTACLE_ROOTS = ['Bone_008', 'Bone_014', 'Bone_020', 'Bone_026', 'Bone_032', 'Bone_038']
const FRONT = ['Bone_008', 'Bone_014'] // los que tapan los ojos

export default function OctopusMascot({
  mood = 'idle', size = 300, look = null, variant = 'creator', interactive = true,
}: {
  mood?: OctoMood; size?: number; look?: Look | null; variant?: 'creator' | 'company'; interactive?: boolean
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

    const swing = new THREE.Group(); scene.add(swing)   // péndulo (cuelga)
    const hang = new THREE.Group(); swing.add(hang)

    let loaded = false
    const bones = new Map<string, THREE.Bone>()
    const rest = new Map<string, THREE.Quaternion>()
    const qTmp = new THREE.Quaternion()
    const eTmp = new THREE.Euler()
    const setBone = (name: string, rx: number, ry: number, rz: number) => {
      const b = bones.get(name); const r = rest.get(name); if (!b || !r) return
      eTmp.set(rx, ry, rz); qTmp.setFromEuler(eTmp)
      b.quaternion.copy(r).multiply(qTmp)
    }

    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader(); loader.setDRACOLoader(draco)
    const file = variant === 'company' ? '/octo/octo-company.glb' : '/octo/octo.glb'
    loader.load(file, (gltf) => {
      const model = gltf.scene
      model.traverse((o: any) => { if (o.isBone) bones.set(o.name, o as THREE.Bone) })
      bones.forEach((b, n) => rest.set(n, b.quaternion.clone()))

      // encuadrar SOLO la malla (no el esqueleto, que descuadra el bbox)
      let mesh: THREE.Object3D = model
      model.traverse((o: any) => { if (o.isSkinnedMesh || o.isMesh) mesh = o })
      const box = new THREE.Box3().setFromObject(mesh)
      const sphere = box.getBoundingSphere(new THREE.Sphere())
      const R = 1.7
      const s = R / sphere.radius
      model.scale.setScalar(s)
      model.position.set(-sphere.center.x * s, -sphere.center.y * s, -sphere.center.z * s)
      hang.add(model)
      hang.position.y = -R          // el pivote (swing) queda arriba de la cabeza → cuelga
      const fov = (camera.fov * Math.PI) / 180
      const dist = (R / Math.sin(fov / 2)) * 1.55
      camera.position.set(0, -R, dist)
      camera.lookAt(0, -R, 0)
      loaded = true
    }, undefined, () => {})

    let angle = 0, vel = 0
    let prevMood: OctoMood = 'idle'
    const cur = { cover: 0, gx: 0, gy: 0, lean: 0, happy: 0, angry: 0 }
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    let raf = 0
    const clock = new THREE.Clock()
    function animate() {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(0.033, clock.getDelta())
      const t = clock.elapsedTime
      const st = state.current
      const m = st.mood

      if (m !== prevMood) {
        if (m === 'happy' || m === 'success') vel += 0.9
        else if (m === 'angry') vel += 1.8
        else if (m === 'hiding') vel -= 0.5
        prevMood = m
      }
      if (st.impulse) { vel += st.impulse; st.impulse = 0 }

      // péndulo: cuelga y se mece chill
      const breeze = Math.sin(t * 0.9) * 0.3 + Math.sin(t * 1.7 + 1) * 0.15
      const angryExtra = m === 'angry' ? Math.sin(t * 22) * 2.6 : 0
      const acc = -9 * angle - (m === 'angry' ? 1.4 : 2.4) * vel + breeze + angryExtra
      vel += acc * dt
      angle = Math.max(-0.4, Math.min(0.4, angle + vel * dt))
      swing.rotation.z = angle

      // objetivos suaves
      cur.cover = lerp(cur.cover, m === 'hiding' ? 1 : 0, 0.12)
      cur.happy = lerp(cur.happy, (m === 'happy' || m === 'success') ? 1 : 0, 0.1)
      cur.angry = lerp(cur.angry, m === 'angry' ? 1 : 0, 0.1)
      const look = st.look
      cur.gx = lerp(cur.gx, look ? Math.max(-1, Math.min(1, look.x)) : 0, 0.08)
      cur.gy = lerp(cur.gy, look ? (look.y ?? 0.3) : 0, 0.08)

      if (loaded) {
        // tentáculos ondulan (chill) + los del frente tapan los ojos
        TENTACLE_ROOTS.forEach((name, i) => {
          const ph = i * 1.4
          let rx = Math.sin(t * 1.25 + ph) * 0.14
          let rz = Math.cos(t * 1.05 + ph) * 0.12
          if (FRONT.includes(name)) {
            const side = name === 'Bone_008' ? 1 : -1
            rx += cur.cover * (-2.3)           // sube el tentáculo alto, a los ojos
            rz += cur.cover * (1.05 * side)     // lo cierra hacia el centro
          }
          setBone(name, rx, 0, rz)
        })
        // curl de las puntas frontales para tapar los ojos
        setBone('Bone_006', cur.cover * -1.4, 0, 0)
        setBone('Bone_012', cur.cover * -1.4, 0, 0)
        // cabeza sigue el texto
        setBone('Bone_002', 0, cur.gx * 0.5, 0)
        setBone('Bone_040', -cur.gy * 0.2, cur.gx * 0.3, 0)

        // respira
        const br = 1 + Math.sin(t * 1.9) * 0.02
        hang.scale.set(br, 2 - br, br)
        // inclinado hacia adelante (asoma) + temblor de enojo
        hang.rotation.x = 0.1 + cur.angry * Math.sin(t * 40) * 0.02
        hang.rotation.y = cur.angry * Math.sin(t * 38) * 0.03
      }
      renderer.render(scene, camera)
    }
    animate()

    const onClick = () => {
      if (!interactive) return
      const now = Date.now()
      clicks.current = [...clicks.current.filter(x => now - x < 1400), now]
      state.current.impulse = clicks.current.length >= 4 ? 2.6 : 1.2
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
