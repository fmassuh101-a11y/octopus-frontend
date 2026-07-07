'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Sky from '@/components/oct/Sky'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { SEED_LESSONS, ACADEMY_BADGE, getDone, isUnlocked, type Lesson } from '@/lib/academy'
import { Check, Lock, Play, GraduationCap, Trophy } from 'lucide-react'

// Academia Octopus — mapa de islas estilo Duolingo/Candy Crush.
// Cada isla es una lección con video; se desbloquea al completar la anterior.
export default function AcademiaPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>(SEED_LESSONS)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDone(getDone())
    // traer lecciones del admin (si la tabla existe); si no, queda el SEED
    const token = localStorage.getItem('sb-access-token')
    fetch(`${SUPABASE_URL}/rest/v1/academy_lessons?select=*&order=position.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (Array.isArray(rows) && rows.length) setLessons(rows) })
      .catch(() => {})
  }, [])

  const total = lessons.length
  const completed = lessons.filter((l) => done.has(l.id)).length
  const allDone = completed === total && total > 0
  // offset horizontal serpenteante (como Duolingo)
  const OFF = [0, 62, 90, 62, 0, -62, -90, -62]

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky height={230} />
      <div className="relative mx-auto w-full max-w-md px-5 pt-12 md:max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
            <GraduationCap className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Academia Octopus</h1>
            <p className="text-sm text-neutral-600">Aprendé y ganá más — {completed}/{total} lecciones</p>
          </div>
        </div>

        {/* barra de progreso general */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#0891B2] transition-[width] duration-700"
            style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>

        {/* camino de islas */}
        <div className="relative mt-10 flex flex-col items-center gap-6">
          {lessons.map((l, i) => {
            const isDone = done.has(l.id)
            const unlocked = isUnlocked(lessons, l.id, done)
            const isCurrent = unlocked && !isDone
            const dx = OFF[i % OFF.length]
            const nextDx = OFF[(i + 1) % OFF.length]
            return (
              <div key={l.id} className="relative flex w-full flex-col items-center">
                <div style={{ transform: `translateX(${dx}px)` }} className="relative">
                  {/* etiqueta de la lección */}
                  <div className="pointer-events-none absolute left-1/2 top-[-14px] w-44 -translate-x-1/2 text-center">
                    <p className={`truncate text-[13px] font-bold ${isDone ? 'text-cyan-700' : isCurrent ? 'text-neutral-900' : 'text-neutral-400'}`}>{l.title}</p>
                  </div>
                  <Island idx={i} state={isDone ? 'done' : unlocked ? 'open' : 'locked'}
                    onClick={() => unlocked && router.push(`/creator/academia/${l.id}`)} current={isCurrent} />
                </div>
                {/* conector serpenteante hacia la siguiente */}
                {i < lessons.length - 1 && (
                  <svg width="120" height="46" viewBox="0 0 120 46" className="my-1">
                    <path d={`M${60 + dx / 2},2 Q60,24 ${60 + nextDx / 2},44`} fill="none"
                      stroke={isDone ? '#22D3EE' : '#CBD5E1'} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" />
                  </svg>
                )}
              </div>
            )
          })}

          {/* isla final: insignia */}
          <div className="mt-2 flex flex-col items-center">
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg ${allDone ? 'bg-gradient-to-br from-amber-300 to-yellow-500' : 'bg-neutral-200'}`}>
              <Trophy className={`h-11 w-11 ${allDone ? 'text-white drop-shadow' : 'text-neutral-400'}`} />
            </div>
            <p className={`mt-3 text-center text-lg font-extrabold ${allDone ? 'text-amber-600' : 'text-neutral-400'}`}>
              {allDone ? `¡Sos ${ACADEMY_BADGE}!` : `Insignia: ${ACADEMY_BADGE}`}
            </p>
            <p className="text-center text-sm text-neutral-500">
              {allDone ? 'La insignia ya está en tu perfil' : 'Completá todas las islas para ganarla'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Isla-botón con relieve (SVG): arena + palmera, olitas alrededor.
function Island({ idx, state, current, onClick }: { idx: number; state: 'done' | 'open' | 'locked'; current: boolean; onClick: () => void }) {
  const base =
    state === 'done' ? 'from-[#22D3EE] to-[#0891B2]'
    : state === 'open' ? 'from-amber-300 to-orange-400'
    : 'from-neutral-200 to-neutral-300'
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={current ? { y: [0, -5, 0] } : {}}
      transition={current ? { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : {}}
      className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full disabled:cursor-default"
      disabled={state === 'locked'}
      aria-label={`Lección ${idx + 1}`}
    >
      {/* sombra en el agua */}
      <span className="absolute -bottom-1 h-3 w-16 rounded-[50%] bg-black/10 blur-[2px]" />
      {/* disco isla */}
      <span className={`absolute inset-0 rounded-full bg-gradient-to-b ${base} shadow-md`} />
      <span className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/50 via-transparent to-transparent" />
      {/* halo del actual */}
      {current && <span className="absolute -inset-1.5 rounded-full ring-4 ring-amber-300/50" />}
      {/* contenido */}
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-inner">
        {state === 'done' ? <Check className="h-5 w-5 text-cyan-600" strokeWidth={3.2} />
          : state === 'locked' ? <Lock className="h-4 w-4 text-neutral-400" />
          : <Play className="h-4 w-4 fill-orange-500 text-orange-500" />}
      </span>
    </motion.button>
  )
}
