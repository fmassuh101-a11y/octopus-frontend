'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sky from '@/components/oct/Sky'
import { toast } from '@/components/oct/toast'
import { X, Copy, Share2, UserPlus, Banknote, TrendingUp } from 'lucide-react'

// Referidos — copia de la pantalla Affiliates de SideShift:
// "Invitá gente. Ganá plata.", carousel "Qué ganás", "Cómo funciona",
// link de referido con copiar, stats y CTA sticky.
const EARN_CARDS = [
  { amount: '$5', desc: 'Ganás un bono cuando un creador que invitaste completa su primer trabajo.' },
  { amount: '$10', desc: 'Ganás $10 cuando tu invitado acumula $100 ganados en Octopus.' },
  { amount: '$50', desc: 'Ganás $50 cuando un invitado llega a $1.000 ganados en la plataforma.' },
]

const STEPS = [
  { n: '1', t: 'Compartí tu link', d: 'Mandáselo a cualquier creador al que le sirva.' },
  { n: '2', t: 'Se registran', d: 'Quedan atribuidos a vos automáticamente.' },
  { n: '3', t: 'Ganás', d: 'Cobrás cuando ellos empiezan a generar.' },
]

export default function ReferidosPage() {
  const router = useRouter()
  const [link, setLink] = useState('')
  const [card, setCard] = useState(0)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('sb-user') || 'null')
      const code = (u?.id || '').slice(0, 8)
      setLink(`${window.location.origin}/auth/register?ref=${code}`)
    } catch {}
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copiado')
    } catch {
      toast('No se pudo copiar', 'error')
    }
  }

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Sumate a Octopus', text: 'Ganá plata creando contenido para marcas', url: link })
      else await copy()
    } catch {}
  }

  return (
    <div className="relative min-h-[100dvh] bg-white pb-40 text-neutral-900">
      <Sky height={220} />
      <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-4">
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/profile'))}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/90 shadow-sm transition-transform active:scale-90" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>

        <h1 className="mt-8 text-center text-[38px] font-extrabold leading-tight tracking-tight">
          Invitá gente.<br />Ganá plata.
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-center text-lg text-neutral-500">
          Invitá creadores a Octopus y ganá por su actividad.
        </p>

        {/* qué ganás */}
        <h2 className="mt-9 text-[24px] font-extrabold tracking-tight">Qué ganás</h2>
        <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar" onScroll={(e) => {
          const el = e.currentTarget
          setCard(Math.round(el.scrollLeft / (el.clientWidth * 0.8)))
        }}>
          {EARN_CARDS.map((c, i) => (
            <div key={i} className="w-[80%] shrink-0 snap-start rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
              <p className="text-4xl font-extrabold tabular-nums">{c.amount}</p>
              <p className="mt-2 text-neutral-600">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {EARN_CARDS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === Math.min(card, EARN_CARDS.length - 1) ? 'w-6 bg-emerald-400' : 'w-1.5 bg-neutral-200'}`} />
          ))}
        </div>

        {/* link de referido */}
        <h2 className="mt-8 text-[24px] font-extrabold tracking-tight">Tu link de invitación</h2>
        <div className="mt-3 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3.5">
            <p className="min-w-0 flex-1 truncate text-[15px] text-neutral-600">{link || '…'}</p>
            <button onClick={copy} className="shrink-0 p-1.5 text-neutral-500 transition-transform active:scale-90" aria-label="Copiar link">
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-100 rounded-3xl border border-neutral-100 bg-white p-5 text-center shadow-sm">
          <div><Banknote className="mx-auto h-5 w-5 text-emerald-500" /><p className="mt-1 text-xl font-extrabold tabular-nums">$0</p><p className="text-xs text-neutral-500">ganado</p></div>
          <div><UserPlus className="mx-auto h-5 w-5 text-sky-500" /><p className="mt-1 text-xl font-extrabold tabular-nums">0</p><p className="text-xs text-neutral-500">registrados</p></div>
          <div><TrendingUp className="mx-auto h-5 w-5 text-violet-500" /><p className="mt-1 text-xl font-extrabold tabular-nums">0</p><p className="text-xs text-neutral-500">generando</p></div>
        </div>

        {/* cómo funciona */}
        <h2 className="mt-8 text-[24px] font-extrabold tracking-tight">Cómo funciona</h2>
        <div className="mt-3 space-y-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
              <p className="text-lg font-bold">{s.n}. {s.t}</p>
              <p className="mt-0.5 text-neutral-500">{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA sticky */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white/95 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+86px)] pt-6">
        <button onClick={share}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#34D399] to-[#0EA472] py-4 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98]">
          <Share2 className="h-5 w-5" /> Empezar a invitar
        </button>
      </div>
    </div>
  )
}
