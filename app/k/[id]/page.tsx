import type { Metadata } from 'next'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// Tarjeta PÚBLICA de CONTRATO (/k/<id>) — para el link del chat: muestra solo
// lo mínimo (título + compensación + partes por nombre) con branding lindo.
// El documento completo vive en /contrato/<id> (requiere sesión).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://octapiapp.com'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function getContract(id: string) {
  try {
    const key = SERVICE_KEY || SUPABASE_ANON_KEY
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/contracts?id=eq.${encodeURIComponent(id)}&select=id,title,payment_amount,payment_currency,usage_rights,status`,
      { headers: { Authorization: `Bearer ${key}`, apikey: key }, next: { revalidate: 60 } }
    )
    const rows = await res.json()
    return rows?.[0] || null
  } catch { return null }
}

function pagoTexto(c: any): string {
  try {
    const ur = typeof c?.usage_rights === 'string' ? JSON.parse(c.usage_rights) : c?.usage_rights
    if (ur?.payment_mode === 'cpm') return `$${ur.cpm_rate} ${c.payment_currency || 'USD'} por cada 1.000 visitas`
  } catch {}
  return `$${Number(c?.payment_amount || 0)} ${c?.payment_currency || 'USD'}`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const c = await getContract(params.id)
  const title = c?.title ? `Contrato: ${c.title} — Octapi` : 'Contrato en Octapi'
  const description = c ? `${pagoTexto(c)} · Revísalo y acéptalo en Octapi` : 'Contrato de campaña en Octapi'
  return { title, description, openGraph: { title, description, siteName: 'Octapi' } }
}

export default async function ContractCard({ params }: { params: { id: string } }) {
  const c = await getContract(params.id)

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#06283D] via-[#0b3d54] to-[#062a3f] px-5 py-10 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white text-neutral-900 shadow-2xl">
        {/* franja tipo documento */}
        <div className="border-b-4 border-cyan-500 bg-neutral-50 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">Contrato de campaña</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight">{c?.title || 'Contrato'}</h1>
        </div>
        <div className="p-6">
          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Compensación</p>
            <p className="mt-1 text-xl font-extrabold text-neutral-900">{c ? pagoTexto(c) : '—'}</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-500">
            Acuerdo de participación con firma electrónica. Ingresa a Octapi para leer el documento completo y aceptarlo.
          </p>
          <a
            href={`${APP_URL}/contrato/${params.id}`}
            className="mt-5 block w-full rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 text-center font-bold text-white shadow-lg"
          >
            Revisar y firmar en Octapi
          </a>
          <p className="mt-3 text-center text-[11px] text-neutral-400">Octapi actúa como plataforma intermediaria.</p>
        </div>
      </div>
    </div>
  )
}
