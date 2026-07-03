import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'

const ADMIN_EMAIL = 'fmassuh133@gmail.com'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const VALID_PLANS = ['starter', 'pro', 'scale', 'enterprise']

/**
 * POST /api/admin/set-plan
 * Solo el admin puede regalar planes / poner descuentos a una empresa.
 * Body: { targetUserId, plan?, discountPercent?, gift? }
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 30, name: 'admin-set-plan' })
  if (limited) return limited

  const user = await getAuthenticatedUser(request)
  if (!user || (user as any).email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (!SERVICE_KEY) {
    return NextResponse.json({ error: 'Falta service key en el servidor' }, { status: 500 })
  }

  const body = await request.json()
  const { targetUserId, plan, discountPercent, gift } = body
  if (!targetUserId) {
    return NextResponse.json({ error: 'Falta targetUserId' }, { status: 400 })
  }

  const updates: any = {}
  if (plan !== undefined) {
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    updates.plan = plan
    updates.plan_source = gift ? 'gifted' : 'paid'
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
