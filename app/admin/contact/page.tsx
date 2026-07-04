'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminEmail } from '@/lib/isAdmin'

interface Req {
  id: string; name?: string; email?: string; company?: string
  budget?: string; reason?: string; message?: string; created_at: string
  offer_status?: string; offer_price?: string; offer_commission?: string; offer_seats?: string; offer_message?: string
}

export default function AdminContactPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [offerFor, setOfferFor] = useState<Req | null>(null)
  const [offer, setOffer] = useState({ offer_price: '', offer_commission: '', offer_seats: '', offer_message: '' })
  const [sending, setSending] = useState(false)

  const sendOffer = async () => {
    if (!offerFor) return
    setSending(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ requestId: offerFor.id, ...offer }),
      })
      if (res.ok) {
        setReqs(prev => prev.map(r => r.id === offerFor.id ? { ...r, ...offer, offer_status: 'offered' } : r))
        setOfferFor(null)
        setOffer({ offer_price: '', offer_commission: '', offer_seats: '', offer_message: '' })
        alert('Oferta enviada a la empresa.')
      } else { alert('Error al enviar la oferta.') }
    } catch { alert('Error al enviar la oferta.') } finally { setSending(false) }
  }

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

                {r.offer_status === 'offered' ? (
                  <div className="mt-3 pt-3 border-t border-neutral-800 text-sm">
                    <span className="text-emerald-400 font-medium">Oferta enviada:</span>
                    <span className="text-neutral-300"> {r.offer_price} · {r.offer_commission} comisión · {r.offer_seats}</span>
                  </div>
                ) : r.offer_status === 'accepted' ? (
                  <div className="mt-3 pt-3 border-t border-neutral-800 text-sm text-emerald-400 font-medium">✓ La empresa aceptó tu oferta ({r.offer_price})</div>
                ) : (
                  <button onClick={() => setOfferFor(r)}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                    Enviar oferta a medida
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: crear oferta a medida */}
      {offerFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-1">Oferta para {offerFor.company || offerFor.name}</h3>
            <p className="text-neutral-500 text-sm mb-4">Escribe los términos a medida. La empresa la verá y podrá aceptarla.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Precio (ej. $1.000/mes)</label>
                <input value={offer.offer_price} onChange={e => setOffer({ ...offer, offer_price: e.target.value })} placeholder="$1.000/mes"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Comisión (ej. 1%)</label>
                  <input value={offer.offer_commission} onChange={e => setOffer({ ...offer, offer_commission: e.target.value })} placeholder="1%"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Asientos (ej. 20 personas)</label>
                  <input value={offer.offer_seats} onChange={e => setOffer({ ...offer, offer_seats: e.target.value })} placeholder="20 personas"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Mensaje (opcional)</label>
                <textarea value={offer.offer_message} onChange={e => setOffer({ ...offer, offer_message: e.target.value })} rows={2} placeholder="Incluye campañas ilimitadas, manager dedicado..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 outline-none focus:border-emerald-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOfferFor(null)} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium text-sm">Cancelar</button>
              <button onClick={sendOffer} disabled={sending || !offer.offer_price} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-sm">{sending ? 'Enviando...' : 'Enviar oferta'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
