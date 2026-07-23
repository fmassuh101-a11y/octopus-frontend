'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DeepOcean from '@/components/oct/DeepOcean'
import { Loader2, Check, Copy, Lock, ChevronRight, Users, ArrowDown, Building2, FileText, ShieldCheck } from 'lucide-react'
import { countries } from '@/lib/data/countries'

const COUNTRY_NAMES = Array.from(new Set(countries.map((c) => c.name))).sort((a, b) => a.localeCompare(b, 'es'))

// LISTA DE ESPERA v2 — inmersiva (océano profundo con canvas propio), contador
// con meta EN VIVO ("Creadores X/500"), formulario por rol y referral link
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

// misma regla que valida el servidor en /api/waitlist/join — acepta
// cualquier dominio real (no solo gmail.com) pero rechaza cosas como
// "algo@.com" que no tienen forma de email de verdad. Mostrarlo en el
// momento, no recién al mandar el formulario, para que se sienta tan
// pulido como cualquier otra app.
const EMAIL_RX = /^[^\s@]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

function WaitlistInner() {
  const params = useSearchParams()
  const refId = params.get('ref') || ''

  const [role, setRole] = useState<'creator' | 'company'>('creator')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [experience, setExperience] = useState('')
  const [country, setCountry] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [niche, setNiche] = useState('')
  const [mkt, setMkt] = useState('')
  const [source, setSource] = useState('')
  const [message, setMessage] = useState('')
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
      else if (d.notFound) {
        // el admin lo borró (ej. cuenta de prueba) — se limpia el
        // localStorage para poder anotarse de nuevo en este navegador
        localStorage.removeItem('oct-waitlist-id')
        setJoinedId('')
      }
    } catch {}
  }

  const join = async () => {
    setError('')
    setBusy(true)
    // sin esto, si el servidor se cuelga (ej. esperando al email) el botón
    // se queda girando para siempre — con AbortController cortamos el
    // pedido a los 20s pase lo que pase y liberamos el botón.
    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), 20000)
    try {
      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email, name, experience, country, companyName, niche, marketingExperience: mkt, source, message, ref: refId }),
        signal: timeout.signal,
      })
      const data = await res.json()
      if (data.ok && data.id) {
        localStorage.setItem('oct-waitlist-id', data.id)
        setJoinedId(data.id)
        setReferrals(data.referrals || 0)
        loadStats()
      } else setError(data.error || 'No se pudo guardar. Prueba de nuevo.')
    } catch { setError('No se pudo guardar. Prueba de nuevo.') }
    clearTimeout(timer)
    setBusy(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`Me anoté en Octapi, el marketplace donde los creadores monetizan haciendo clips y contenido. Súmate con mi link y entramos antes: ${inviteLink}`)
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
    } catch { setPassError('No se pudo validar. Prueba de nuevo.') }
    setPassBusy(false)
  }

  const emailValid = EMAIL_RX.test(email.trim())
  const canJoin = role === 'creator'
    ? name.trim() && emailValid && experience && country && source.trim() && message.trim()
    : companyName.trim() && emailValid && mkt && country && source.trim() && message.trim()

  const count = role === 'creator' ? stats?.creators : stats?.companies
  const goal = role === 'creator' ? stats?.goalCreators || 500 : stats?.goalCompanies || 50
  const pct = Math.min(100, Math.round(((count || 0) / goal) * 100))

  const scrollToForm = () => document.getElementById('anotarse')?.scrollIntoView({ behavior: 'smooth' })
  const scrollToCompanies = () => document.getElementById('para-empresas')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-[100dvh] bg-[#03141f] font-sans text-white">
      {/* ═══ HERO INMERSIVO (océano profundo) ═══ */}
      <section className="relative h-[100dvh] w-full overflow-hidden">
        {/* SEGURIDAD/CALIDAD (20 jul): el video de fondo mostraba un botón de
            play visible en celulares con Modo de Bajo Consumo — iOS bloquea
            el autoplay ahí pase lo que pase con los atributos, así que se ve
            roto de forma impredecible. Se saca del todo: el canvas propio
            (DeepOcean) es 100% confiable en cualquier dispositivo/batería. */}
        <DeepOcean />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-[#03141f]" />

        {/* nav — "Empresas" visible de entrada, arriba de todo (antes era
            un link chico al final del hero, muy escondido) */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <p className="text-lg font-semibold tracking-tight sm:text-xl">Octapi</p>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollToCompanies}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black shadow-lg transition hover:scale-105 hover:bg-white/90 sm:px-5 sm:text-base"
            >
              Empresas
            </button>
            <button
              onClick={() => setShowPass(true)}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
            >
              Acceso
            </button>
          </div>
        </div>

        {/* hero content — texto arriba, grande y visible; CTA centrado */}
        <div className="relative z-10 flex h-[calc(100dvh-80px)] flex-col px-6 pt-6 md:px-12 md:pt-10">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-medium text-white/90 drop-shadow [animation:fadeSlideUp_0.8s_ease_0.2s_both]">
              Lista de espera abierta — Latinoamérica
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight drop-shadow-lg [animation:fadeSlideUp_0.8s_ease_0.4s_both] sm:text-7xl lg:text-8xl">
              Creadores
              <br />
              que monetizan.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 drop-shadow [animation:fadeSlideUp_0.8s_ease_0.6s_both] sm:text-lg">
              El marketplace que conecta creadores de contenido con marcas de toda Latinoamérica. Campañas pagas, contratos claros y cobros seguros.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 drop-shadow [animation:fadeSlideUp_0.8s_ease_0.65s_both] sm:text-sm">
              No hace falta ser influencer — es para cualquiera que graba contenido real (UGC)
            </p>
          </div>

          <div className="mt-auto pb-12 text-center">
            {/* CONTADOR — SOLO CREADORES (meta única) */}
            <div className="mx-auto mb-7 max-w-md [animation:fadeSlideUp_0.8s_ease_0.7s_both]">
              <div className="flex items-end justify-between">
                <p className="text-sm font-semibold uppercase tracking-widest text-white/80 drop-shadow">Creadores</p>
                <p className="text-3xl font-bold tabular-nums drop-shadow">
                  {stats?.creators ?? '—'}<span className="text-white/50">/{stats?.goalCreators || 500}</span>
                </p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.8)] transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.round(((stats?.creators || 0) / (stats?.goalCreators || 500)) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/60">Cuando lleguemos a la meta, abrimos las puertas.</p>
            </div>

            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-black shadow-2xl transition-transform [animation:fadeSlideUp_0.8s_ease_0.9s_both] hover:scale-105"
            >
              Unirme a la lista <ArrowDown size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ PARA EMPRESAS — invitación explícita y formal (antes la página
          se leía como "solo para creadores"; las marcas quedaban como una
          opción escondida dentro del formulario) ═══ */}
      <section id="para-empresas" className="relative overflow-hidden border-y border-white/5 bg-[#04182a] px-5 py-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(16,185,129,0.14),transparent)]" />
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            <Building2 className="h-3.5 w-3.5" /> Para empresas y marcas
          </span>
          <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            ¿Tu empresa quiere crecer con creadores de contenido?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Octapi conecta a tu marca con creadores verificados de toda Latinoamérica, listos para producir contenido auténtico que convierte. Publicas tu campaña, revisas los perfiles que aplican y solo pagas por el contenido que apruebas — con un contrato claro desde el primer mensaje.
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <Users className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 font-semibold">Creadores verificados</p>
              <p className="mt-1 text-sm text-white/50">Perfiles reales, con redes conectadas y métricas visibles antes de contratar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <FileText className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 font-semibold">Contratos claros</p>
              <p className="mt-1 text-sm text-white/50">Condiciones, entregables y plazos por escrito antes de que empiece el trabajo.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 font-semibold">Pagos seguros</p>
              <p className="mt-1 text-sm text-white/50">Solo liberas el pago cuando apruebas el contenido entregado.</p>
            </div>
          </div>

          <button
            onClick={() => { setRole('company'); scrollToForm() }}
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-8 py-4 text-base font-semibold text-black shadow-2xl transition-transform hover:scale-105"
          >
            Postula tu empresa <ArrowDown size={18} />
          </button>
        </div>
      </section>

      {/* ═══ FORMULARIO / REFERIDOS ═══ */}
      <section id="anotarse" className="relative overflow-hidden px-5 pb-24 pt-20">
        {/* continuidad del océano: glow cian de fondo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(34,211,238,0.16),transparent)]" />
        <div className="relative mx-auto w-full max-w-lg">
          <h2 className="text-center text-3xl font-semibold [animation:fadeSlideUp_0.8s_ease_both] sm:text-4xl">Únete a la lista</h2>
          <p className="mt-2 text-center text-white/50">Entras con prioridad cuando abramos las puertas.</p>
          <div className="mt-8">
          {joinedId ? (
            /* YA ANOTADO → referral destacado */
            <div className="rounded-[28px] border border-cyan-400/20 bg-white/[0.07] p-7 shadow-[0_0_60px_-20px_rgba(34,211,238,0.4)] backdrop-blur">
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
                <p className="font-semibold">Invita y entra antes</p>
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
            <div className="rounded-[28px] border border-cyan-400/20 bg-white/[0.07] p-7 shadow-[0_0_60px_-20px_rgba(34,211,238,0.4)] backdrop-blur">
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
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
                    <div>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu email" type="email" inputMode="email" autoCapitalize="none"
                        className={`w-full rounded-2xl border bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none ${email && !emailValid ? 'border-red-400/60 focus:border-red-400/60' : 'border-white/10 focus:border-cyan-400/60'}`} />
                      {email && !emailValid && <p className="mt-1.5 px-1 text-xs font-semibold text-red-400">Ese email no parece válido — revisa que esté bien escrito.</p>}
                    </div>
                    <select value={country} onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/60 [&>option]:bg-[#062a3f]" style={{ color: country ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                      <option value="" disabled>¿De qué país eres?</option>
                      {COUNTRY_NAMES.map((c) => <option key={c} value={c} style={{ color: '#fff' }}>{c}</option>)}
                    </select>
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-white/40">¿Tienes experiencia creando contenido?</p>
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
                    <div>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email de contacto" type="email" inputMode="email" autoCapitalize="none"
                        className={`w-full rounded-2xl border bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none ${email && !emailValid ? 'border-red-400/60 focus:border-red-400/60' : 'border-white/10 focus:border-cyan-400/60'}`} />
                      {email && !emailValid && <p className="mt-1.5 px-1 text-xs font-semibold text-red-400">Ese email no parece válido — revisa que esté bien escrito.</p>}
                    </div>
                    <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Nicho (apps, ecommerce, educación...)"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                    <select value={country} onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/60 [&>option]:bg-[#062a3f]" style={{ color: country ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                      <option value="" disabled>¿En qué país está la empresa?</option>
                      {COUNTRY_NAMES.map((c) => <option key={c} value={c} style={{ color: '#fff' }}>{c}</option>)}
                    </select>
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

                {/* para ambos roles: dónde nos encontró (texto libre) y comentario libre, ambos obligatorios */}
                <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="¿Cómo nos encontraste?"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
                <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} placeholder="Cuéntanos algo — ¿por qué te interesa Octapi?" rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none focus:border-cyan-400/60" />
              </div>

              {error && <p className="mt-3 text-center text-xs font-semibold text-red-400">{error}</p>}

              <button onClick={join} disabled={!canJoin || busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold text-black transition disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Unirme a la lista
              </button>
              {refId && <p className="mt-3 text-center text-xs font-semibold text-cyan-300">Vienes invitado — entras con prioridad.</p>}
            </div>
          )}

          </div>
          <p className="mt-10 text-center text-[11px] text-white/30">Octapi — Creadores que monetizan. Marcas que crecen.</p>
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
