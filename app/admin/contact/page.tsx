'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminEmail } from '@/lib/isAdmin'

interface Req {
  id: string; name?: string; email?: string; company?: string
  budget?: string; reason?: string; message?: string; created_at: string
}

export default function AdminContactPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem('sb-user')
    const email = userStr ? JSON.parse(userStr).email : null
    if (!isAdminEmail(email)) { setAuthorized(false); return }
    setAuthorized(true)
    ;(async () => {
      try {
        const res = await fetch('/api/admin/contact', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}` },
        })
        if (res.ok) setReqs((await res.json()).requests || [])
      } catch (e) { console.error(e) } finally { setLoading(false) }
    })()
  }, [])

  if (authorized === false) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Solo administrador.</div>
  if (authorized === null || loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Cargando...</div>

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin · Solicitudes "Hablemos"</h1>
          <button onClick={() => router.push('/admin')} className="text-sm text-neutral-400 hover:text-white">← Admin</button>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {reqs.length === 0 ? (
          <p className="text-neutral-500">Aún no hay solicitudes.</p>
        ) : (
          <div className="space-y-4">
            {reqs.map(r => (
              <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{r.name} <span className="text-neutral-500 font-normal">· {r.company || 'sin empresa'}</span></p>
                    <a href={`mailto:${r.email}`} className="text-emerald-400 text-sm">{r.email}</a>
                  </div>
                  {r.budget && <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">{r.budget}</span>}
                </div>
                {r.reason && <p className="text-sm text-neutral-300 mb-1"><span className="text-neutral-500">Por qué: </span>{r.reason}</p>}
                {r.message && <p className="text-sm text-neutral-300"><span className="text-neutral-500">Sobre su marca: </span>{r.message}</p>}
                <p className="text-xs text-neutral-600 mt-2">{new Date(r.created_at).toLocaleString('es-ES')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
