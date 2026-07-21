'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/oct/toast'
import { Loader2, Send, Users, Building2 } from 'lucide-react'

// Panel ADMIN de la lista de espera: ver inscriptos + enviarles email (Resend).
// Solo accesible para el email admin (validado en el server).

interface Row {
  id: string; role: string; email: string; name?: string; company_name?: string
  niche?: string; experience?: string; marketing_experience?: string; country?: string
  source?: string; message?: string
  referral_count: number; created_at: string
}

export default function AdminWaitlist() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'company'>('all')
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [backfilling, setBackfilling] = useState(false)
  const [confirmBackfill, setConfirmBackfill] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const res = await fetch('/api/waitlist/admin', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.ok) setRows(data.rows)
        else setError(data.error || 'Sin acceso')
      } catch { setError('No se pudo cargar') }
      setLoading(false)
    })()
  }, [])

  const send = async () => {
    if (!subject.trim() || !message.trim()) { toast('Completa asunto y mensaje', 'error'); return }
    setSending(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/waitlist/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message, role: roleFilter === 'all' ? undefined : roleFilter }),
      })
      const data = await res.json()
      if (data.ok) { toast(`Email enviado a ${data.sent} inscriptos`); setSubject(''); setMessage('') }
      else toast(data.error || 'No se pudo enviar', 'error')
    } catch { toast('No se pudo enviar', 'error') }
    setSending(false)
  }

  const sendWelcomeBackfill = async () => {
    if (!confirmBackfill) { setConfirmBackfill(true); return }
    setBackfilling(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/waitlist/welcome-backfill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.ok) toast(`Bienvenida enviada a ${data.sent} de ${data.total} inscriptos`)
      else toast(data.error || 'No se pudo enviar', 'error')
    } catch { toast('No se pudo enviar', 'error') }
    setBackfilling(false)
    setConfirmBackfill(false)
  }

  const creators = rows.filter((r) => r.role === 'creator')
  const companies = rows.filter((r) => r.role === 'company')
  const visible = roleFilter === 'all' ? rows : rows.filter((r) => r.role === roleFilter)

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-neutral-950"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>
  if (error) return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm font-semibold text-neutral-400">{error}</div>

  return (
    <div className="min-h-screen bg-neutral-950 px-5 py-8 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-extrabold">Lista de espera</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <Users className="h-5 w-5 text-cyan-400" />
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{creators.length}</p>
            <p className="text-xs text-neutral-500">Creadores</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <Building2 className="h-5 w-5 text-emerald-400" />
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{companies.length}</p>
            <p className="text-xs text-neutral-500">Empresas</p>
          </div>
        </div>

        {/* bienvenida retroactiva — a los que se anotaron ANTES de activar
            los emails automáticos, para que reciban la misma bienvenida
            que ahora reciben los nuevos registros */}
        <div className="mt-8 rounded-3xl border border-cyan-800/40 bg-cyan-950/20 p-5">
          <p className="font-bold">Mandar bienvenida a los que ya estaban anotados</p>
          <p className="mt-1 text-sm text-neutral-400">
            Los nuevos registros ya reciben el email de bienvenida automático. Esto manda ese mismo email (creador o empresa, según corresponda) a los {rows.length} que se anotaron antes de activarlo. Se manda una sola vez — no hay forma de deshacerlo.
          </p>
          {!confirmBackfill ? (
            <button onClick={sendWelcomeBackfill}
              className="mt-3 flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white">
              <Send className="h-4 w-4" /> Mandar bienvenida a los {rows.length} inscriptos
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-amber-400">¿Seguro? Se manda ahora mismo a los {rows.length}.</p>
              <button onClick={sendWelcomeBackfill} disabled={backfilling}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
                {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sí, mandar ahora
              </button>
              <button onClick={() => setConfirmBackfill(false)} disabled={backfilling}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm font-bold text-neutral-300">
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* composer */}
        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="font-bold">Enviar email a la lista</p>
          <div className="mt-3 flex gap-2">
            {(['all', 'creator', 'company'] as const).map((r) => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${roleFilter === r ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                {r === 'all' ? `Todos (${rows.length})` : r === 'creator' ? `Creadores (${creators.length})` : `Empresas (${companies.length})`}
              </button>
            ))}
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto"
            className="mt-3 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-cyan-500" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensaje (texto plano, los saltos de línea se respetan)" rows={6}
            className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-cyan-500" />
          <button onClick={send} disabled={sending}
            className="mt-3 flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar a {roleFilter === 'all' ? rows.length : visible.length} inscriptos
          </button>
        </div>

        {/* lista */}
        <div className="mt-8 overflow-x-auto rounded-3xl border border-neutral-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">País</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3">Fuente</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Referidos</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-t border-neutral-800/70 transition-colors hover:bg-neutral-900"
                >
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.role === 'creator' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {r.role === 'creator' ? 'Creador' : 'Empresa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.name || r.company_name || '—'}</td>
                  <td className="px-4 py-3 text-neutral-400">{r.country || '—'}</td>
                  <td className="px-4 py-3 text-neutral-400">{r.email}</td>
                  <td className="px-4 py-3 text-neutral-500">{r.role === 'creator' ? (r.experience || '—') : `${r.niche || '—'} · mkt: ${r.marketing_experience || '—'}`}</td>
                  <td className="px-4 py-3 text-neutral-500">{r.source || '—'}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate text-neutral-500">{r.message || '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{r.referral_count}</td>
                  <td className="px-4 py-3 text-neutral-500">{new Date(r.created_at).toLocaleDateString('es-CL')}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-neutral-500">Sin inscriptos todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle completo de un inscripto — antes solo se veía con el
          tooltip nativo del navegador al pasar el mouse (title=), difícil
          de usar. Ahora se abre clickeando la fila. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-900 p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${selected.role === 'creator' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                  {selected.role === 'creator' ? 'Creador' : 'Empresa'}
                </span>
                <h2 className="mt-2 text-xl font-extrabold">{selected.name || selected.company_name || '—'}</h2>
                <p className="text-sm text-neutral-500">{selected.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-500">País</p>
                <p className="mt-0.5 font-semibold">{selected.country || '—'}</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-500">Fuente</p>
                <p className="mt-0.5 font-semibold">{selected.source || '—'}</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-500">{selected.role === 'creator' ? 'Experiencia' : 'Nicho'}</p>
                <p className="mt-0.5 font-semibold">{selected.role === 'creator' ? (selected.experience || '—') : (selected.niche || '—')}</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-500">{selected.role === 'creator' ? 'Referidos' : 'Experiencia en marketing'}</p>
                <p className="mt-0.5 font-semibold">{selected.role === 'creator' ? selected.referral_count : (selected.marketing_experience || '—')}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-neutral-500">Mensaje</p>
              <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-200">
                {selected.message || 'No dejó mensaje.'}
              </p>
            </div>

            <p className="mt-4 text-xs text-neutral-600">Se inscribió el {new Date(selected.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}
    </div>
  )
}
