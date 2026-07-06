'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sky from '@/components/oct/Sky'
import { Flame, X } from 'lucide-react'

// Pantalla de racha — copia de la pantalla de streak de SideShift:
// cielo naranja, flama, "N day streak", semana, desafío y milestones con XP.
const MILESTONES = [
  { days: 7, xp: 50 },
  { days: 14, xp: 100 },
  { days: 30, xp: 250 },
  { days: 60, xp: 500 },
  { days: 90, xp: 1000 },
]
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

export default function RachaPage() {
  const router = useRouter()
  const [streak, setStreak] = useState(1)
  const [started, setStarted] = useState<string | null>(null)
  const [record, setRecord] = useState(1)

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('oct-streak') || '{}')
      setStreak(raw.count || 1)
      setRecord(Math.max(raw.record || 0, raw.count || 1))
      const start = new Date(Date.now() - ((raw.count || 1) - 1) * 864e5)
      setStarted(start.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }))
      localStorage.setItem('oct-streak', JSON.stringify({ ...raw, record: Math.max(raw.record || 0, raw.count || 1) }))
    } catch {}
  }, [])

  const todayIdx = new Date().getDay()
  const nextMilestone = MILESTONES.find((m) => m.days > streak) || MILESTONES[MILESTONES.length - 1]

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky hue="warm" />
      <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-4">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/dashboard'))}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/90 shadow-sm transition-transform active:scale-90" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>

        {/* flama con carita dibujada (sin emoji) */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex h-32 w-32 items-center justify-center drop-shadow-lg">
            <Flame className="h-28 w-28 fill-orange-500 text-orange-500" />
            <svg className="absolute" width="30" height="22" viewBox="0 0 30 22" style={{ bottom: 34 }} fill="none">
              <circle cx="9" cy="7" r="2.2" fill="#c2410c" />
              <circle cx="21" cy="7" r="2.2" fill="#c2410c" />
              <path d="M8 13 Q15 19 22 13" stroke="#c2410c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <p className="mt-4 text-[64px] font-extrabold leading-none text-orange-500 tabular-nums">{streak}</p>
          <p className="mt-1 text-xl font-bold text-orange-500">{streak === 1 ? 'día de racha' : 'días de racha'}</p>
        </div>

        {/* semana */}
        <div className="mt-8 flex justify-between gap-1.5">
          {DAYS.map((d, i) => {
            const hit = i <= todayIdx && i > todayIdx - streak
            return (
              <div key={d} className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border py-3 ${hit ? 'border-orange-300 bg-white' : 'border-neutral-200/70 bg-white/70'}`}>
                <span className={`text-sm font-bold ${hit ? 'text-orange-500' : 'text-neutral-400'}`}>{d}</span>
                {hit ? (
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <Flame className="h-7 w-7 fill-orange-500 text-orange-500" />
                  </span>
                ) : (
                  <span className="h-7 w-7 rounded-full bg-neutral-100" />
                )}
              </div>
            )
          })}
        </div>

        {/* desafío */}
        <h2 className="mt-9 text-2xl font-extrabold tracking-tight">Desafío de racha</h2>
        <div className="mt-3 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">Desafío de {nextMilestone.days} días</p>
            <p className="text-neutral-500">Día {Math.min(streak, nextMilestone.days)} de {nextMilestone.days}</p>
          </div>
          <div className="mt-4 flex items-center">
            <div className="h-5 w-5 rounded-full bg-orange-500" />
            <div className="h-2 flex-1 rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, (streak / nextMilestone.days) * 100)}%` }} />
            </div>
            {[7, 14, 30].map((d) => (
              <div key={d} className="-ml-1 flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold ${streak >= d ? 'border-orange-400 bg-orange-100 text-orange-600' : 'border-neutral-200 bg-white text-neutral-400'}`}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 divide-x divide-neutral-100 rounded-3xl border border-neutral-100 bg-white p-5 text-center shadow-sm">
          <div>
            <p className="text-lg font-extrabold">{started || '—'}</p>
            <p className="text-sm text-neutral-500">Inicio de racha</p>
          </div>
          <div>
            <p className="text-lg font-extrabold tabular-nums">{record} {record === 1 ? 'día' : 'días'}</p>
            <p className="text-sm text-neutral-500">Récord de racha</p>
          </div>
        </div>

        {/* milestones */}
        <h2 className="mt-9 text-2xl font-extrabold tracking-tight">Hitos de racha</h2>
        <div className="mt-4">
          {MILESTONES.map((m, i) => {
            const next = m.days === nextMilestone.days
            return (
              <div key={m.days} className="flex items-stretch gap-4">
                <div className="flex w-12 flex-col items-center">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${streak >= m.days ? 'border-orange-400 bg-orange-100 text-orange-600' : 'border-neutral-200 bg-white text-neutral-400'}`}>
                    {m.days}
                  </div>
                  {i < MILESTONES.length - 1 && <div className="my-1 w-px flex-1 border-l-2 border-dashed border-neutral-200" />}
                </div>
                <div className={`mb-3 flex flex-1 items-center justify-between rounded-2xl border px-5 py-4 ${next ? 'border-orange-300 bg-orange-50/60' : 'border-neutral-100 bg-white'} shadow-sm`}>
                  <p className="font-bold">{m.days} días de racha</p>
                  <p className="font-extrabold text-neutral-700 tabular-nums">+{m.xp.toLocaleString('es-CL')} XP</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
