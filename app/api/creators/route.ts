import { NextResponse } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { shield } from '@/lib/shield'

export async function GET(_req: Request) {
  const _blocked = shield(_req as unknown as Request, { limit: 30 })
  if (_blocked) return _blocked

  try {
    // Fetch all creator profiles
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_type=eq.creator&select=id,user_id,full_name,avatar_url,bio`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch creators:', response.status)
      return NextResponse.json({ creators: [] })
    }

    const profiles = await response.json()
    const creatorsWithTikTok: any[] = []

    for (const profile of profiles) {
      try {
        const bioData = profile.bio ? JSON.parse(profile.bio) : {}
        const tiktokAccounts = bioData.tiktokAccounts || []

        if (tiktokAccounts.length > 0) {
          const totalFollowers = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.followers || 0), 0)
          const totalLikes = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.likes || 0), 0)
          const totalVideos = tiktokAccounts.reduce((sum: number, a: any) => sum + (a.videoCount || 0), 0)
          const avgEngagement = tiktokAccounts.length > 0
            ? tiktokAccounts.reduce((sum: number, a: any) => sum + (a.engagementRate || 0), 0) / tiktokAccounts.length
            : 0
          const avgViews = tiktokAccounts.length > 0
            ? tiktokAccounts.reduce((sum: number, a: any) => sum + (a.avgViews || 0), 0) / tiktokAccounts.length
            : 0

          const primaryAccount = tiktokAccounts[0]

          creatorsWithTikTok.push({
            id: profile.id,
            userId: profile.user_id,
            username: primaryAccount.username || bioData.tiktok || 'creator',
            displayName: bioData.firstName && bioData.lastName
              ? `${bioData.firstName} ${bioData.lastName}`
              : primaryAccount.displayName || profile.full_name || 'Creator',
            avatarUrl: primaryAccount.avatarUrl || profile.avatar_url,
            bio: primaryAccount.bio || bioData.about || '',
            isVerified: primaryAccount.isVerified || false,
            followers: totalFollowers,
            following: tiktokAccounts.reduce((sum: number, a: any) => sum + (a.following || 0), 0),
            likes: totalLikes,
            videoCount: totalVideos,
            avgViews: Math.round(avgViews),
            avgLikes: Math.round(tiktokAccounts.reduce((sum: number, a: any) => sum + (a.avgLikes || 0), 0) / tiktokAccounts.length) || 0,
            avgComments: Math.round(tiktokAccounts.reduce((sum: number, a: any) => sum + (a.avgComments || 0), 0) / tiktokAccounts.length) || 0,
            engagementRate: parseFloat(avgEngagement.toFixed(2)),
            recentVideos: tiktokAccounts.flatMap((a: any) => a.recentVideos || []).slice(0, 6),
            niche: bioData.niche || bioData.categories?.[0] || null,
            location: bioData.city && bioData.country ? `${bioData.city}, ${bioData.country}` : bioData.country || null,
          })
        }
      } catch (e) {
        // Skip profiles with invalid bio data
        console.error('Error parsing profile:', e)
      }
    }

    return NextResponse.json({ creators: creatorsWithTikTok })
  } catch (error) {
    console.error('Error in creators API:', error)
    return NextResponse.json({ creators: [] })
  }
}
