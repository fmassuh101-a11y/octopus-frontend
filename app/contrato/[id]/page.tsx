'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { toast } from '@/components/oct/toast'
import { Loader2, ChevronLeft, Check, X, Printer } from 'lucide-react'

// ══════════════════════════════════════════════════════════════════════════
//  ACUERDO DE PARTICIPACIÓN — documento formal del contrato (estilo SideShift,
//  redacción propia en español neutro LATAM). La empresa define los términos;
//  Octopus NO es parte del contrato (ver Adenda) — actúa solo como plataforma
//  intermediaria y agente de pagos. La aceptación electrónica del creador
//  queda registrada con fecha y equivale a una firma manuscrita.
//  NOTA: modelo base provisto por la plataforma; no constituye asesoría legal.
// ══════════════════════════════════════════════════════════════════════════

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', ugc: 'UGC (sin publicar)',
}

const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'aw5n2omdzbjx4xf8'

// Un solo toque: del botón "verifica tus cuentas" directo a la pantalla de
// TikTok pidiendo permiso — nada de mandar a la persona a buscar un botón
// en otra pantalla. Al volver, se auto-verifica sola contra cualquier
// contrato pendiente (ver app/auth/tiktok/callback/page.tsx).
function connectTikTokAndVerify() {
  const state = Math.random().toString(36).substring(2, 15)
  localStorage.setItem('tiktok_csrf_state', state)
  localStorage.setItem('tiktok_oauth_state', state)
  const redirectUri = encodeURIComponent('https://octopus-frontend-tau.vercel.app/')
  const scope = encodeURIComponent('user.info.basic,user.info.profile,user.info.stats,video.list')
  window.location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=${state}&disable_auto_auth=1`
}

export default function ContratoDocumento() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [companyName, setCompanyName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [creatorEmail, setCreatorEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // PROCESO DE FIRMA (estilo SideShift): al aceptar, el creador ingresa sus
  // handles de las plataformas del contrato; la empresa luego los aprueba;
  // recién ahí el creador puede verificarlos (conectar OAuth).
  const [showHandles, setShowHandles] = useState(false)
  const [handles, setHandles] = useState<Record<string, string>>({})
  const [handleRequest, setHandleRequest] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const userStr = localStorage.getItem('sb-user')
        if (!token || !userStr) { router.push('/auth/login'); return }
        const user = JSON.parse(userStr)
        setMe(user)
        const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
        const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${id}&select=*`, { headers: H })).json()
        const c = rows?.[0]
        if (!c) { setError('Contrato no encontrado o sin acceso'); setLoading(false); return }
        setContract(c)
        // nombres de las partes
        const profs = await (
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${c.company_id},${c.creator_id})&select=user_id,full_name,company_name,email`, { headers: H })
        ).json()
        for (const p of profs || []) {
          if (p.user_id === c.company_id) setCompanyName(p.company_name || p.full_name || 'La Empresa')
          if (p.user_id === c.creator_id) { setCreatorName(p.full_name || 'El Creador'); setCreatorEmail(p.email || '') }
        }
        const hrRows = await (
          await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?contract_id=eq.${id}&select=*`, { headers: H })
        ).json().catch(() => [])
        setHandleRequest(hrRows?.[0] || null)
      } catch { setError('No se pudo cargar el contrato') }
      setLoading(false)
    })()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const parse = (v: any) => { try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return null } }
  const deliverables: any[] = parse(contract?.deliverables) || []
  const usageRights: any = parse(contract?.usage_rights) || {}
  const hashtags: string[] = Array.isArray(contract?.hashtags) ? contract.hashtags : []
  const mentions: string[] = Array.isArray(contract?.mentions) ? contract.mentions : []
  const isCpm = usageRights?.payment_mode === 'cpm'
  const cpmRate = Number(usageRights?.cpm_rate || 0)
  const cpmMin = Number(usageRights?.cpm_min_views || 0)
  const cpmMax = Number(usageRights?.cpm_max_views || 0)
  const contractPlatforms: string[] = Array.from(new Set((deliverables || []).map((d: any) => d.platform).filter((p: string) => p && p !== 'ugc')))
  const signedHandles: any[] = parse(contract?.creator_handles) || []
  const isCompany = me?.id === contract?.company_id
  const isCreator = me?.id === contract?.creator_id
  const pending = contract?.status === 'pending' || contract?.status === 'sent'
  const fecha = (d?: string) => (d ? new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

  const reject = async () => {
    setBusy(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!res.ok) throw new Error()
      toast('Contrato rechazado')
      setContract((c: any) => ({ ...c, status: 'rejected' }))
    } catch { toast('No se pudo procesar', 'error') }
    setBusy(false)
  }

  // Firma del creador: handles + aceptación electrónica (estilo SideShift)
  const signWithHandles = async () => {
    setBusy(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const creatorHandles = Object.entries(handles)
        .filter(([, h]) => h.trim())
        .map(([platform, handle]) => ({ platform, handle: handle.trim().replace(/^@+/, '@') }))
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          creator_signed_at: new Date().toISOString(),
          creator_handles: JSON.stringify(creatorHandles),
        }),
      })
      if (!res.ok) throw new Error()

      // deja el registro real en handle_requests — sin esto la empresa no
      // tiene nada que aprobar y el creador nunca puede verificar sus
      // cuentas conectadas contra lo que acaba de escribir acá.
      try {
        const handlesForRequest = creatorHandles
          .filter((h) => h.platform !== 'ugc')
          .map((h) => ({ platform: h.platform, handle: h.handle, verified: false, verified_at: null, connected_username: null }))
        if (handlesForRequest.length > 0) {
          const hrCreate = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, Prefer: 'return=representation' },
            body: JSON.stringify({ contract_id: id, application_id: contract.application_id || null, handles: handlesForRequest, status: 'submitted', submitted_at: new Date().toISOString() }),
          })
          if (hrCreate.ok) setHandleRequest((await hrCreate.json())?.[0] || null)
          else console.error('[handle_requests] no se pudo crear:', hrCreate.status, await hrCreate.text())
        }
      } catch (e) { console.error('[handle_requests] error:', e) }

      // avisar a la empresa por el chat de Whop, CON link directo a este
      // mismo contrato — un toque desde el mensaje y ya está en la pantalla
      // de "Aprobar handles", sin tener que ir a buscarlo a otro lado.
      const handlesText = creatorHandles.map((h) => `${h.platform}: ${h.handle}`).join(', ')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://octapiapp.com'
      fetch('/api/whop/dm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: contract.company_id,
          content: `Firmé el contrato "${contract.title}".${handlesText ? `\nMis handles: ${handlesText}` : ''}\nApruébalos acá: ${appUrl}/contrato/${id}`,
        }),
      }).catch(() => {})
      toast('Contrato firmado')
      setShowHandles(false)
      setContract((c: any) => ({ ...c, status: 'accepted', accepted_at: new Date().toISOString(), creator_handles: JSON.stringify(creatorHandles) }))
    } catch { toast('No se pudo firmar', 'error') }
    setBusy(false)
  }

  // Aprobación de handles por la EMPRESA (cierra el proceso de firma Y
  // aprueba de verdad el registro que usa el creador para verificar sus
  // cuentas — antes esto solo cambiaba el estado del contrato, sin tocar
  // handle_requests, por eso nunca se podía verificar nada).
  const approveHandles = async () => {
    setBusy(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const now = new Date().toISOString()

      let hrId = handleRequest?.id
      if (!hrId) {
        // blindaje: si por algo no se creó al firmar, se crea acá mismo
        const handles = signedHandles
          .filter((h: any) => h.platform !== 'ugc')
          .map((h: any) => ({ platform: h.platform, handle: h.handle, verified: false, verified_at: null, connected_username: null }))
        if (handles.length > 0) {
          const createRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, Prefer: 'return=representation' },
            body: JSON.stringify({ contract_id: id, application_id: contract.application_id || null, handles, status: 'submitted', submitted_at: now }),
          })
          if (createRes.ok) hrId = (await createRes.json())?.[0]?.id
        }
      }
      if (hrId) {
        const hrRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${hrId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, Prefer: 'return=representation' },
          body: JSON.stringify({ company_approved_at: now, company_approved_by: me.id }),
        })
        if (hrRes.ok) setHandleRequest((await hrRes.json())?.[0] || null)
        else toast(`No se pudieron aprobar los handles: ${(await hrRes.text()).slice(0, 120)}`, 'error')
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!res.ok) throw new Error()
      const appUrl2 = process.env.NEXT_PUBLIC_APP_URL || 'https://octapiapp.com'
      fetch('/api/whop/dm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: contract.creator_id,
          content: `Aprobamos tus handles para "${contract.title}" — el contrato está EN MARCHA. Abre este mismo link y vas a ver el botón "Verifica tus cuentas": ${appUrl2}/contrato/${id}`,
        }),
      }).catch(() => {})
      toast('Handles aprobados — contrato en marcha')
      setContract((c: any) => ({ ...c, status: 'in_progress' }))
    } catch { toast('No se pudo aprobar', 'error') }
    setBusy(false)
  }

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
  }
  if (error || !contract) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 px-6 text-center text-sm font-semibold text-neutral-500">{error}</div>
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-200/70 pb-28 text-neutral-900 print:bg-white print:pb-0">
      {/* barra superior (no se imprime) */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden">
        <button
          onClick={() => {
            // router.back() no sirve si esta página se abrió directo desde
            // un link de mensaje (sin historial dentro de la app) — en ese
            // caso no hacía NADA y la persona quedaba sin forma de salir.
            if (typeof window !== 'undefined' && window.history.length > 1) router.back()
            else router.push(isCompany ? '/company/messages' : '/creator/messages')
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-extrabold leading-tight">Contrato: {contract.title}</p>
          <p className="text-xs text-neutral-500">
            Estado: {contract.status === 'accepted' ? 'Aceptado' : contract.status === 'rejected' ? 'Rechazado' : 'Pendiente de aceptación'}
          </p>
        </div>
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">
          <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
        </button>
      </div>

      {/* EL DOCUMENTO */}
      <div className="mx-auto my-6 w-full max-w-3xl bg-white px-8 py-10 shadow-xl print:my-0 print:max-w-none print:shadow-none sm:px-12">
        <p className="text-[11px] text-neutral-400">
          DOCUMENTO ID: {String(contract.id).slice(0, 18)} · Plataforma Octopus · {fecha(contract.created_at)}
        </p>

        <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight">ACUERDO DE PARTICIPACIÓN EN CAMPAÑA</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">Acuerdo de contratista independiente para creación de contenido</p>

        <p className="mt-6 text-sm leading-relaxed">
          <b>CONSIDERANDO</b> que <b>{companyName}</b> (la &quot;Empresa&quot;) opera la campaña &quot;{contract.title}&quot; y busca contratar creadores calificados para los entregables de la campaña; y
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          <b>CONSIDERANDO</b> que <b>{creatorName}</b> (el &quot;Creador&quot;) posee la habilidad y experiencia necesarias para producir los entregables contemplados en este Acuerdo;
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          <b>POR LO TANTO</b>, en consideración de las promesas y compromisos mutuos contenidos en este Acuerdo, las partes acuerdan lo siguiente:
        </p>

        {/* tabla de datos clave */}
        <table className="mt-6 w-full border-collapse border border-neutral-300 text-sm">
          <thead>
            <tr><th colSpan={2} className="border border-neutral-300 bg-neutral-50 px-3 py-2 text-center font-bold">Información Clave del Contrato</th></tr>
          </thead>
          <tbody>
            {[
              ['Empresa', companyName],
              ['Creador', creatorName],
              ['Email del Creador', creatorEmail || '—'],
              ['Campaña', contract.title],
              ['Compensación', isCpm
                ? `$${cpmRate} ${contract.payment_currency || 'USD'} por cada 1.000 visitas (CPM)`
                : `$${Number(contract.payment_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${contract.payment_currency || 'USD'}`],
              ['Fecha de Emisión', fecha(contract.created_at)],
              ['Fecha de Aceptación', contract.accepted_at ? fecha(contract.accepted_at) : 'Pendiente'],
            ].map(([k, v]) => (
              <tr key={k as string}>
                <td className="w-44 border border-neutral-300 px-3 py-2 font-bold">{k}</td>
                <td className="border border-neutral-300 px-3 py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* secciones */}
        <Section n={1} title="Definiciones">
          <li>&quot;Acuerdo&quot; significa este Acuerdo de Participación, incluyendo sus anexos.</li>
          <li>&quot;Entregables&quot; significa el contenido, piezas o servicios que el Creador producirá según los requisitos de la campaña.</li>
          <li>&quot;Políticas de Plataforma&quot; significa las reglas y términos de servicio de las redes sociales donde se publiquen los Entregables.</li>
        </Section>

        <Section n={2} title="Resumen de la Campaña">
          <p className="text-sm leading-relaxed">{contract.description || 'Según lo publicado por la Empresa en la campaña correspondiente dentro de la plataforma Octopus.'}</p>
        </Section>

        <Section n={3} title="Compensación y Pagos">
          {isCpm ? (
            <>
              <p className="text-sm leading-relaxed">
                Compensación <b>por rendimiento (CPM)</b>: la Empresa pagará al Creador <b>${cpmRate} {contract.payment_currency || 'USD'} por cada 1.000 visitas válidas</b> de cada Entregable aprobado. Las visitas se miden con las métricas nativas de la plataforma social durante los treinta (30) días posteriores a la publicación. El monto final se determina exclusivamente según las visitas reales — <b>no existe monto garantizado por adelantado</b>.
              </p>
              <table className="my-3 w-full border-collapse border border-neutral-300 text-sm">
                <tbody>
                  <tr><td className="w-56 border border-neutral-300 px-3 py-1.5 font-bold">Tarifa (CPM)</td><td className="border border-neutral-300 px-3 py-1.5">${cpmRate} {contract.payment_currency || 'USD'} / 1.000 visitas</td></tr>
                  {cpmMin > 0 && <tr><td className="border border-neutral-300 px-3 py-1.5 font-bold">Mínimo de elegibilidad</td><td className="border border-neutral-300 px-3 py-1.5">{cpmMin.toLocaleString('en-US')} visitas por Entregable</td></tr>}
                  {cpmMax > 0 && <tr><td className="border border-neutral-300 px-3 py-1.5 font-bold">Tope por Entregable</td><td className="border border-neutral-300 px-3 py-1.5">{cpmMax.toLocaleString('en-US')} visitas</td></tr>}
                </tbody>
              </table>
              <p className="text-sm leading-relaxed">
                Las visitas provenientes de tráfico incentivado, bots o actividad inválida quedan excluidas del cálculo. La Empresa podrá revisar la elegibilidad de cada Entregable conforme a los requisitos de la campaña.
              </p>
            </>
          ) : (
          <p className="text-sm leading-relaxed">
            La Empresa pagará al Creador <b>${Number(contract.payment_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {contract.payment_currency || 'USD'}</b> por los Entregables aprobados.
            {contract.payment_terms ? ` Condiciones: ${contract.payment_terms}` : ' El pago se libera una vez aprobado el contenido final.'}
          </p>
          )}
          <p className="mt-2 text-sm leading-relaxed">
            Los pagos se procesan a través de la infraestructura de pagos de la plataforma. La Empresa es responsable de fondear todos los pagos aprobados que se devenguen bajo este Acuerdo.
          </p>
        </Section>

        <Section n={4} title="Entregables y Requisitos">
          {deliverables.length > 0 && (
            <table className="mb-3 w-full border-collapse border border-neutral-300 text-sm">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="border border-neutral-300 px-3 py-1.5 text-left">Plataforma</th>
                  <th className="border border-neutral-300 px-3 py-1.5 text-left">Tipo</th>
                  <th className="border border-neutral-300 px-3 py-1.5 text-left">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d, i) => (
                  <tr key={i}>
                    <td className="border border-neutral-300 px-3 py-1.5">{PLATFORM_LABEL[d.platform] || d.platform}</td>
                    <td className="border border-neutral-300 px-3 py-1.5">{d.content_type}</td>
                    <td className="border border-neutral-300 px-3 py-1.5">{d.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hashtags.length > 0 && <li>Hashtags requeridos: {hashtags.join(', ')}</li>}
          {mentions.length > 0 && <li>Menciones requeridas: {mentions.join(', ')}</li>}
          {contract.instructions && <li>Instrucciones: {contract.instructions}</li>}
          <li>El Creador mantendrá cada Entregable aprobado públicamente accesible por al menos noventa (90) días desde su publicación, salvo requerimiento de la Empresa o de la plataforma social.</li>
        </Section>

        <Section n={5} title="Relación entre las Partes">
          <p className="text-sm leading-relaxed">
            El Creador participa como <b>contratista independiente</b> y no como empleado, agente o representante de la Empresa. Nada en este Acuerdo crea una sociedad, joint venture o relación laboral. El Creador es el único responsable de sus impuestos y obligaciones legales asociadas a sus servicios.
          </p>
        </Section>

        <Section n={6} title="Derechos de Uso del Contenido">
          <p className="text-sm leading-relaxed">
            El Creador conserva la titularidad de los Entregables originales. No obstante, el Creador otorga a la Empresa una licencia para usar, reproducir, exhibir y adaptar los Entregables con fines comerciales de la campaña{usageRights?.paid_ads ? ', incluyendo su uso en anuncios pagados (Paid Ads)' : ''}{usageRights?.whitelisting ? ', incluyendo whitelisting (publicación desde la cuenta del Creador)' : ''}.
          </p>
        </Section>

        <Section n={7} title="Plazo y Terminación">
          <li>Este Acuerdo rige desde la aceptación del Creador y hasta completarse los Entregables o su terminación anticipada.</li>
          <li>Cualquiera de las partes puede terminar este Acuerdo con aviso escrito si la otra incumple materialmente y no corrige dentro de cinco (5) días hábiles.</li>
          <li>Al terminar, el Creador será compensado por los Entregables aprobados hasta la fecha efectiva de terminación.</li>
        </Section>

        <Section n={8} title="Confidencialidad">
          <p className="text-sm leading-relaxed">
            El Creador mantendrá en confidencialidad la información no pública de la Empresa (briefs, tarifas, datos de audiencia) y la usará solo para cumplir este Acuerdo. Esta obligación sobrevive a la terminación.
          </p>
        </Section>

        <Section n={9} title="Responsabilidad">
          <p className="text-sm leading-relaxed">
            Salvo dolo o culpa grave, la responsabilidad total de cada parte bajo este Acuerdo no excederá los montos pagados o pagaderos por la Empresa bajo el mismo. Ninguna parte responderá por daños indirectos o consecuenciales.
          </p>
        </Section>

        <Section n={10} title="Disposiciones Generales">
          <p className="text-sm leading-relaxed">
            Este Acuerdo constituye el entendimiento completo entre las partes sobre su objeto. Las modificaciones deben constar por escrito (incluyendo medios electrónicos) y ser aceptadas por ambas partes. Si alguna disposición fuera inválida, las restantes conservarán plena vigencia. Este Acuerdo se rige por las leyes del domicilio principal de la Empresa.
          </p>
        </Section>

        {/* ADENDA OCTOPUS — el corazón legal (Octopus NO es parte) */}
        <div className="mt-8 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
          <p className="text-sm font-bold">Adenda de la Plataforma Octopus</p>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
            Las partes reconocen que <b>Octopus NO es parte de este Acuerdo</b> y no tiene obligación alguna de cumplimiento bajo el mismo. Octopus actúa únicamente como plataforma intermediaria y puede actuar como agente de pagos de la Empresa para transmitir fondos al Creador a través de infraestructura de pagos regulada de terceros. En la máxima medida permitida por la ley, Octopus no otorga garantías y no será responsable por daños directos o indirectos derivados de este Acuerdo o relacionados con él. La Empresa y el Creador mantendrán indemne a Octopus frente a reclamos de terceros derivados de sus respectivos incumplimientos. Octopus es tercero beneficiario de todas las secciones de este Acuerdo, con el derecho (pero no la obligación) de hacerlas valer. Este documento es un modelo base provisto por la plataforma y no constituye asesoría legal; las partes son libres de pactar términos adicionales por escrito.
          </p>
        </div>

        {/* firmas */}
        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-bold">Por la Empresa</p>
            <p className="mt-4 font-serif text-2xl italic">{companyName}</p>
            <div className="mt-2 border-t border-neutral-400 pt-1">
              <p className="text-sm font-bold">{companyName}</p>
              <p className="text-xs text-neutral-500">Fecha: {fecha(contract.created_at)}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">Por el Creador</p>
            {contract.status === 'accepted' ? (
              <p className="mt-4 font-serif text-2xl italic">{creatorName}</p>
            ) : (
              <p className="mt-4 text-2xl text-neutral-300">—</p>
            )}
            <div className="mt-2 border-t border-neutral-400 pt-1">
              <p className="text-sm font-bold">{creatorName}</p>
              <p className="text-xs text-neutral-500">Fecha: {contract.accepted_at ? fecha(contract.accepted_at) : 'Pendiente de aceptación'}</p>
              {signedHandles.length > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  Cuentas: {signedHandles.map((h: any) => `${h.platform} ${h.handle}`).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-neutral-400">
          La aceptación o firma electrónica capturada a través de la plataforma Octopus se considera equivalente a una firma manuscrita para todos los efectos legales.
        </p>
      </div>

      {/* acciones del creador (no se imprimen) */}
      {isCreator && pending && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur print:hidden">
          <div className="mx-auto flex w-full max-w-3xl gap-3">
            <button
              onClick={reject}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neutral-200 py-3.5 font-bold text-neutral-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Rechazar
            </button>
            <button
              onClick={() => setShowHandles(true)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white shadow-lg shadow-cyan-200 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Aceptar y firmar
            </button>
          </div>
        </div>
      )}

      {/* CREADOR: verificar cuentas — solo aparece una vez que la empresa
          aprobó los handles. Un solo botón: directo a TikTok pidiendo
          permiso, se verifica sola al volver (ver app/auth/tiktok/callback). */}
      {isCreator && contract.status !== 'rejected' && handleRequest?.company_approved_at && (
        Array.isArray(handleRequest.handles) && handleRequest.handles.length > 0 && handleRequest.handles.every((h: any) => h.verified) ? (
          <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur print:hidden">
            <p className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 font-bold text-emerald-600">
              <Check className="h-4 w-4" /> Tus cuentas están verificadas para este contrato
            </p>
          </div>
        ) : (
          <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur print:hidden">
            <div className="mx-auto w-full max-w-3xl text-center">
              <p className="mb-2 text-sm text-neutral-500">La empresa ya aprobó tus handles.</p>
              <button
                onClick={connectTikTokAndVerify}
                className="mx-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] px-6 py-3.5 font-bold text-white shadow-lg shadow-cyan-200"
              >
                <Check className="h-4 w-4" /> Verifica tus cuentas
              </button>
            </div>
          </div>
        )
      )}

      {/* EMPRESA: aprobar los handles del creador (cierra el proceso de firma) */}
      {isCompany && contract.status === 'accepted' && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur print:hidden">
          <div className="mx-auto w-full max-w-3xl">
            {signedHandles.length > 0 && (
              <p className="mb-2 text-center text-sm text-neutral-500">
                Handles del creador: <b>{signedHandles.map((h: any) => `${h.platform}: ${h.handle}`).join(' · ')}</b>
              </p>
            )}
            <button
              onClick={approveHandles}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white shadow-lg shadow-cyan-200 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar handles y poner en marcha
            </button>
          </div>
        </div>
      )}

      {/* PASO DE FIRMA DEL CREADOR: sus handles (estilo SideShift) */}
      {showHandles && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 print:hidden sm:items-center" onClick={() => setShowHandles(false)}>
          <div className="w-full max-w-md rounded-t-[28px] bg-white p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-extrabold">Firma con tus cuentas</p>
            <p className="mt-1 text-sm text-neutral-500">
              Escribe el handle de la cuenta desde la que vas a publicar. La empresa lo verá y lo aprobará.
            </p>
            <div className="mt-4 space-y-3">
              {(contractPlatforms.length ? contractPlatforms : ['tiktok']).map((p) => (
                <div key={p}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-400">{PLATFORM_LABEL[p] || p}</p>
                  <input
                    value={handles[p] || ''}
                    onChange={(e) => setHandles((h) => ({ ...h, [p]: e.target.value }))}
                    placeholder="@tucuenta"
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={signWithHandles}
              disabled={busy || (contractPlatforms.length > 0 && !contractPlatforms.some((p) => (handles[p] || '').trim()))}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white shadow-lg shadow-cyan-200 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Firmar contrato
            </button>
            <p className="mt-3 text-center text-[11px] text-neutral-400">
              Tu firma electrónica queda registrada con fecha y equivale a una firma manuscrita.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-base font-bold">{n}. {title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed marker:text-neutral-400">
        {children}
      </ul>
    </div>
  )
}
