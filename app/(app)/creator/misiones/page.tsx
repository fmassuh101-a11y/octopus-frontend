'use client'

import { useEffect, useState } from 'react'
import Sky from '@/components/oct/Sky'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { computeXP, getMissions, getLevel } from '@/lib/xp'
import { Check, Lock, Play, Layers, PlayCircle } from 'lucide-react'
import Link from 'next/link'

// Pantalla Misiones — copia del tab de cursos de SideShift:
// header con título + "N módulos · N lecciones", contador, y misiones como
// cards conectadas por línea punteada (verde play = disponible, check = hecha).
export default function MisionesPage() {
  const [input, setInput] = useState({ applications: 0, accepted: 0, completed: 0, hasPhoto: false, hasSocials: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const userStr = localStorage.getItem('sb-user')
        if (!token || !userStr) { setLoading(false); return }
        const user = JSON.parse(userStr)
        const headers = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
        const [pRes, aRes, dRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=profile_photo_url,avatar_url,tiktok,instagram,youtube`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${user.id}&select=id,status`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?creator_id=eq.${user.id}&status=in.(approved,completed)&select=id`, { headers }),
        ])
        const p = pRes.ok ? (await pRes.json())[0] || {} : {}
        const apps = aRes.ok ? await aRes.json() : []
        const deliv = dRes.ok ? await dRes.json() : []
        setInput({
          applications: apps.length,
          accepted: apps.filter((a: any) => a.status === 'accepted' || a.status === 'completed').length,
          completed: deliv.length,
          hasPhoto: !!(p.profile_photo_url || p.avatar_url),
          hasSocials: !!(p.tiktok || p.instagram || p.youtube),
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const missions = getMissions(input)
  const done = missions.filter((m) => m.done).length
  const xp = computeXP(input)
  const { level, next, xpToNext } = getLevel(xp)

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky hue="yellow" />
      <div className="relative mx-auto max-w-md px-5 pt-10">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200/80 shadow-sm">
            <Layers className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex h-12 items-center justify-center rounded-full bg-white px-4 text-sm font-extrabold shadow-sm tabular-nums">
            {done}/{missions.length}
          </div>
        </div>

        <h1 className="mt-6 text-center text-[32px] font-extrabold tracking-tight">Misiones Octopus</h1>
        <p className="mt-1 text-center text-lg text-neutral-500">Completá misiones, ganá XP y subí de liga</p>
        <div className="mt-3 flex items-center justify-center gap-6 text-neutral-600">
          <span className="flex items-center gap-2 font-semibold"><Layers className="h-5 w-5" /> {missions.length} misiones</span>
          <span className="flex items-center gap-2 font-semibold"><PlayCircle className="h-5 w-5" /> {xp.toLocaleString('es-CL')} XP</span>
        </div>

        {next && (
          <div className="mx-auto mt-4 w-fit rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
            {xpToNext.toLocaleString('es-CL')} XP para {next.name}
          </div>
        )}

        <div className="mt-8">
          {(loading ? Array.from({ length: 4 }, (_, i) => null) : missions).map((m: any, i: number) => {
            if (!m) {
              return (
                <div key={i} className="mb-3 h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
              )
            }
            const locked = !m.done && i > 0 && !missions[i - 1].done && !missions.slice(0, i).every((x) => x.done) && i > 2
            return (
              <div key={m.key} className="flex items-stretch gap-4">
                <div className="flex w-11 flex-col items-center">
                  <div className={`mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ${
                    m.done ? 'bg-emerald-500 text-white' : locked ? 'bg-white text-neutral-300' : 'bg-emerald-500 text-white'}`}>
                    {m.done ? <Check className="h-5 w-5" strokeWidth={3} /> : locked ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
                  </div>
                  {i < missions.length - 1 && <div className="my-1 w-px flex-1 border-l-2 border-dashed border-neutral-200" />}
                </div>
                <div className={`mb-3 flex flex-1 items-center gap-3 rounded-3xl border p-5 shadow-sm ${m.done ? 'border-neutral-100 bg-white' : locked ? 'border-neutral-100 bg-white/60' : 'border-neutral-100 bg-white'}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg font-bold leading-snug ${locked ? 'text-neutral-300' : m.done ? 'text-neutral-400' : ''}`}>{m.label}</p>
                    <p className={`mt-0.5 text-sm ${locked ? 'text-neutral-300' : 'text-neutral-500'}`}>{m.desc}</p>
                  </div>
                  <span className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-extrabold tabular-nums ${m.done ? 'bg-emerald-50 text-emerald-500' : locked ? 'bg-neutral-100 text-neutral-300' : 'bg-amber-100 text-amber-600'}`}>
                    +{m.xp} XP
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <Link href="/gigs" prefetch
          className="mt-4 block w-full rounded-full bg-gradient-to-b from-[#66B9F9] to-[#4BA0EF] py-4 text-center text-lg font-bold text-white shadow-lg shadow-sky-200 transition-transform active:scale-[0.98]">
          Explorar campañas
        </Link>
      </div>
    </div>
  )
}
