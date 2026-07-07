'use client'

import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { SEED_LESSONS, type Lesson } from '@/lib/academy'
import { Plus, Trash2, Save, GraduationCap, Video, ArrowUp, ArrowDown } from 'lucide-react'

const ADMIN_EMAIL = 'fmassuh133@gmail.com'

// Panel del admin (Felipe) para gestionar los videos de la Academia.
export default function AdminAcademia() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const headers = () => {
    const token = localStorage.getItem('sb-access-token')
    return { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, Prefer: 'return=representation' }
  }

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('sb-user') || 'null')
      setIsAdmin(u?.email === ADMIN_EMAIL)
    } catch { setIsAdmin(false) }
    load()
  }, [])

  const load = async () => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/academy_lessons?select=*&order=position.asc`, { headers: headers() })
      const rows = r.ok ? await r.json() : []
      setLessons(Array.isArray(rows) && rows.length ? rows : SEED_LESSONS)
    } catch { setLessons(SEED_LESSONS) }
  }

  const setField = (id: string, k: keyof Lesson, v: any) =>
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, [k]: v } : l)))

  const save = async (l: Lesson) => {
    setSaving(l.id)
    try {
      // upsert por id
      await fetch(`${SUPABASE_URL}/rest/v1/academy_lessons?on_conflict=id`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: l.id, position: l.position, title: l.title, subtitle: l.subtitle, video_url: l.video_url || null }),
      })
    } catch {}
    setSaving(null)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Borrar esta lección?')) return
    await fetch(`${SUPABASE_URL}/rest/v1/academy_lessons?id=eq.${id}`, { method: 'DELETE', headers: headers() })
    load()
  }

  const add = () => {
    const nextPos = (lessons[lessons.length - 1]?.position || 0) + 1
    const id = 'l' + Math.random().toString(36).slice(2, 9)
    setLessons((prev) => [...prev, { id, position: nextPos, title: 'Nueva lección', subtitle: '', video_url: null }])
  }

  const move = (id: string, dir: -1 | 1) => {
    setLessons((prev) => {
      const arr = [...prev]
      const i = arr.findIndex((l) => l.id === id)
      const j = i + dir
      if (j < 0 || j >= arr.length) return prev
      const pi = arr[i].position; arr[i].position = arr[j].position; arr[j].position = pi
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  if (isAdmin === false) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-950 text-neutral-400">No autorizado.</div>
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-950 pb-16 text-white">
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-extrabold">Academia — Admin</h1>
            <p className="text-sm text-neutral-400">Agregá, editá y ordená los videos de aprendizaje.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {lessons.map((l, i) => (
            <div key={l.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan-400">Lección {l.position}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(l.id, -1)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => move(l.id, 1)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800" aria-label="Bajar"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => remove(l.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10" aria-label="Borrar"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <input value={l.title} onChange={(e) => setField(l.id, 'title', e.target.value)} placeholder="Título con gancho"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 font-bold text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              <input value={l.subtitle} onChange={(e) => setField(l.id, 'subtitle', e.target.value)} placeholder="Qué aprende (cortito)"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3">
                <Video className="h-4 w-4 shrink-0 text-neutral-500" />
                <input value={l.video_url || ''} onChange={(e) => setField(l.id, 'video_url', e.target.value)} placeholder="URL del video (.mp4 o link)"
                  className="w-full bg-transparent py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none" />
              </div>
              <button onClick={() => save(l)} disabled={saving === l.id}
                className="mt-3 flex items-center gap-2 rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving === l.id ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          ))}
        </div>

        <button onClick={add} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-700 py-4 font-bold text-neutral-300 hover:bg-neutral-900">
          <Plus className="h-5 w-5" /> Agregar lección
        </button>
        <p className="mt-4 text-center text-xs text-neutral-500">Nota: corré ACADEMIA_SETUP.sql en Supabase una vez para crear la tabla.</p>
      </div>
    </div>
  )
}
