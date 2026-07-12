'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Sky from '@/components/oct/Sky'
import { Loader2, Check, Copy, Lock, ChevronRight, Users, Megaphone } from 'lucide-react'

// LISTA DE ESPERA — muro de lanzamiento. Toda la app vive detrás de esto
// (middleware.ts). Anotarse como creador o empresa + link de invitación viral.
// Acceso con contraseña (equipo) abajo. Identidad océano, sin emojis.

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

  // estado post-inscripción
  const [joinedId, setJoinedId] = useState('')
  const [referrals, setReferrals] = useState(0)
  const [copied, setCopied] = useState(false)

  // acceso con contraseña (equipo)
  const [showPass, setShowPass] = useState(false)
  const [pass, setPass] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passError, setPassError] = useState('')

  // si ya se anotó en este navegador, mostrar su link directo
  useEffect(() => {
    const saved = localStorage.getItem('oct-waitlist-id')
    if (saved) { setJoinedId(saved); refreshCount(saved) }
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
        body: JSON.stringify({
          role, email, name, experience,
          companyName, niche, marketingExperience: mkt,
          ref: refId,
        }),
      })
      const data = await res.json()
      if (data.ok && data.id) {
        localStorage.setItem('oct-waitlist-id', data.id)
        setJoinedId(data.id)
        setReferrals(data.referrals || 0)
      } else {
        setError(data.error || 'No se pudo guardar. Probá de nuevo.')
      }
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    }
    setBusy(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`Me anoté en Octopus, el marketplace donde creadores cobran por hacer clips y contenido. Anotate con mi link y entramos antes: ${inviteLink}`)
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
      if (data.ok) { window.location.href = '/' ; return }
      setPassError(data.error || 'Contraseña incorrecta')
    } catch { setPassError('No se pudo validar. Probá de nuevo.') }
    setPassBusy(false)
  }

  const canJoin = role === 'creator'
    ? name.trim() && email.trim() && experience
    : companyName.trim() && email.trim() && mkt

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#F7FAFD] pb-16 text-neutral-900">
      <Sky height={300} />

      <div className="relative mx-auto w-full max-w-md px-5 pt-12 md:max-w-2xl md:pt-16">
        {/* marca */}
        <p className="text-center text-3xl font-black tracking-tight text-white drop-shadow-sm md:text-4xl">Octopus</p>
        <p className="mx-auto mt-2 w-fit rounded-full bg-white/25 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur">
          Lista de espera
        </p>

        <h1 className="mt-8 text-center text-3xl font-black leading-tight md:mt-10 md:text-5xl">
          Creadores que cobran.
          <br />
          Marcas que crecen.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-neutral-500 md:text-base">
          Estamos abriendo Octopus de a poco. Anotate y te avisamos apenas te toque entrar.
        </p>

        {/* tarjeta principal */}
        <div className="mx-auto mt-8 w-full max-w-md rounded-[28px] border border-neutral-100 bg-white p-5 shadow-[0_20px_60px_-20px_rgba(8,145,178,0.25)] md:max-w-lg md:p-6">
          {joinedId ? (
            /* ─── YA ANOTADO: link viral ─── */
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50">
                  <Check className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-lg font-extrabold leading-tight">Estás en la lista</p>
                  <p className="text-sm text-neutral-500">Te avisamos por email cuando abramos.</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-[#F0FAFB] p-4">
                <p className="text-sm font-extrabold">Invitá gente y entrá antes</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Cada persona que se anote con tu link te sube en la fila. Compartilo donde quieras.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-600">
                    {inviteLink}
                  </p>
                  <button
                    onClick={copyLink}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <button
                  onClick={() => refreshCount(joinedId)}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-600" /> Invitados con tu link
                  </span>
                  <span className="rounded-full bg-teal-50 px-3 py-0.5 text-teal-700">{referrals}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ─── FORMULARIO ─── */
            <div>
              {/* selector de rol */}
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1">
                {([['creator', 'Soy creador'], ['company', 'Soy empresa']] as const).map(([v, t]) => (
                  <button
                    key={v}
                    onClick={() => setRole(v)}
                    className={`rounded-xl py-2.5 text-sm font-bold transition ${
                      role === v ? 'bg-white shadow-sm' : 'text-neutral-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {role === 'creator' ? (
                  <>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm font-semibold outline-none focus:border-teal-400"
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Tu email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm font-semibold outline-none focus:border-teal-400"
                    />
                    <div>
                      <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                        ¿Tenés experiencia creando contenido?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {EXPERIENCIA_CREADOR.map((o) => (
                          <button
                            key={o.v}
                            onClick={() => setExperience(o.v)}
                            className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${
                              experience === o.v
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-neutral-200 text-neutral-600'
                            }`}
                          >
                            {o.t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nombre de tu empresa"
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm font-semibold outline-none focus:border-teal-400"
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email de contacto"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm font-semibold outline-none focus:border-teal-400"
                    />
                    <input
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="Nicho (apps, ecommerce, educación...)"
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm font-semibold outline-none focus:border-teal-400"
                    />
                    <div>
                      <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                        ¿Hicieron marketing con creadores antes?
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {EXPERIENCIA_EMPRESA.map((o) => (
                          <button
                            key={o.v}
                            onClick={() => setMkt(o.v)}
                            className={`rounded-2xl border px-3 py-3 text-center text-xs font-bold transition ${
                              mkt === o.v
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-neutral-200 text-neutral-600'
                            }`}
                          >
                            {o.t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && <p className="mt-3 text-center text-xs font-bold text-red-500">{error}</p>}

              <button
                onClick={join}
                disabled={!canJoin || busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 text-sm font-extrabold text-white transition disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Unirme a la lista
              </button>
              {refId && (
                <p className="mt-3 text-center text-xs font-semibold text-teal-600">
                  Venís invitado — entrás con prioridad.
                </p>
              )}
            </div>
          )}
        </div>

        {/* por qué anotarse */}
        <div className="mx-auto mt-6 grid w-full max-w-md grid-cols-2 gap-3 md:max-w-lg">
          <div className="rounded-2xl border border-neutral-100 bg-white p-4">
            <Megaphone className="h-5 w-5 text-teal-600" />
            <p className="mt-2 text-sm font-extrabold">Marcas reales</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">Campañas pagas de apps y negocios de LATAM.</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-white p-4">
            <Users className="h-5 w-5 text-teal-600" />
            <p className="mt-2 text-sm font-extrabold">Cobrás en USD</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">Retiros seguros a tu banco, donde estés.</p>
          </div>
        </div>

        {/* acceso equipo */}
        <div className="mt-10 text-center">
          {showPass ? (
            <div className="mx-auto flex max-w-xs items-center gap-2">
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && unlock()}
                placeholder="Contraseña de acceso"
                type="password"
                className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-400"
              />
              <button
                onClick={unlock}
                disabled={passBusy || !pass}
                className="shrink-0 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {passBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPass(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400"
            >
              <Lock className="h-3 w-3" /> Tengo contraseña de acceso
            </button>
          )}
          {passError && <p className="mt-2 text-xs font-bold text-red-500">{passError}</p>}
        </div>
      </div>
    </div>
  )
}

export default function WaitlistPage() {
  // useSearchParams necesita Suspense en Next 14 (si no, rompe el prerender)
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F7FAFD]" />}>
      <WaitlistInner />
    </Suspense>
  )
}
