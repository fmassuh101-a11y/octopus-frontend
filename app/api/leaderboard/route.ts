import { NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { computeXP, getLevel } from '@/lib/xp'
import { shield } from '@/lib/shield'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const dynamic = 'force-dynamic'

// GET /api/leaderboard — ranking público de creadores por XP.
// Service key server-side, SOLO campos públicos (nunca email/phone).
export async function GET(_req: Request) {
  const _blocked = shield(_req as unknown as Request, { limit: 30 })
  if (_blocked) return _blocked

  if (!SERVICE_KEY) return NextResponse.json({ creators: [] })
  const h = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }

  try {
    const [pRes, aRes, dRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?user_type=eq.creator&select=user_id,full_name,username,avatar_url,profile_photo_url,tiktok,instagram,youtube,verified,location`, { headers: h, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/applications?select=creator_id,status`, { headers: h, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?status=in.(approved,completed)&select=creator_id`, { headers: h, cache: 'no-store' }),
    ])
    const profiles: any[] = pRes.ok ? await pRes.json() : []
    const apps: any[] = aRes.ok ? await aRes.json() : []
    const delivs: any[] = dRes.ok ? await dRes.json() : []

    const total = new Map<string, number>()
    const accepted = new Map<string, number>()
    for (const a of apps) {
      total.set(a.creator_id, (total.get(a.creator_id) || 0) + 1)
      if (a.status === 'accepted' || a.status === 'completed') accepted.set(a.creator_id, (accepted.get(a.creator_id) || 0) + 1)
    }
    const completed = new Map<string, number>()
    for (const d of delivs) completed.set(d.creator_id, (completed.get(d.creator_id) || 0) + 1)

    const creators = profiles
      .map((p) => {
        const xp = computeXP({
          applications: total.get(p.user_id) || 0,
          accepted: accepted.get(p.user_id) || 0,
          completed: completed.get(p.user_id) || 0,
          hasPhoto: !!(p.profile_photo_url || p.avatar_url),
          hasSocials: !!(p.tiktok || p.instagram || p.youtube),
        })
        return {
          user_id: p.user_id,
          name: p.full_name || p.username || 'Creador',
          avatar: p.profile_photo_url || p.avatar_url || null,
          tiktok: p.tiktok || null,
          verified: !!p.verified,
          location: p.location || null,
          completed: completed.get(p.user_id) || 0,
          xp,
          level: getLevel(xp).level.name,
        }
      })
      .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
      .slice(0, 100)

    return NextResponse.json({ creators })
  } catch {
    return NextResponse.json({ creators: [] })
  }
}
