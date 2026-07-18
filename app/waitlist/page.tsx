'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DeepOcean from '@/components/oct/DeepOcean'
import { Loader2, Check, Copy, Lock, ChevronRight, Users, ArrowDown } from 'lucide-react'

// LISTA DE ESPERA v2 — inmersiva (océano profundo con canvas propio), contador
// con meta EN VIVO ("Creadores X/250"), formulario por rol y referral link
// viral. Toda la app vive detrás de este muro (middleware). Sin emojis.

const EXPERIENCIA_CREADOR = [
  { v: 'si', t: 'Sí, tengo experiencia' },
  { v: 'mas_o_menos', t: 'Más o menos' },
  { v: 'empezando', t: 'Recién empezando' },
  { v: 'no', t: 'No, ninguna' },
]
const EXPERIENCIA_EMPRESA = [
  { v: 'si', t: 'Sí' },
  { v: 'algo', t: 'Algo' },
  { v: 'no', t: 'No' },
]

function WaitlistInner() {
  const params = useSearchParams()
  const refId = params.get('ref') || ''

  const [role, setRole] = useState<'creator' | 'company'>('creator')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [experience, setExperience] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [niche, setNiche] = useState('')
  const [mkt, setMkt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [stats, setStats] = useState<{ creators: number; companies: number; goalCreators: number; goalCompanies: number } | null>(null)
  const [joinedId, setJoinedId] = useState('')
  const [referrals, setReferrals] = useState(0)
  const [copied, setCopied] = useState(false)

  const [showPass, setShowPass] = useState(false)
  const [pass, setPass] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passError, setPassError] = useState('')

  const loadStats = async () => {
    try {
      const d = await (await fetch('/api/waitlist/stats')).json()
      if (d.ok) setStats(d)
    } catch {}
  }

  useEffect(() => {
    const saved = localStorage.getItem('oct-waitlist-id')
    if (saved) { setJoinedId(saved); refreshCount(saved) }
    loadStats()
    const t = setInterval(loadStats, 12000) // contador EN VIVO
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const inviteLink = useMemo(
    () => (joinedId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist?ref=${joinedId}` : ''),
    [joinedId]
  )

  const refreshCount = async (id: string) => {
    try {
      const r = await fetch(`/api/waitlist/join?id=${id}`)
      const d = await r.json()
      if (d.ok) setReferrals(d.referrals || 0)
    } catch {}
  }

  const join = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email, name, experience, companyName, niche, marketingExperience: mkt, ref: refId }),
      })
      const data = await res.json()
      if (data.ok && data.id) {
        localStorage.setItem('oct-waitlist-id', data.id)
        setJoinedId(data.id)
        setReferrals(data.referrals || 0)
        loadStats()
      } else setError(data.error || 'No se pudo guardar. Probá de nuevo.')
    } catch { setError('No se pudo guardar. Probá de nuevo.') }
    setBusy(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`Me anoté en Octopus, el marketplace donde los creadores cobran por hacer clips y contenido. Sumate con mi link y entramos antes: ${inviteLink}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const unlock = async () => {
    setPassError('')
    setPassBusy(true)
    try {
      const res = await fetch('/api/waitlist/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      })
      const data = await res.json()
      if (data.ok) { window.location.href = '/'; return }
      setPassError(data.error || 'Contraseña incorrecta')
    } catch { setPassError('No se pudo validar. Probá de nuevo.') }
    setPassBusy(false)
  }

  const canJoin = role === 'creator'
    ? name.trim() && email.trim() && experience
    : companyName.trim() && email.trim() && mkt

  const count = role === 'creator' ? stats?.creators : stats?.companies
  const goal = role === 'creator' ? stats?.goalCreators || 250 : stats?.goalCompanies || 50
  const pct = Math.min(100, Math.round(((count || 0) / goal) * 100))

  const scrollToForm = () => document.getElementById('anotarse')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-[100dvh] bg-[#03141f] font-sans text-white">
      {/* ═══ HERO INMERSIVO (océano profundo) ═══ */}
      <section className="relative h-[100dvh] w-full overflow-hidden">
        <DeepOcean />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#03141f]" />

        {/* nav */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <p className="text-lg font-semibold tracking-tight sm:text-xl">Octopus</p>
          <button
            onClick={() => setShowPass(true)}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
          >
            Acceso
          </button>
        </div>

        {/* hero content */}
        <div className="relative z-10 flex h-[calc(100dvh-80px)] flex-col justify-between px-6 pb-10 pt-10 md:px-12 md:pb-14">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs text-white/80 [animation:fadeSlideUp_0.8s_ease_0.2s_both] sm:text-sm">
              Lista de espera abierta — Latinoamérica
            </p>
            <h1 className="text-4xl font-medium leading-[1.08] tracking-tight [animation:fadeSlideUp_0.8s_ease_0.4s_both] sm:text-6xl lg:text-7xl">
              Creadores que cobran.
              <br />
              Marcas que crecen.
            </h1>
          </div>

          <div>
            {/* CONTADOR CON META EN VIVO */}
            <div className="mb-6 max-w-md [animation:fadeSlideUp_0.8s_ease_0.6s_both]">
              <div className="flex items-end justify-between">
                <p className="text-sm font-medium uppercase tracking-widest text-white/70">
                  {role === 'creator' ? 'Creadores' : 'Empresas'}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {count ?? '—'}<span className="text-white/50">/{goal}</span>
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-cyan-500 transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/50">Cuando llegue a la meta, abrimos las puertas.</p>
            </div>

            <p className="mb-5 max-w-lg text-sm leading-relaxed text-white/60 [animation:fadeSlideUp_0.8s_ease_0.7s_both] sm:text-base">
              El marketplace que conecta creadores de contenido con marcas de toda Latinoamérica. Campañas pagas, contratos claros y cobros seguros.
            </p>
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-transform [animation:fadeSlideUp_0.8s_ease_0.9s_both] hover:scale-105"
            >
              Unirme a la lista <ArrowDown size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FORMULARIO / REFERIDOS ═══ */}
      <section id="anotarse" className="relative px-5 pb-24 pt-16">
        <div className="mx-auto w-full max-w-md">
          {joinedId ? (
            /* YA ANOTADO → referral destacado */
            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/20">
                  <Check className="h-5 w-5 text-cyan-300" />
                </span>
                <div>
                  <p className="text-lg font-semibold">Estás en la lista</p>
                  <p className="text-sm text-white/50">Te avisamos por email cuando te toque entrar.</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/[0.06] p-4">
                <p className="font-semibold">Invitá y entrá antes</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  Cada persona que se anote con tu link te sube en la fila — y acerca la meta para que abramos antes.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white/70">
                    {inviteLink}
                  </p>
                  <button onClick={copyLink} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <button onClick={() => refreshCount(joinedId)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-black/30 px-4 py-3 text-sm font-semibold">
                  <span className="flex items-center gap-2 text-white/80"><Users className="h-4 w-4 text-cyan-300" /> Invitados con tu link</span>
                  <span className="rounded-full bg-cyan-400/20 px-3 py-0.5 text-cyan-300">{referrals}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <h2 className="text-xl font-semibold">Unite a la lista de espera</h2>
              <p className="mt-1 text-sm text-white/50">Entrás con prioridad cuando abramos.</p>

              <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
                {([['creator', 'Soy creador'], ['company', 'Soy empresa']] as const).map(([v, t]) => (
                  <button key={v} onClick={() => setRole(v)}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition ${role === v ? 'bg-white text-black' : 'text-white/60'}`}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {role === 'creator' ? (
                  <>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu email" type="email" inputMode="email" autoCapitalize="none"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-white/40">¿Tenés experiencia creando contenido?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {EXPERIENCIA_CREADOR.map((o) => (
                          <button key={o.v} onClick={() => setExperience(o.v)}
                            className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition ${experience === o.v ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-white/60'}`}>
                            {o.t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nombre de tu empresa"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email de contacto" type="email" inputMode="email" autoCapitalize="none"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                    <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Nicho (apps, ecommerce, educación...)"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-white/40">¿Hicieron marketing con creadores antes?</p>
                      <div className="grid grid-cols-3 gap-2">
                        {EXPERIENCIA_EMPRESA.map((o) => (
                          <button key={o.v} onClick={() => setMkt(o.v)}
                            className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold transition ${mkt === o.v ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-white/60'}`}>
                            {o.t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && <p className="mt-3 text-center text-xs font-semibold text-red-400">{error}</p>}

              <button onClick={join} disabled={!canJoin || busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold text-black transition disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Unirme a la lista
              </button>
              {refId && <p className="mt-3 text-center text-xs font-semibold text-cyan-300">Venís invitado — entrás con prioridad.</p>}
            </div>
          )}

          <p className="mt-10 text-center text-[11px] text-white/30">Octopus — Creadores que cobran. Marcas que crecen.</p>
        </div>
      </section>

      {/* acceso con contraseña */}
      {showPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setShowPass(false)}>
          <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#0a2333] p-6" onClick={(e) => e.stopPropagation()}>
            <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4 text-cyan-300" /> Acceso del equipo</p>
            <div className="mt-4 flex items-center gap-2">
              <input value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()}
                placeholder="Contraseña" type="password" autoFocus
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
              <button onClick={unlock} disabled={passBusy || !pass}
                className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">
                {passBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
              </button>
            </div>
            {passError && <p className="mt-2 text-xs font-semibold text-red-400">{passError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WaitlistPage() {
  // useSearchParams necesita Suspense en Next 14
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#03141f]" />}>
      <WaitlistInner />
    </Suspense>
  )
}
