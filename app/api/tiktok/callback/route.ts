import { NextRequest, NextResponse } from 'next/server'

// TikTok API endpoints
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'
const TIKTOK_VIDEO_LIST_URL = 'https://open.tiktokapis.com/v2/video/list/'

interface TikTokTokenResponse {
  access_token: string
  expires_in: number
  open_id: string
  refresh_expires_in: number
  refresh_token: string
  scope: string
  token_type: string
}

interface TikTokUserInfo {
  open_id: string
  union_id?: string
  avatar_url: string
  avatar_url_100?: string
  avatar_large_url?: string
  display_name: string
  bio_description?: string
  profile_deep_link?: string
  is_verified?: boolean
  follower_count?: number
  following_count?: number
  likes_count?: number
  video_count?: number
}

interface TikTokVideo {
  id: string
  title: string
  video_description: string
  duration: number
  cover_image_url: string
  share_url: string
  create_time: number
  like_count?: number
  comment_count?: number
  share_count?: number
  view_count?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, redirect_uri } = body

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    // Hardcoded client key, secret from env
    const clientKey = 'sbawzx5ya0iuu4hs58'
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || '7of3cvjDDs94MTS2VGq96xSyMUNvl34G'

    if (!clientKey || !clientSecret) {
      return NextResponse.json({ error: 'TikTok credentials not configured' }, { status: 500 })
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/tiktok/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('TikTok token error:', errorData)
      return NextResponse.json({ error: 'Failed to exchange code for token', details: errorData }, { status: 400 })
    }

    const tokenData: TikTokTokenResponse = await tokenResponse.json()
    console.log('TikTok token data:', {
      hasAccessToken: !!tokenData.access_token,
      openId: tokenData.open_id,
      scope: tokenData.scope
    })

    // Step 2: Fetch user info with stats
    const userFields = [
      'open_id',
      'union_id',
      'avatar_url',
      'avatar_url_100',
      'avatar_large_url',
      'display_name',
      'bio_description',
      'profile_deep_link',
      'is_verified',
      'follower_count',
      'following_count',
      'likes_count',
      'video_count'
    ].join(',')

    const userResponse = await fetch(`${TIKTOK_USER_INFO_URL}?fields=${userFields}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    let userData: TikTokUserInfo | null = null
    if (userResponse.ok) {
      const userResult = await userResponse.json()
      console.log('TikTok user response:', JSON.stringify(userResult, null, 2))
      userData = userResult.data?.user || null
      console.log('Parsed user data:', JSON.stringify(userData, null, 2))
    } else {
      const errorText = await userResponse.text()
      console.error('TikTok user info error:', userResponse.status, errorText)
    }

    // Step 3: Fetch recent videos for engagement calculation
    let videos: TikTokVideo[] = []
    try {
      const videoResponse = await fetch(`${TIKTOK_VIDEO_LIST_URL}?fields=id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_count: 20, // Get last 20 videos for engagement calculation
        }),
      })

      if (videoResponse.ok) {
        const videoResult = await videoResponse.json()
        videos = videoResult.data?.videos || []
      }
    } catch (videoError) {
      console.error('Error fetching videos:', videoError)
      // Continue without videos - we can still show user stats
    }

    // Calculate engagement metrics
    let avgViews = 0
    let avgLikes = 0
    let avgComments = 0
    let avgShares = 0
    let engagementRate = 0
    let totalViews = 0
    let totalEngagement = 0

    if (videos.length > 0) {
      const videosWithStats = videos.filter(v => v.view_count !== undefined)
      if (videosWithStats.length > 0) {
        totalViews = videosWithStats.reduce((sum, v) => sum + (v.view_count || 0), 0)
        const totalLikes = videosWithStats.reduce((sum, v) => sum + (v.like_count || 0), 0)
        const totalComments = videosWithStats.reduce((sum, v) => sum + (v.comment_count || 0), 0)
        const totalShares = videosWithStats.reduce((sum, v) => sum + (v.share_count || 0), 0)
        totalEngagement = totalLikes + totalComments + totalShares

        avgViews = Math.round(totalViews / videosWithStats.length)
        avgLikes = Math.round(totalLikes / videosWithStats.length)
        avgComments = Math.round(totalComments / videosWithStats.length)
        avgShares = Math.round(totalShares / videosWithStats.length)

        // Engagement rate = (likes + comments + shares) / views * 100
        if (totalViews > 0) {
          engagementRate = parseFloat(((totalEngagement / totalViews) * 100).toFixed(2))
        }
      }
    }

    // Build response with all available data
    const accountData = {
      // Token info
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,

      // User info
      openId: tokenData.open_id,
      username: userData?.display_name || 'TikTok User',
      displayName: userData?.display_name || 'TikTok User',
      avatarUrl: userData?.avatar_url || userData?.avatar_url_100 || null,
      avatarLargeUrl: userData?.avatar_large_url || null,
      bio: userData?.bio_description || '',
      profileUrl: userData?.profile_deep_link || null,
      isVerified: userData?.is_verified || false,

      // Stats
      followers: userData?.follower_count || 0,
      following: userData?.following_count || 0,
      likes: userData?.likes_count || 0,
      videoCount: userData?.video_count || 0,

      // Calculated metrics
      avgViews,
      avgLikes,
      avgComments,
      avgShares,
      engagementRate,

      // Recent videos (for display)
      recentVideos: videos.slice(0, 6).map(v => ({
        id: v.id,
        title: v.title || v.video_description || 'Video',
        thumbnail: v.cover_image_url,
        views: v.view_count || 0,
        likes: v.like_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0,
        createdAt: new Date(v.create_time * 1000).toISOString(),
      })),

      // Metadata
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    console.log('Final account data being returned:', {
      username: accountData.username,
      followers: accountData.followers,
      following: accountData.following,
      likes: accountData.likes,
      videoCount: accountData.videoCount
    })

    return NextResponse.json({ success: true, data: accountData })

  } catch (error: any) {
    console.error('TikTok callback error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
