import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'
import { shield } from '@/lib/shield'

import { isAdminEmail } from '@/lib/isAdmin'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const VALID_PLANS = ['starter', 'pro', 'scale', 'enterprise']

/**
 * POST /api/admin/set-plan
 * Solo el admin puede regalar planes / poner descuentos a una empresa.
 * Body: { targetUserId, plan?, discountPercent?, gift? }
 */
export async function POST(request: NextRequest) {
  const _blocked = shield(request as unknown as Request, { limit: 15 })
  if (_blocked) return _blocked

  const limited = rateLimit(request, { limit: 30, name: 'admin-set-plan' })
  if (limited) return limited

  const user = await getAuthenticatedUser(request)
  if (!user || !isAdminEmail((user as any).email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (!SERVICE_KEY) {
    return NextResponse.json({ error: 'Falta service key en el servidor' }, { status: 500 })
  }

  const body = await request.json()
  const { targetUserId, plan, discountPercent, gift, grantBalance } = body
  if (!targetUserId) {
    return NextResponse.json({ error: 'Falta targetUserId' }, { status: 400 })
  }

  // Dar saldo a la wallet (para pruebas y depósitos manuales)
  if (grantBalance !== undefined) {
    const amount = Math.max(0, Number(grantBalance) || 0)
    const H = { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY, 'Content-Type': 'application/json' }
    const wRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${targetUserId}&select=id,balance`, { headers: H })
    const wallets = wRes.ok ? await wRes.json() : []
    if (wallets.length === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ user_id: targetUserId, user_type: 'company', balance: amount }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/wallets?id=eq.${wallets[0].id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ balance: Number(wallets[0].balance || 0) + amount, updated_at: new Date().toISOString() }),
      })
    }
    return NextResponse.json({ success: true, granted: amount })
  }

  const updates: any = {}
  if (plan !== undefined) {
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    updates.plan = plan
    // starter = cancelar/volver al plan base; si no, regalado o pagado
    updates.plan_source = plan === 'starter' ? 'default' : (gift ? 'gifted' : 'paid')
  }
  if (discountPercent !== undefined) {
    updates.discount_percent = Math.max(0, Math.min(100, Number(discountPercent) || 0))
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${targetUserId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
    }
  )
  if (!res.ok) {
    const t = await res.text()
    return NextResponse.json({ error: `Error: ${t}` }, { status: res.status })
  }
  const updated = await res.json()
  return NextResponse.json({ success: true, profile: Array.isArray(updated) ? updated[0] : updated })
}
