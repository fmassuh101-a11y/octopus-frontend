import type { Metadata } from 'next'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Tarjeta PÚBLICA de campaña (/c/<id>) — pensada para los links del chat:
// tiene OG tags (imagen + título) para que Whop/WhatsApp/etc. la muestren como
// tarjeta linda, sin abrir el resto de la app (el muro de waitlist la permite).
// Muestra lo mínimo: imagen, título, tipo y CPM — y CTA a Octapi.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function getGig(id: string) {
  try {
    const key = SERVICE_KEY || SUPABASE_ANON_KEY
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gigs?id=eq.${encodeURIComponent(id)}&select=id,title,category,budget,budget_min,budget_currency,image_url,description,company_name`,
      { headers: { Authorization: `Bearer ${key}`, apikey: key }, next: { revalidate: 300 } }
    )
    const rows = await res.json()
    return rows?.[0] || null
  } catch { return null }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const gig = await getGig(params.id)
  const title = gig?.title ? `${gig.title} — Campaña en Octapi` : 'Campaña en Octapi'
  const pay = gig?.budget || gig?.budget_min
  const description = pay
    ? `$${pay} ${gig?.budget_currency === 'CPM' ? 'CPM' : gig?.budget_currency || 'USD'} · ${gig?.category || 'UGC'} · Aplicá en Octapi`
    : `${gig?.category || 'UGC'} · Campañas pagas para creadores en LATAM`
  const image = gig?.image_url && String(gig.image_url).startsWith('http') ? gig.image_url : `${APP_URL}/icon.png`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }], siteName: 'Octapi' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function CampaignCard({ params }: { params: { id: string } }) {
  const gig = await getGig(params.id)

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#06283D] via-[#0b3d54] to-[#062a3f] px-5 py-10 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white text-neutral-900 shadow-2xl">
        {gig?.image_url && String(gig.image_url).startsWith('http') && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gig.image_url} alt="" className="h-52 w-full object-cover" />
        )}
        <div className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">Campaña en Octapi</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight">{gig?.title || 'Campaña'}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {gig?.category && <span className="rounded-full bg-neutral-100 px-3 py-1 font-bold text-neutral-600">{gig.category}</span>}
            {(gig?.budget || gig?.budget_min) && (
              <span className="rounded-full bg-cyan-50 px-3 py-1 font-extrabold text-cyan-700">
                ${gig.budget || gig.budget_min} {gig?.budget_currency === 'CPM' ? 'CPM' : gig?.budget_currency || 'USD'}
              </span>
            )}
          </div>
          {gig?.description && (
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">{String(gig.description).slice(0, 180)}</p>
          )}
          <a
            href={`${APP_URL}/gigs/${params.id}`}
            className="mt-5 block w-full rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 text-center font-bold text-white shadow-lg"
          >
            Ver campaña en Octapi
          </a>
          <p className="mt-3 text-center text-[11px] text-neutral-400">Creadores que monetizan. Marcas que crecen.</p>
        </div>
      </div>
    </div>
  )
}
