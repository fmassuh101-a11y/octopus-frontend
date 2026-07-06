import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { isAdminEmail } from '@/lib/isAdmin'
import { shield } from '@/lib/shield'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// GET /api/admin/contact — solo admin: lista de solicitudes "Hablemos"
export async function GET(request: NextRequest) {
  const _blocked = shield(request as unknown as Request, { limit: 15 })
  if (_blocked) return _blocked

  const user = await getAuthenticatedUser(request)
  if (!user || !isAdminEmail((user as any).email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Falta service key' }, { status: 500 })

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contact_requests?select=*&order=created_at.desc`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  )
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return NextResponse.json({ requests: await res.json() })
}

// POST /api/admin/contact — el admin envía una oferta a medida a una solicitud
export async function POST(request: NextRequest) {
  const _blocked = shield(request as unknown as Request, { limit: 15 })
  if (_blocked) return _blocked

  const user = await getAuthenticatedUser(request)
  if (!user || !isAdminEmail((user as any).email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Falta service key' }, { status: 500 })

  const { requestId, offer_price, offer_commission, offer_seats, offer_message } = await request.json()
  if (!requestId) return NextResponse.json({ error: 'Falta la solicitud' }, { status: 400 })

  const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offer_price: offer_price || null,
      offer_commission: offer_commission || null,
      offer_seats: offer_seats || null,
      offer_message: offer_message || null,
      offer_status: 'offered',
    }),
  })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
  return NextResponse.json({ success: true })
}
