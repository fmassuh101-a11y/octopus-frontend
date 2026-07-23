'use client'

import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { toast } from '@/components/oct/toast'
import { connectTikTok } from '@/lib/tiktokConnect'
import { connectYouTube } from '@/lib/youtubeConnect'
import { Loader2, X, Check, Link2, Eye, Heart } from 'lucide-react'

// Ventana de acción rápida para un contrato — se abre ENCIMA de donde estés
// (mensajes, donde sea), nunca navega a otra página. Para el documento legal
// completo sigue existiendo /contrato/[id], pero para el día a día (aceptar,
// aprobar handles, verificar cuentas) esto alcanza y es instantáneo.

const PLATFORM_LABEL: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', ugc: 'UGC (sin publicar)' }

export default function ContractActionModal({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const [me, setMe] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [companyName, setCompanyName] = useState('')
  const [handleRequest, setHandleRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [handles, setHandles] = useState<Record<string, string>>({})
  // Nueva/dedicada vs personal — determina cuánto ve la empresa después:
  // cuenta nueva = analítica completa (como hasta ahora); personal = SOLO
  // los videos puntuales que el creador comparta más adelante, nunca la
  // cuenta entera. Pedido explícito de Felipe, para proteger info personal.
  const [accountType, setAccountType] = useState<'new' | 'personal'>('new')
  const [sharedVideos, setSharedVideos] = useState<any[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [sharing, setSharing] = useState(false)

  // Al volver de TikTok o YouTube, WhopChat.tsx reabre este modal con
  // ?tiktok=... o ?youtube=... en la URL (ver lib/tiktokConnect.ts y
  // lib/youtubeConnect.ts) — acá se muestra el resultado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tiktokResult = params.get('tiktok')
    const youtubeResult = params.get('youtube')
    const result = tiktokResult || youtubeResult
    if (!result) return
    const platformLabel = tiktokResult ? 'TikTok' : 'YouTube'
    if (result === 'connected') toast('Cuenta conectada — verificando…')
    else toast(`No se pudo conectar ${platformLabel} (${params.get('tiktokError') || params.get('youtubeError') || 'error desconocido'})`, 'error')
    params.delete('tiktok')
    params.delete('tiktokError')
    params.delete('youtube')
    params.delete('youtubeError')
    params.delete('openContract')
    const qs = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (!token || !userStr) return
    const user = JSON.parse(userStr)
    setMe(user)
    const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
    const [cRows, hrRows, shareRows] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}&select=*`, { headers: H }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/handle_requests?contract_id=eq.${contractId}&select=*`, { headers: H }).then(r => r.ok ? r.json() : []),
      // puede no existir todavía si el SQL no se corrió — se trata como "sin videos", no como error
      fetch(`${SUPABASE_URL}/rest/v1/contract_video_shares?contract_id=eq.${contractId}&select=*&order=submitted_at.desc`, { headers: H }).then(r => r.ok ? r.json() : []),
    ])
    const c = cRows?.[0]
    setContract(c || null)
    setHandleRequest(hrRows?.[0] || null)
    setSharedVideos(shareRows || [])
    if (c) {
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${c.company_id}&select=company_name,full_name`, { headers: H })
      const [prof] = profRes.ok ? await profRes.json() : []
      setCompanyName(prof?.company_name || prof?.full_name || 'La empresa')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [contractId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
        <div className="rounded-3xl bg-white p-8" onClick={(e) => e.stopPropagation()}>
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      </div>
    )
  }
  if (!contract || !me) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold text-neutral-500">No se pudo cargar este contrato.</p>
          <button onClick={onClose} className="mt-4 w-full rounded-2xl border border-neutral-200 py-3 text-sm font-bold">Cerrar</button>
        </div>
      </div>
    )
  }

  const isCompany = me.id === contract.company_id
  const isCreator = me.id === contract.creator_id
  const usageRights = (() => { try { return typeof contract.usage_rights === 'string' ? JSON.parse(contract.usage_rights) : contract.usage_rights } catch { return {} } })() || {}
  const isCpm = usageRights?.payment_mode === 'cpm'
  const cpmRate = Number(usageRights?.cpm_rate || 0)
  const deliverables = (() => { try { return typeof contract.deliverables === 'string' ? JSON.parse(contract.deliverables) : contract.deliverables } catch { return [] } })() || []
  const platforms: string[] = Array.from(new Set(deliverables.map((d: any) => d.platform).filter((p: string) => p && p !== 'ugc')))
  const signedHandles = (() => { try { return typeof contract.creator_handles === 'string' ? JSON.parse(contract.creator_handles) : contract.creator_handles } catch { return [] } })() || []
  const allVerified = handleRequest?.handles?.length > 0 && handleRequest.handles.every((h: any) => h.verified)

  const token = () => localStorage.getItem('sb-access-token')

  const sign = async () => {
    const creatorHandles = Object.entries(handles).filter(([, h]) => h.trim()).map(([platform, handle]) => ({ platform, handle: handle.trim().replace(/^@+/, '@') }))
    if (platforms.length > 0 && creatorHandles.length === 0) { toast('Escribe al menos un handle', 'error'); return }
    setBusy(true)
    try {
      const t = token()
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted', accepted_at: new Date().toISOString(), creator_signed_at: new Date().toISOString(), creator_handles: JSON.stringify(creatorHandles) }),
      })
      if (!res.ok) throw new Error()
      if (creatorHandles.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/handle_requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, Prefer: 'return=representation' },
          body: JSON.stringify({ contract_id: contractId, application_id: contract.application_id || null, handles: creatorHandles.map(h => ({ ...h, accountType, verified: false, verified_at: null, connected_username: null })), status: 'submitted', submitted_at: new Date().toISOString() }),
        }).catch(() => {})
      }
      const handlesText = creatorHandles.map((h) => `${h.platform}: ${h.handle}`).join(', ')
      fetch('/api/whop/dm/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ userId: contract.company_id, content: `Firmé el contrato "${contract.title}".${handlesText ? `\nMis handles: ${handlesText}` : ''}\nYa puedes aprobarlos arriba de esta conversación.` }),
      }).catch(() => {})
      toast('Contrato firmado')
      await load()
    } catch { toast('No se pudo firmar', 'error') }
    setBusy(false)
  }

  const approve = async () => {
    setBusy(true)
    try {
      const t = token()
      const now = new Date().toISOString()
      let hrId = handleRequest?.id
      if (!hrId) {
        const hs = signedHandles.filter((h: any) => h.platform !== 'ugc').map((h: any) => ({ platform: h.platform, handle: h.handle, verified: false, verified_at: null, connected_username: null }))
        const createRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, Prefer: 'return=representation' },
          body: JSON.stringify({ contract_id: contractId, application_id: contract.application_id || null, handles: hs, status: 'submitted', submitted_at: now }),
        })
        if (createRes.ok) hrId = (await createRes.json())?.[0]?.id
      }
      if (hrId) {
        const hrRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${hrId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ company_approved_at: now, company_approved_by: me.id }),
        })
        if (!hrRes.ok) { toast(`No se pudo aprobar: ${(await hrRes.text()).slice(0, 120)}`, 'error'); setBusy(false); return }
      }
      await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      fetch('/api/whop/dm/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ userId: contract.creator_id, content: `Aprobamos tus handles para "${contract.title}" — el contrato está EN MARCHA. Vas a ver el botón "Verifica tus cuentas" arriba de esta conversación.` }),
      }).catch(() => {})
      toast('Handles aprobados — contrato en marcha')
      await load()
    } catch { toast('No se pudo aprobar', 'error') }
    setBusy(false)
  }

  // Navega derecho a la plataforma que corresponda (sin ventanita — no era
  // confiable en celular) y vuelve a este MISMO contrato apenas termine (ver
  // lib/tiktokConnect.ts, lib/youtubeConnect.ts + el useEffect de abajo que
  // lee ?openContract=/&tiktok=/&youtube= al volver). Un botón por cada
  // plataforma que el contrato pide y todavía no está verificada — antes
  // esto solo mandaba a TikTok sin importar qué plataforma faltaba.
  const unverifiedPlatforms = Array.from(new Set((handleRequest?.handles || []).filter((h: any) => !h.verified).map((h: any) => h.platform))) as string[]
  const verifyPlatform = (platform: string) => {
    if (platform === 'tiktok') connectTikTok({ path: window.location.pathname, contractId })
    else if (platform === 'youtube') connectYouTube({ path: window.location.pathname, contractId })
  }

  // Manda el link a TikTok mismo (con el token de la cuenta ya conectada)
  // para confirmar que el video es de verdad tuyo antes de guardarlo — la
  // empresa nunca ve un link que no haya pasado por acá.
  const shareVideo = async () => {
    if (!videoUrl.trim()) return
    setSharing(true)
    try {
      const t = token()
      const res = await fetch('/api/handle-requests/share-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ contractId, videoUrl: videoUrl.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast(data.error || 'No se pudo compartir el video', 'error'); setSharing(false); return }
      toast('Video compartido con la empresa')
      setVideoUrl('')
      await load()
    } catch { toast('No se pudo compartir el video', 'error') }
    setSharing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-600">Contrato</p>
            <h2 className="text-lg font-extrabold leading-tight">{contract.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-neutral-100 p-2"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs font-bold uppercase text-neutral-400">Pago</p>
          {isCpm ? (
            <p className="mt-1 text-xl font-extrabold">${cpmRate} <span className="text-sm font-bold text-neutral-500">por cada 1.000 visitas</span></p>
          ) : (
            <p className="mt-1 text-xl font-extrabold">${Number(contract.payment_amount || 0)} {contract.payment_currency || 'USD'}</p>
          )}
        </div>

        {/* CREADOR: firmar */}
        {isCreator && (contract.status === 'pending' || contract.status === 'sent') && (
          <div className="mt-5">
            <p className="text-sm font-bold">¿Qué tipo de cuenta vas a usar?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('new')}
                className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${accountType === 'new' ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-neutral-200 text-neutral-500'}`}
              >
                Nueva
                <span className="mt-0.5 block font-semibold text-[11px] normal-case text-neutral-400">Dedicada para {companyName || 'esta empresa'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('personal')}
                className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${accountType === 'personal' ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-neutral-200 text-neutral-500'}`}
              >
                Personal
                <span className="mt-0.5 block font-semibold text-[11px] normal-case text-neutral-400">Ya la usas para todo</span>
              </button>
            </div>
            {accountType === 'personal' && (
              <p className="mt-2 text-[11px] font-semibold text-neutral-400">
                {companyName || 'La empresa'} solo va a ver los videos puntuales que compartas para este contrato, nunca el resto de tu cuenta.
              </p>
            )}
            <p className="mt-4 text-sm font-bold">Tus cuentas</p>
            <div className="mt-2 space-y-2">
              {(platforms.length ? platforms : ['tiktok']).map((p) => (
                <input key={p} value={handles[p] || ''} onChange={(e) => setHandles((h) => ({ ...h, [p]: e.target.value }))}
                  placeholder={`${PLATFORM_LABEL[p] || p}: @tucuenta`}
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400" />
              ))}
            </div>
            <button onClick={sign} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aceptar y firmar
            </button>
          </div>
        )}

        {/* EMPRESA: aprobar handles */}
        {isCompany && contract.status === 'accepted' && (
          <div className="mt-5">
            <p className="text-sm font-bold">Handles del creador</p>
            <div className="mt-2 space-y-2">
              {signedHandles.map((h: any, i: number) => (
                <div key={i} className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm"><b>{PLATFORM_LABEL[h.platform] || h.platform}:</b> {h.handle}</div>
              ))}
            </div>
            <button onClick={approve} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar handles
            </button>
          </div>
        )}

        {/* CREADOR: verificar cuentas */}
        {isCreator && handleRequest?.company_approved_at && (
          <div className="mt-5">
            {allVerified ? (
              <p className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3.5 font-bold text-emerald-600"><Check className="h-4 w-4" /> Tus cuentas están verificadas</p>
            ) : (
              <div className="space-y-2">
                {unverifiedPlatforms.map((p) => (
                  p === 'tiktok' || p === 'youtube' ? (
                    <button key={p} onClick={() => verifyPlatform(p)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white">
                      <Check className="h-4 w-4" /> Verifica tu cuenta de {PLATFORM_LABEL[p] || p}
                    </button>
                  ) : (
                    <p key={p} className="rounded-2xl bg-neutral-50 py-3 text-center text-xs font-semibold text-neutral-400">
                      {PLATFORM_LABEL[p] || p}: todavía no se puede verificar automáticamente
                    </p>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREADOR: compartir videos — recién disponible una vez verificado.
            La empresa SOLO ve lo que aparece acá (ver contract_video_shares). */}
        {isCreator && allVerified && (
          <div className="mt-5">
            <p className="text-sm font-bold">Comparte tu video</p>
            <p className="mt-1 text-xs text-neutral-400">
              {companyName || 'La empresa'} solo va a ver los videos que compartas acá — pegá el link completo de TikTok.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@tucuenta/video/..."
                className="min-w-0 flex-1 rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400"
              />
              <button
                onClick={shareVideo}
                disabled={sharing || !videoUrl.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Enviar
              </button>
            </div>

            {sharedVideos.length > 0 && (
              <div className="mt-3 space-y-2">
                {sharedVideos.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
                    {v.stats?.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.stats.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{v.stats?.title || 'Video'}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {v.stats?.views || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {v.stats?.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {contract.status === 'in_progress' && !(isCreator && handleRequest && !allVerified) && (
          <p className="mt-5 rounded-2xl bg-cyan-50 py-3.5 text-center text-sm font-bold text-cyan-700">Contrato en marcha</p>
        )}
      </div>
    </div>
  )
}
