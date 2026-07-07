'use client'

import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { SEED_LESSONS, type Lesson } from '@/lib/academy'
import { Plus, Trash2, Save, GraduationCap, Upload, ArrowUp, ArrowDown, Loader2, X, ArrowLeft } from 'lucide-react'

const ADMIN_EMAIL = 'fmassuh133@gmail.com'

// Panel del admin (Felipe) para gestionar los videos de la Academia.
export default function AdminAcademia() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

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

  // subir el archivo de video a Supabase Storage (bucket 'academy') y guardar la URL
  const upload = async (l: Lesson, file: File) => {
    setUploading(l.id)
    try {
      const token = localStorage.getItem('sb-access-token')
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
      const path = `${l.id}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/academy/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'true' },
        body: file,
      })
      if (!res.ok) { alert('No se pudo subir el video. ¿Corriste el SQL del bucket?'); setUploading(null); return }
      const url = `${SUPABASE_URL}/storage/v1/object/public/academy/${path}`
      setField(l.id, 'video_url', url)
      await save({ ...l, video_url: url })
    } catch { alert('Error subiendo el video') }
    setUploading(null)
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
        <a href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver al Admin
        </a>
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
              {/* video: subir archivo (se ve dentro de la app) */}
              <div className="mt-2 rounded-xl border border-neutral-700 bg-neutral-950 p-3">
                {l.video_url ? (
                  <div className="space-y-2">
                    <video src={l.video_url} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
                    <button onClick={() => { setField(l.id, 'video_url', null); save({ ...l, video_url: null }) }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300">
                      <X className="h-3.5 w-3.5" /> Quitar video
                    </button>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-sm font-semibold ${
                    uploading === l.id ? 'border-cyan-500 text-cyan-400' : 'border-neutral-700 text-neutral-300 hover:border-cyan-600 hover:text-cyan-400'}`}>
                    {uploading === l.id
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo video…</>
                      : <><Upload className="h-4 w-4" /> Subir video (mp4)</>}
                    <input type="file" accept="video/*" className="hidden" disabled={uploading === l.id}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(l, f) }} />
                  </label>
                )}
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
