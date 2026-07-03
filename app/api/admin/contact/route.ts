import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { isAdminEmail } from '@/lib/isAdmin'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// GET /api/admin/contact — solo admin: lista de solicitudes "Hablemos"
export async function GET(request: NextRequest) {
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
