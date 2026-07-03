'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getActiveCompany, getActiveCompanyId } from '@/lib/workspace'
import { hasPermission } from '@/lib/permissions'
import { Megaphone } from 'lucide-react'

export default function NewCampaignPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [objective, setObjective] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!hasPermission('create_campaigns')) { setError('No tienes permiso para crear campañas en este espacio.'); return }
    if (!title.trim()) { setError('Ponle un nombre a tu campaña'); return }
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) { router.push('/auth/login'); return }
      const user = JSON.parse(userStr)
      const activeCompanyId = getActiveCompanyId(user.id)
      const activeWs = getActiveCompany()

      // nombre de la empresa
      let companyName = activeWs?.name || 'Empresa'
      const pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${activeCompanyId}&select=company_name,full_name`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (pRes.ok) {
        const p = await pRes.json()
        if (p[0]) companyName = activeWs?.name || p[0].company_name || p[0].full_name || 'Empresa'
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          company_id: activeCompanyId,
          company_name: companyName,
          title: title.trim(),
          objective: objective.trim() || null,
          status: 'active'
        })
      })
      if (!res.ok) throw new Error(await res.text() || 'Error al crear la campaña')
      const created = await res.json()
      const id = Array.isArray(created) ? created[0]?.id : created?.id
      router.push(`/company/campaigns/${id}`)
    } catch (e: any) {
      setError(e.message || 'Error al crear la campaña')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/company/campaigns" className="text-neutral-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-semibold">Nueva campaña</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Crea tu campaña</h1>
            <p className="text-neutral-500 text-sm">El contenedor grande. Adentro agregas formatos (UGC, Clipping, etc.)</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Nombre de la campaña *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ej. Lanzamiento de nuestra app"
              className="w-full px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Objetivo (opcional)</label>
            <textarea
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="¿Qué querés lograr con esta campaña? ej. dar a conocer la app y conseguir descargas"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 font-semibold transition-colors"
          >
            {saving ? 'Creando...' : 'Crear campaña y agregar formatos'}
          </button>
        </div>
      </div>
    </div>
  )
}
