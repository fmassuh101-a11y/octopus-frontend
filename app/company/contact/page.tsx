'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Sparkles, CheckCircle2 } from 'lucide-react'

const BUDGETS = ['Menos de $500/mes', '$500 – $2.000/mes', '$2.000 – $5.000/mes', 'Más de $5.000/mes']

export default function CompanyContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', budget: '', reason: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.reason.trim()) {
      setError('Completa nombre, email y por qué te interesa.')
      return
    }
    setSending(true); setError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      setSent(true)
    } catch (e: any) {
      setError('No se pudo enviar. Intenta de nuevo.')
    } finally { setSending(false) }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">¡Recibido! Gracias por escribirnos</h1>
          <p className="text-neutral-400 mb-6">Nuestro equipo revisará tu solicitud y te contactará muy pronto para armar un plan a tu medida.</p>
          <Link href="/company/pricing" className="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold text-sm">Volver a planes</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/company/pricing" className="text-neutral-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-semibold">Hablemos</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-black">Crezcamos juntos</h1>
        </div>
        <p className="text-neutral-400 mb-8">
          Cuéntanos sobre tu marca y armamos un plan gestionado a tu medida — con campañas creadas por nuestro equipo y comisiones preferentes. Respondemos personalmente.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tu nombre *"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ej. Felipe" className={inputCls} /></Field>
            <Field label="Email de contacto *"><input value={form.email} onChange={e => set('email', e.target.value)} placeholder="tu@empresa.com" className={inputCls} /></Field>
          </div>
          <Field label="Nombre de tu empresa"><input value={form.company} onChange={e => set('company', e.target.value)} placeholder="ej. Nike" className={inputCls} /></Field>

          <Field label="¿Cuál es tu presupuesto mensual estimado en contenido?">
            <div className="grid grid-cols-2 gap-2">
              {BUDGETS.map(b => (
                <button key={b} type="button" onClick={() => set('budget', b)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${form.budget === b ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'}`}>
                  {b}
                </button>
              ))}
            </div>
          </Field>

          <Field label="¿Por qué te interesa un plan gestionado por nosotros? *">
            <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={3} placeholder="ej. Queremos escalar contenido sin gestionar creadores nosotros mismos..." className={inputCls + ' resize-none'} />
          </Field>

          <Field label="Cuéntanos sobre tu marca y tus objetivos">
            <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} placeholder="¿Qué producto promocionas? ¿Qué resultados buscas?" className={inputCls + ' resize-none'} />
          </Field>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={submit} disabled={sending}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 font-semibold transition-colors">
            {sending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
          <p className="text-xs text-neutral-500 text-center">Sin compromiso. Te responderemos en menos de 48 horas.</p>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-200 mb-2">{label}</label>
      {children}
    </div>
  )
}
