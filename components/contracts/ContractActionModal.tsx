'use client'

import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { toast } from '@/components/oct/toast'
import { connectTikTok } from '@/lib/tiktokConnect'
import { Loader2, X, Check } from 'lucide-react'

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

  // Al volver de TikTok, WhopChat.tsx reabre este modal con ?tiktok=...
  // en la URL (ver lib/tiktokConnect.ts) — acá se muestra el resultado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('tiktok')
    if (!result) return
    if (result === 'connected') toast('Cuenta conectada — verificando…')
    else toast(`No se pudo conectar la cuenta (${params.get('tiktokError') || 'error desconocido'})`, 'error')
    params.delete('tiktok')
    params.delete('tiktokError')
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
    const [cRows, hrRows] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}&select=*`, { headers: H }).then(r => r.ok ? r.json() : []),
      fetch(`${SUPABASE_URL}/rest/v1/handle_requests?contract_id=eq.${contractId}&select=*`, { headers: H }).then(r => r.ok ? r.json() : []),
    ])
    const c = cRows?.[0]
    setContract(c || null)
    setHandleRequest(hrRows?.[0] || null)
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

  // Navega derecho a TikTok (sin ventanita — no era confiable en celular) y
  // vuelve a este MISMO contrato apenas termine (ver lib/tiktokConnect.ts +
  // el useEffect de abajo que lee ?openContract=/&tiktok= al volver).
  const verify = () => {
    connectTikTok({ path: window.location.pathname, contractId })
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
              <button onClick={verify} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-3.5 font-bold text-white">
                <Check className="h-4 w-4" /> Verifica tus cuentas
              </button>
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
