'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { SEED_LESSONS, markDone, getDone, type Lesson } from '@/lib/academy'
import { toast } from '@/components/oct/toast'
import { ChevronLeft, Check, Lock, PlayCircle } from 'lucide-react'

// Reproductor de lección — hay que ver el 80% del video para completar (NO antes).
export default function LessonPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [pct, setPct] = useState(0)          // % visto del video
  const [alreadyDone, setAlreadyDone] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setAlreadyDone(getDone().has(id))
    const seed = SEED_LESSONS.find((l) => l.id === id) || null
    setLesson(seed)
    const token = localStorage.getItem('sb-access-token')
    fetch(`${SUPABASE_URL}/rest/v1/academy_lessons?id=eq.${id}&select=*`, {
      headers: { apikey: SUPABASE_ANON_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (Array.isArray(rows) && rows[0]) setLesson(rows[0]) })
      .catch(() => {})
  }, [id])

  const hasVideo = !!lesson?.video_url
  // OBLIGATORIO ver el 80% de un video real. Sin video no se puede completar.
  const canComplete = alreadyDone || (hasVideo && pct >= 80)

  const onTime = () => {
    const v = videoRef.current
    if (v && v.duration) setPct(Math.floor((v.currentTime / v.duration) * 100))
  }

  const complete = () => {
    if (!canComplete || !lesson) return
    markDone(lesson.id)
    toast('¡Lección completada!')
    router.push('/creator/academia')
  }

  if (!lesson) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#F7FAFD] text-neutral-400">Cargando…</div>
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] pb-32 text-neutral-900">
      <div className="mx-auto w-full max-w-md px-5 pt-6 md:max-w-lg">
        <button onClick={() => router.push('/creator/academia')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-90" aria-label="Volver">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <p className="mt-5 text-sm font-bold uppercase tracking-wide text-cyan-600">Lección {lesson.position}</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{lesson.title}</h1>
        <p className="mt-1 text-neutral-500">{lesson.subtitle}</p>

        {/* video o placeholder */}
        <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-100 bg-black shadow-sm">
          {hasVideo ? (
            <video ref={videoRef} src={lesson.video_url!} controls playsInline onTimeUpdate={onTime}
              className="aspect-video w-full bg-black" />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center bg-gradient-to-br from-cyan-500 to-teal-700 text-white">
              <PlayCircle className="h-14 w-14 opacity-90" />
              <p className="mt-3 font-bold">Video en preparación</p>
              <p className="text-sm text-white/80">Pronto vas a poder verlo acá</p>
            </div>
          )}
        </div>

        {/* progreso del video */}
        {hasVideo && !alreadyDone && (
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#0891B2] transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {pct >= 80 ? '¡Listo! Ya puedes completar la lección.' : `Mira al menos el 80% para completar (${pct}%)`}
            </p>
          </div>
        )}

        {/* CTA completar */}
        <button onClick={complete} disabled={!canComplete}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold transition-transform active:scale-[0.98] ${
            canComplete ? 'bg-gradient-to-b from-[#22D3EE] to-[#0891B2] text-white shadow-lg shadow-cyan-200'
            : 'bg-neutral-200 text-neutral-400'}`}>
          {alreadyDone ? <><Check className="h-5 w-5" /> Ya completada</>
            : canComplete ? <><Check className="h-5 w-5" /> Completar lección</>
            : !hasVideo ? <><Lock className="h-5 w-5" /> Video en preparación</>
            : <><Lock className="h-5 w-5" /> Mirá el 80% para continuar</>}
        </button>
      </div>
    </div>
  )
}
