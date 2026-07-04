'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminEmail } from '@/lib/isAdmin'

interface Dispute {
  id: string
  delivery_id?: string
  opened_by: string
  against?: string
  reason: string
  status: string
  resolution?: string
  created_at: string
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('sb-user')
    const email = userStr ? JSON.parse(userStr).email : null
    if (!isAdminEmail(email)) { setAuthorized(false); return }
    setAuthorized(true)
    load()
  }, [])

  const load = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/admin/disputes', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDisputes(data.disputes || [])
        setNames(data.names || {})
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const resolve = async (d: Dispute, status: 'resolved' | 'dismissed') => {
    const resolution = prompt(status === 'resolved' ? '¿Cómo se resolvió?' : '¿Por qué se descarta?')
    if (resolution === null) return
    setSavingId(d.id)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ disputeId: d.id, status, resolution }),
      })
      if (res.ok) setDisputes(prev => prev.map(x => x.id === d.id ? { ...x, status, resolution } : x))
    } catch (e) { console.error(e) } finally { setSavingId(null) }
  }

  if (authorized === false) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Solo administrador.</div>
  if (authorized === null || loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Cargando...</div>

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin · Disputas</h1>
          <button onClick={() => router.push('/admin')} className="text-sm text-neutral-400 hover:text-white">← Admin</button>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {disputes.length === 0 ? (
          <p className="text-neutral-500">No hay disputas. Buena señal.</p>
        ) : (
          <div className="space-y-4">
            {disputes.map(d => (
              <div key={d.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm">
                    <span className="font-semibold">{names[d.opened_by] || 'Usuario'}</span>
                    <span className="text-neutral-500"> contra </span>
                    <span className="font-semibold">{d.against ? (names[d.against] || 'Usuario') : '—'}</span>
                  </p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    d.status === 'open' ? 'bg-amber-500/15 text-amber-400'
                    : d.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {d.status === 'open' ? 'Abierta' : d.status === 'resolved' ? 'Resuelta' : 'Descartada'}
                  </span>
                </div>
                <p className="text-sm text-neutral-300 mb-2">{d.reason}</p>
                {d.resolution && <p className="text-xs text-neutral-500 mb-2">Resolución: {d.resolution}</p>}
                <p className="text-xs text-neutral-600 mb-3">{new Date(d.created_at).toLocaleString('es-ES')}</p>
                {d.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => resolve(d, 'resolved')} disabled={savingId === d.id}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm font-medium disabled:opacity-50">
                      Resolver
                    </button>
                    <button onClick={() => resolve(d, 'dismissed')} disabled={savingId === d.id}
                      className="px-4 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-sm font-medium disabled:opacity-50">
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
