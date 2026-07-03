import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

// El "espacio de trabajo activo" es la empresa en la que estás operando.
// Por defecto = tu propia cuenta. Si te cambiaste a una empresa donde te
// invitaron, se guarda acá y las páginas de empresa usan ese id.

const KEY = 'octopus-active-company'

export interface Workspace { id: string; name: string; own: boolean }

export function getActiveCompany(): { id: string; name: string } | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export function setActiveCompany(c: { id: string; name: string } | null) {
  if (c) localStorage.setItem(KEY, JSON.stringify(c))
  else localStorage.removeItem(KEY)
}

// Id de la empresa en la que estás actuando (workspace activo o tu propia cuenta)
export function getActiveCompanyId(ownUserId: string): string {
  return getActiveCompany()?.id || ownUserId
}

// Lista de espacios: tu cuenta + empresas donde te aceptaron como miembro
export async function loadWorkspaces(
  ownUserId: string, ownName: string, email: string, token: string
): Promise<Workspace[]> {
  const spaces: Workspace[] = [{ id: ownUserId, name: ownName || 'Mi cuenta', own: true }]
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/team_members?email=eq.${encodeURIComponent(email.toLowerCase())}&status=eq.accepted&select=company_id`,
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
    )
    if (res.ok) {
      const rows = await res.json()
      const ids = Array.from(new Set(rows.map((r: any) => r.company_id))).filter((id): id is string => !!id && id !== ownUserId)
      if (ids.length > 0) {
        const pRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${ids.join(',')})&select=user_id,company_name,full_name`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        const profiles = pRes.ok ? await pRes.json() : []
        const nameOf = new Map(profiles.map((p: any) => [p.user_id, p.company_name || p.full_name || 'Empresa']))
        ids.forEach(id => spaces.push({ id, name: (nameOf.get(id) as string) || 'Empresa', own: false }))
      }
    }
  } catch (e) { console.error('loadWorkspaces', e) }
  return spaces
}

// Invitaciones pendientes para mí (por email)
export async function loadPendingInvites(email: string, token: string) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/team_members?email=eq.${encodeURIComponent(email.toLowerCase())}&status=eq.invited&select=id,company_id`,
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
    )
    if (!res.ok) return []
    const rows = await res.json()
    if (rows.length === 0) return []
    const ids = Array.from(new Set(rows.map((r: any) => r.company_id)))
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${ids.join(',')})&select=user_id,company_name,full_name`,
      { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
    )
    const profiles = pRes.ok ? await pRes.json() : []
    const nameOf = new Map(profiles.map((p: any) => [p.user_id, p.company_name || p.full_name || 'Empresa']))
    return rows.map((r: any) => ({ id: r.id, companyId: r.company_id, companyName: (nameOf.get(r.company_id) as string) || 'Empresa' }))
  } catch (e) { return [] }
}

export async function acceptInvite(inviteId: string, myUserId: string, token: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members?id=eq.${inviteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ status: 'accepted', member_user_id: myUserId }),
  })
  return res.ok
}
