'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/oct/toast'
import { Loader2, Send, Users, Building2 } from 'lucide-react'

// Panel ADMIN de la lista de espera: ver inscriptos + enviarles email (Resend).
// Solo accesible para el email admin (validado en el server).

interface Row {
  id: string; role: string; email: string; name?: string; company_name?: string
  niche?: string; experience?: string; marketing_experience?: string
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
    if (!subject.trim() || !message.trim()) { toast('Completá asunto y mensaje', 'error'); return }
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
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3">Referidos</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-neutral-800/70">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.role === 'creator' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {r.role === 'creator' ? 'Creador' : 'Empresa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.name || r.company_name || '—'}</td>
                  <td className="px-4 py-3 text-neutral-400">{r.email}</td>
                  <td className="px-4 py-3 text-neutral-500">{r.role === 'creator' ? (r.experience || '—') : `${r.niche || '—'} · mkt: ${r.marketing_experience || '—'}`}</td>
                  <td className="px-4 py-3 tabular-nums">{r.referral_count}</td>
                  <td className="px-4 py-3 text-neutral-500">{new Date(r.created_at).toLocaleDateString('es-CL')}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Sin inscriptos todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
