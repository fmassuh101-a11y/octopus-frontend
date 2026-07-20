'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Sky from '@/components/oct/Sky'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { SEED_LESSONS, ACADEMY_BADGE, getDone, isUnlocked, type Lesson } from '@/lib/academy'
import { Check, Lock, Play, GraduationCap, Trophy } from 'lucide-react'

// Academia Octopus — mapa de islas estilo Duolingo/Candy Crush (dibujadas a mano).
export default function AcademiaPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>(SEED_LESSONS)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDone(getDone())
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
  const OFF = [0, 60, 88, 60, 0, -60, -88, -60]

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky height={220} />
      <div className="relative mx-auto w-full max-w-md px-5 pt-12 md:max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
            <GraduationCap className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Academia Octapi</h1>
            <p className="text-sm text-neutral-600">Aprende y gana más — {completed}/{total} lecciones</p>
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#0891B2] transition-[width] duration-700"
            style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>

        {/* camino de islas */}
        <div className="relative mt-8 flex flex-col items-center">
          {lessons.map((l, i) => {
            const isDone = done.has(l.id)
            const unlocked = isUnlocked(lessons, l.id, done)
            const isCurrent = unlocked && !isDone
            const dx = OFF[i % OFF.length]
            const nextDx = OFF[(i + 1) % OFF.length]
            const state = isDone ? 'done' : unlocked ? 'open' : 'locked'
            return (
              <div key={l.id} className="relative flex w-full flex-col items-center">
                <div style={{ transform: `translateX(${dx}px)` }} className="flex flex-col items-center">
                  {/* chip del título */}
                  <div className={`mb-1.5 rounded-full px-3.5 py-1 text-[13px] font-bold shadow-sm ${
                    isDone ? 'bg-white text-cyan-700' : isCurrent ? 'bg-white text-neutral-900' : 'bg-white/60 text-neutral-400'}`}>
                    {l.title}
                  </div>
                  <Island state={state as any} current={isCurrent}
                    onClick={() => unlocked && router.push(`/creator/academia/${l.id}`)} />
                </div>
                {i < lessons.length - 1 && (
                  <svg width="120" height="44" viewBox="0 0 120 44" className="my-0.5">
                    <path d={`M${60 + dx / 2},2 Q60,22 ${60 + nextDx / 2},42`} fill="none"
                      stroke={isDone ? '#22D3EE' : '#CBD5E1'} strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" />
                  </svg>
                )}
              </div>
            )
          })}

          {/* isla final: insignia */}
          <div className="mt-4 flex flex-col items-center">
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-[28px] shadow-lg ${allDone ? 'bg-gradient-to-br from-amber-300 to-yellow-500' : 'bg-white/70'}`}>
              <Trophy className={`h-11 w-11 ${allDone ? 'text-white drop-shadow' : 'text-neutral-300'}`} />
            </div>
            <p className={`mt-3 text-center text-lg font-extrabold ${allDone ? 'text-amber-600' : 'text-neutral-400'}`}>
              {allDone ? `¡Sos ${ACADEMY_BADGE}!` : `Insignia: ${ACADEMY_BADGE}`}
            </p>
            <p className="text-center text-sm text-neutral-500">
              {allDone ? 'Ya está en tu perfil' : 'Completá todas las islas para ganarla'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Islita dibujada a mano (arena + palmera). Estados: done / open / locked.
function Island({ state, current, onClick }: { state: 'done' | 'open' | 'locked'; current: boolean; onClick: () => void }) {
  const P =
    state === 'locked'
      ? { s1: '#E2E8F0', s2: '#AEB9C7', leaf: '#C2CCD8', water: '#94A3B8', trunk: '#AEB9C7' }
      : { s1: '#FCE9C7', s2: '#E4AA5E', leaf: '#2EC06E', water: '#22D3EE', trunk: '#9B6B3A' }
  const gid = `sand-${state}-${current ? 'c' : 'n'}`
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      animate={current ? { y: [0, -5, 0] } : {}}
      transition={current ? { repeat: Infinity, duration: 1.9, ease: 'easeInOut' } : {}}
      disabled={state === 'locked'}
      className="relative h-[92px] w-[112px] disabled:cursor-default"
      aria-label="Lección"
    >
      {current && <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/25 blur-md" />}
      <svg viewBox="0 0 112 92" className="absolute inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(8,80,110,0.18)]">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.s1} />
            <stop offset="1" stopColor={P.s2} />
          </linearGradient>
        </defs>
        {/* sombra en el agua */}
        <ellipse cx="56" cy="85" rx="38" ry="7" fill={P.water} opacity="0.2" />
        {/* isla de arena */}
        <path d="M18 78 Q25 55 56 54 Q87 55 94 78 Q75 88 56 88 Q37 88 18 78 Z" fill={`url(#${gid})`} />
        <ellipse cx="47" cy="62" rx="16" ry="3.5" fill="#fff" opacity="0.22" />
        {/* tronco */}
        <path d="M57 58 Q52 41 46 31" stroke={P.trunk} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        {/* palmeras (fronds) */}
        <g fill={P.leaf}>
          <path d="M46 31 Q33 22 21 27 Q33 30 47 35 Z" />
          <path d="M46 31 Q39 17 29 13 Q40 21 48 34 Z" />
          <path d="M46 31 Q53 17 65 15 Q53 21 48 34 Z" />
          <path d="M46 31 Q61 23 73 29 Q58 29 48 35 Z" />
          <path d="M46 31 Q47 19 51 11 Q49 21 48 33 Z" />
        </g>
        {/* cocos */}
        <circle cx="44" cy="35" r="2.2" fill={state === 'locked' ? '#9AA6B4' : '#6B4A2A'} />
        <circle cx="49" cy="35" r="2" fill={state === 'locked' ? '#9AA6B4' : '#6B4A2A'} />
      </svg>
      {/* badge de estado */}
      <span className={`absolute bottom-1 right-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white shadow ${
        state === 'done' ? 'bg-cyan-500' : state === 'open' ? 'bg-orange-500' : 'bg-neutral-300'}`}>
        {state === 'done' ? <Check className="h-4 w-4 text-white" strokeWidth={3.4} />
          : state === 'open' ? <Play className="h-3.5 w-3.5 fill-white text-white" />
          : <Lock className="h-3.5 w-3.5 text-white" />}
      </span>
    </motion.button>
  )
}
