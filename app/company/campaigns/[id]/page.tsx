'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Plus, Megaphone } from 'lucide-react'

interface Campaign {
  id: string
  title: string
  objective?: string
  company_name?: string
  status: string
}
interface Formato {
  id: string
  title: string
  category: string
  budget: string
  status: string
}

const TYPE_LABEL: Record<string, string> = {
  ugc: 'UGC', clipping: 'Clipping', faceless: 'Faceless', social: 'Social Media Manager',
  slideshow: 'Slideshows', review: 'Reseñas', unboxing: 'Unboxing', ambassador: 'Embajador',
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [formatos, setFormatos] = useState<Formato[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [campaignId])

  const load = async () => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) { router.push('/auth/login'); return }
    const headers = { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
    try {
      const [cRes, fRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaignId}&select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/gigs?campaign_id=eq.${campaignId}&select=id,title,category,budget,status&order=created_at.desc`, { headers }),
      ])
      if (cRes.ok) { const c = await cRes.json(); setCampaign(c[0] || null) }
      if (fRes.ok) setFormatos(await fRes.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Cargando...</div>
  }
  if (!campaign) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <p>Campaña no encontrada</p>
        <Link href="/company/campaigns" className="text-emerald-400">Volver</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      <header className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/company/campaigns" className="text-neutral-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-semibold truncate">{campaign.title}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Campaign header */}
        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            {campaign.objective && <p className="text-neutral-400 mt-1">{campaign.objective}</p>}
          </div>
        </div>

        {/* Formatos */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Formatos <span className="text-neutral-500 font-normal">({formatos.length})</span></h2>
          <Link
            href={`/company/jobs/new?campaign=${campaignId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar formato
          </Link>
        </div>

        {formatos.length === 0 ? (
          <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center">
            <p className="text-neutral-400 mb-4">Aún no hay formatos. Agrega uno (UGC, Clipping, Faceless...) para empezar a recibir creadores.</p>
            <Link
              href={`/company/jobs/new?campaign=${campaignId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar primer formato
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {formatos.map(f => (
              <div key={f.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                      {TYPE_LABEL[f.category] || f.category}
                    </span>
                    <span className="text-xs text-neutral-500">{f.status === 'active' ? 'Activo' : f.status}</span>
                  </div>
                  <p className="font-medium">{f.title}</p>
                </div>
                <span className="text-emerald-400 font-semibold text-sm">{f.budget}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
