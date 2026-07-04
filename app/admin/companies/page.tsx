'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { PLANS, PlanKey } from '@/lib/plans'
import { Gift, Percent } from 'lucide-react'

import { isAdminEmail } from '@/lib/isAdmin'

interface Company {
  user_id: string
  company_name?: string
  full_name?: string
  email?: string
  plan?: string
  plan_source?: string
  discount_percent?: number
}

export default function AdminCompaniesPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const token = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    const userStr = localStorage.getItem('sb-user')
    const email = userStr ? JSON.parse(userStr).email : null
    if (!isAdminEmail(email)) { setAuthorized(false); return }
    setAuthorized(true)
    load()
  }, [])

  const load = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_type=eq.company&select=user_id,company_name,full_name,email,plan,plan_source,discount_percent&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token()}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (res.ok) setCompanies(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const setPlan = async (c: Company, plan: PlanKey, gift: boolean) => {
    setSavingId(c.user_id); setMsg('')
    try {
      const res = await fetch('/api/admin/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ targetUserId: c.user_id, plan, gift }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      setCompanies(prev => prev.map(x => x.user_id === c.user_id ? { ...x, plan, plan_source: gift ? 'gifted' : 'paid' } : x))
      setMsg(`✓ ${c.company_name || c.email}: plan ${plan}${gift ? ' (regalado)' : ''}`)
    } catch (e: any) { setMsg('Error: ' + e.message) } finally { setSavingId(null) }
  }

  const setDiscount = async (c: Company, discountPercent: number) => {
    setSavingId(c.user_id); setMsg('')
    try {
      const res = await fetch('/api/admin/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ targetUserId: c.user_id, discountPercent }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      setCompanies(prev => prev.map(x => x.user_id === c.user_id ? { ...x, discount_percent: discountPercent } : x))
      setMsg(`✓ ${c.company_name || c.email}: descuento ${discountPercent}%`)
    } catch (e: any) { setMsg('Error: ' + e.message) } finally { setSavingId(null) }
  }

  const grantBalance = async (c: Company, amount: number) => {
    setSavingId(c.user_id); setMsg('')
    try {
      const res = await fetch('/api/admin/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ targetUserId: c.user_id, grantBalance: amount }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      setMsg(`✓ ${c.company_name || c.email}: +$${amount} de saldo`)
    } catch (e: any) { setMsg('Error: ' + e.message) } finally { setSavingId(null) }
  }

  if (authorized === false) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Acceso solo para el administrador.</div>
  }
  if (authorized === null || loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin · Empresas</h1>
          <button onClick={() => router.push('/admin')} className="text-sm text-neutral-400 hover:text-white">← Admin</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {msg && <div className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">{msg}</div>}
        <p className="text-neutral-500 text-sm mb-6">Regala planes y aplica descuentos a las empresas para probar antes del lanzamiento.</p>

        {companies.length === 0 ? (
          <p className="text-neutral-500">No hay empresas registradas todavía.</p>
        ) : (
          <div className="space-y-4">
            {companies.map(c => (
              <div key={c.user_id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{c.company_name || c.full_name || 'Empresa'}</p>
                    <p className="text-xs text-neutral-500">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                      {PLANS[(c.plan as PlanKey)]?.name || 'Starter'}
                      {c.plan_source === 'gifted' && ' · regalado'}
                    </span>
                    {(c.discount_percent || 0) > 0 && (
                      <span className="ml-2 inline-block px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium">
                        -{c.discount_percent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Regalar plan */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-xs text-neutral-500 flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Regalar plan:</span>
                  {(Object.keys(PLANS) as PlanKey[]).map(pk => (
                    <button
                      key={pk}
                      disabled={savingId === c.user_id}
                      onClick={() => setPlan(c, pk, true)}
                      className="px-3 py-1 rounded-lg border border-neutral-700 hover:border-emerald-500 hover:text-emerald-400 text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {PLANS[pk].name}
                    </button>
                  ))}
                </div>

                {/* Descuento */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-xs text-neutral-500 flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> Descuento:</span>
                  {[0, 20, 50, 100].map(d => (
                    <button
                      key={d}
                      disabled={savingId === c.user_id}
                      onClick={() => setDiscount(c, d)}
                      className="px-3 py-1 rounded-lg border border-neutral-700 hover:border-amber-500 hover:text-amber-400 text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {d === 0 ? 'Quitar' : `${d}%`}
                    </button>
                  ))}
                </div>

                {/* Dar saldo (para probar el escrow / depósitos manuales) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-500">Dar saldo:</span>
                  {[100, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      disabled={savingId === c.user_id}
                      onClick={() => grantBalance(c, amt)}
                      className="px-3 py-1 rounded-lg border border-neutral-700 hover:border-emerald-500 hover:text-emerald-400 text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      +${amt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
