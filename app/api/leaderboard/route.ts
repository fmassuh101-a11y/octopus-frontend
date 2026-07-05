import { NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const dynamic = 'force-dynamic'

// GET /api/leaderboard — ranking público de creadores por trabajos completados.
// Usa la service key server-side y devuelve SOLO campos públicos (nunca email/phone).
export async function GET() {
  if (!SERVICE_KEY) return NextResponse.json({ creators: [] })
  const h = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }

  try {
    // perfiles de creadores (solo campos públicos)
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_type=eq.creator&select=user_id,full_name,username,avatar_url,profile_photo_url,tiktok,instagram,verified,location`,
      { headers: h, cache: 'no-store' }
    )
    const profiles: any[] = pRes.ok ? await pRes.json() : []

    // entregas aprobadas/completadas → contar por creador
    const dRes = await fetch(
      `${SUPABASE_URL}/rest/v1/content_deliveries?status=in.(approved,completed)&select=creator_id`,
      { headers: h, cache: 'no-store' }
    )
    const deliveries: any[] = dRes.ok ? await dRes.json() : []
    const counts = new Map<string, number>()
    for (const d of deliveries) counts.set(d.creator_id, (counts.get(d.creator_id) || 0) + 1)

    const creators = profiles
      .map((p) => ({
        user_id: p.user_id,
        name: p.full_name || p.username || 'Creador',
        avatar: p.profile_photo_url || p.avatar_url || null,
        tiktok: p.tiktok || null,
        instagram: p.instagram || null,
        verified: !!p.verified,
        location: p.location || null,
        completed: counts.get(p.user_id) || 0,
      }))
      .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name))
      .slice(0, 100)

    return NextResponse.json({ creators })
  } catch {
    return NextResponse.json({ creators: [] })
  }
}
