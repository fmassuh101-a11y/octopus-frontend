import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * POST /api/team/invite
 * Invita a un usuario al equipo SIN exponer su email al cliente.
 * El email se resuelve server-side con la service key.
 * Body: { targetUserId, role, permissions }
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, name: 'team-invite' })
  if (limited) return limited

  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Config del servidor incompleta' }, { status: 500 })

  const { targetUserId, role = 'editor', permissions = [] } = await request.json()
  if (!targetUserId) return NextResponse.json({ error: 'Falta el usuario' }, { status: 400 })
  if (targetUserId === user.id) return NextResponse.json({ error: 'No puedes invitarte a ti mismo' }, { status: 400 })

  const H = { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }

  // Resolver el email del invitado server-side (nunca viaja al navegador del que busca)
  const pRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${targetUserId}&select=email,full_name,username`,
    { headers: H }
  )
  if (!pRes.ok) return NextResponse.json({ error: 'No se pudo encontrar al usuario' }, { status: 404 })
  const profiles = await pRes.json()
  const target = profiles[0]
  if (!target?.email) return NextResponse.json({ error: 'Ese usuario no tiene email registrado' }, { status: 404 })

  // Evitar duplicados
  const dupRes = await fetch(
    `${SUPABASE_URL}/rest/v1/team_members?company_id=eq.${user.id}&email=eq.${encodeURIComponent(target.email.toLowerCase())}&select=id`,
    { headers: H }
  )
  const dups = dupRes.ok ? await dupRes.json() : []
  if (dups.length > 0) return NextResponse.json({ error: 'Esa persona ya está en tu equipo' }, { status: 409 })

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({
      company_id: user.id,
      email: target.email.toLowerCase(),
      name: target.full_name || target.username || null,
      member_user_id: targetUserId,
      role,
      permissions,
      status: 'invited',
    }),
  })
  if (!insRes.ok) return NextResponse.json({ error: 'No se pudo crear la invitación' }, { status: 500 })
  const created = await insRes.json()
  const m = Array.isArray(created) ? created[0] : created
  // Devolver SIN el email
  return NextResponse.json({
    member: { id: m.id, name: m.name, role: m.role, permissions: m.permissions, status: m.status, created_at: m.created_at },
  })
}
