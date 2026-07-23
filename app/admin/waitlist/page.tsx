'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/oct/toast'
import { Loader2, Send, Users, Building2, Check } from 'lucide-react'

// Panel ADMIN de la lista de espera: ver inscriptos + enviarles email (Resend).
// Solo accesible para el email admin (validado en el server).

interface Row {
  id: string; role: string; email: string; name?: string; company_name?: string
  niche?: string; experience?: string; marketing_experience?: string; country?: string
  source?: string; message?: string
  referral_count: number; created_at: string
  welcome_sent_at?: string | null; last_broadcast_sent_at?: string | null
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
  const [pendingLimit, setPendingLimit] = useState<number | undefined>(undefined)
  const [testEmail, setTestEmail] = useState('')
  const [testRole, setTestRole] = useState<'creator' | 'company'>('creator')
  const [sendingTest, setSendingTest] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const startBackfill = (limit?: number) => {
    setPendingLimit(limit)
    setConfirmBackfill(true)
  }

  const sendWelcomeBackfill = async () => {
    setBackfilling(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/waitlist/welcome-backfill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingLimit ? { limit: pendingLimit } : {}),
      })
      const data = await res.json()
      if (data.message) toast(data.message)
      else if (data.ok) {
        const wasLimited = !!pendingLimit && data.sent >= pendingLimit
        toast(
          wasLimited
            ? `Enviado a ${data.sent} (prueba). Quedan ${data.pending} pendientes en total — apretá "Mandar a todos" cuando quieras seguir.`
            : data.pending > 0
            ? `Enviado a ${data.sent}. Quedan ${data.pending} pendientes (tope diario) — apretá de nuevo mañana.`
            : `Bienvenida enviada a los ${data.sent} inscriptos. Ninguno quedó pendiente.`
        )
      }
      else toast(data.error || 'No se pudo enviar', 'error')
    } catch { toast('No se pudo enviar', 'error') }
    setBackfilling(false)
    setConfirmBackfill(false)
    setPendingLimit(undefined)
  }

  const sendTest = async () => {
    if (!testEmail.trim().includes('@')) { toast('Escribe un email válido', 'error'); return }
    setSendingTest(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/waitlist/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: testEmail.trim(), role: testRole }),
      })
      const data = await res.json()
      if (data.ok) toast(`Prueba enviada a ${testEmail.trim()} — revisa tu bandeja`)
      else toast(data.error || 'No se pudo enviar', 'error')
    } catch { toast('No se pudo enviar', 'error') }
    setSendingTest(false)
  }

  const deleteSelected = async () => {
    if (!selected) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletingId(selected.id)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`/api/waitlist/admin?id=${selected.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.ok) {
        setRows((prev) => prev.filter((r) => r.id !== selected.id))
        toast('Inscripto eliminado')
        setSelected(null)
      } else toast(data.error || 'No se pudo borrar', 'error')
    } catch { toast('No se pudo borrar', 'error') }
    setDeletingId(null)
    setConfirmDelete(false)
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

        {/* mandar un email de prueba a una dirección cualquiera, sin tocar
            la tabla de la waitlist — para ver cómo llega de verdad antes
            de mandarle a la gente real */}
        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="font-bold">Mandarme un email de prueba</p>
          <p className="mt-1 text-sm text-neutral-400">Manda la bienvenida (creador o empresa) a la dirección que pongas, sin anotarla en la lista de espera. Así ves exactamente cómo llega.</p>
          <div className="mt-3 flex gap-2">
            {(['creator', 'company'] as const).map((r) => (
              <button key={r} onClick={() => setTestRole(r)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${testRole === r ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                {r === 'creator' ? 'Versión creador' : 'Versión empresa'}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="tu-email@ejemplo.com" type="email"
              className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-cyan-500" />
            <button onClick={sendTest} disabled={sendingTest}
              className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Mandar prueba
            </button>
          </div>
        </div>

        {/* bienvenida retroactiva — a los que se anotaron ANTES de activar
            los emails automáticos, para que reciban la misma bienvenida
            que ahora reciben los nuevos registros */}
        <div className="mt-8 rounded-3xl border border-cyan-800/40 bg-cyan-950/20 p-5">
          <p className="font-bold">Mandar bienvenida a los que ya estaban anotados</p>
          <p className="mt-1 text-sm text-neutral-400">
            Los nuevos registros ya reciben el email de bienvenida automático. Esto manda ese mismo email (creador o empresa, según corresponda) a quien todavía no lo haya recibido. Resend gratis tiene tope de 100/día — si quedan pendientes por eso, apretá el mismo botón mañana: se acuerda a quién ya le mandó y no repite.
          </p>
          {!confirmBackfill ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={() => startBackfill(50)}
                className="flex items-center gap-2 rounded-2xl border border-cyan-700 px-5 py-3 text-sm font-bold text-cyan-300">
                <Send className="h-4 w-4" /> Probar con 50
              </button>
              <button onClick={() => startBackfill(undefined)}
                className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white">
                <Send className="h-4 w-4" /> Mandar bienvenida a todos los pendientes
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-amber-400">
                ¿Seguro? Se manda ahora mismo {pendingLimit ? `a los primeros ${pendingLimit} pendientes` : 'a todos los pendientes'}.
              </p>
              <button onClick={sendWelcomeBackfill} disabled={backfilling}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
                {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sí, mandar ahora
              </button>
              <button onClick={() => { setConfirmBackfill(false); setPendingLimit(undefined) }} disabled={backfilling}
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
                <th className="px-4 py-3">Email</th>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {r.welcome_sent_at && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          <Check className="h-3 w-3" /> Bienvenida
                        </span>
                      )}
                      {r.last_broadcast_sent_at && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <Check className="h-3 w-3" /> {new Date(r.last_broadcast_sent_at).toLocaleDateString('es-CL')}
                        </span>
                      )}
                      {!r.welcome_sent_at && !r.last_broadcast_sent_at && <span className="text-neutral-600">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-neutral-500">Sin inscriptos todavía</td></tr>
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
          onClick={() => { setSelected(null); setConfirmDelete(false) }}
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

            <div className="mt-5 border-t border-neutral-800 pt-4">
              {!confirmDelete ? (
                <button onClick={deleteSelected}
                  className="text-xs font-bold text-red-400 hover:text-red-300">
                  Eliminar este inscripto (ej. registros de prueba)
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold text-amber-400">¿Seguro? No se puede deshacer.</p>
                  <button onClick={deleteSelected} disabled={deletingId === selected.id}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    {deletingId === selected.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Sí, eliminar
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-neutral-400">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
