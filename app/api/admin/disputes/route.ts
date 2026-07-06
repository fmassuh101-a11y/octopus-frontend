import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { isAdminEmail } from '@/lib/isAdmin'
import { shieldAsync } from '@/lib/shield'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function requireAdmin(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user || !isAdminEmail((user as any).email)) return null
  return user
}

// GET: lista de disputas + nombres de los involucrados
export async function GET(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 15 })
  if (_blocked) return _blocked

  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const H = { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/disputes?select=*&order=created_at.desc`, { headers: H })
  const disputes = res.ok ? await res.json() : []

  const ids = Array.from(new Set(disputes.flatMap((d: any) => [d.opened_by, d.against]).filter(Boolean)))
  let names: Record<string, string> = {}
  if (ids.length > 0) {
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${ids.join(',')})&select=user_id,full_name,company_name,username`,
      { headers: H }
    )
    const profiles = pRes.ok ? await pRes.json() : []
    profiles.forEach((p: any) => { names[p.user_id] = p.company_name || p.full_name || p.username || 'Usuario' })
  }
  return NextResponse.json({ disputes, names })
}

// POST: resolver/descartar una disputa
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 15 })
  if (_blocked) return _blocked

  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { disputeId, status, resolution } = await request.json()
  if (!disputeId || !['resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/disputes?id=eq.${disputeId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, resolution: resolution || null, resolved_at: new Date().toISOString() }),
  })
  if (!res.ok) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ success: true })
}
