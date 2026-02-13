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

    // Use production credentials from environment variables
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'aw5n2omdzbjx4xf8'
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || 'j7W4sVsZbf9NcaXn3sayT47kZBDFgJwE'

    if (!clientKey || !clientSecret) {
      return NextResponse.json({ error: 'TikTok credentials not configured' }, { status: 500 })
    }

    // Step 1: Exchange code for access token
    console.log('=== TikTok Token Exchange ===')
    console.log('Client Key:', clientKey)
    console.log('Client Key length:', clientKey.length)
    console.log('Client Secret length:', clientSecret.length)
    console.log('Client Secret (first 10):', clientSecret.substring(0, 10))
    console.log('Client Secret (last 10):', clientSecret.substring(clientSecret.length - 10))
    console.log('Redirect URI:', redirect_uri)
    console.log('Code (first 10 chars):', code?.substring(0, 10))

    // Build the request body
    const finalRedirectUri = redirect_uri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/tiktok/callback`
    const bodyParams = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: finalRedirectUri,
    })

    console.log('Token request URL:', TIKTOK_TOKEN_URL)
    console.log('Token request body (without secret):', bodyParams.toString().replace(clientSecret, '***'))

    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: bodyParams,
    })

    const tokenText = await tokenResponse.text()
    console.log('TikTok token raw response:', tokenText)

    if (!tokenResponse.ok) {
      console.error('TikTok token error status:', tokenResponse.status)
      return NextResponse.json({ error: 'Failed to exchange code for token', details: tokenText }, { status: 400 })
    }

    let tokenData: TikTokTokenResponse
    try {
      const parsedResponse = JSON.parse(tokenText)
      console.log('Parsed token response structure:', Object.keys(parsedResponse))

      // Handle both v1 (nested data) and v2 (flat) response formats
      // V1: { data: { access_token, open_id, ... }, message: ... }
      // V2: { access_token, open_id, ... }
      if (parsedResponse.data && parsedResponse.data.access_token) {
        console.log('Detected v1 API response format (nested data)')
        tokenData = parsedResponse.data
      } else if (parsedResponse.access_token) {
        console.log('Detected v2 API response format (flat)')
        tokenData = parsedResponse
      } else {
        console.error('Unknown response format:', parsedResponse)
        // Check for error in response
        if (parsedResponse.error || parsedResponse.message) {
          return NextResponse.json({
            error: 'TikTok API error',
            details: parsedResponse.error_description || parsedResponse.error || parsedResponse.message
          }, { status: 400 })
        }
        return NextResponse.json({
          error: 'Unknown token response format',
          details: JSON.stringify(parsedResponse)
        }, { status: 500 })
      }
    } catch (e) {
      console.error('Failed to parse token response:', e)
      return NextResponse.json({ error: 'Invalid token response', details: tokenText }, { status: 500 })
    }

    // Check if TikTok returned an error in the response body
    if ((tokenData as any).error) {
      console.error('TikTok API error in token response:', tokenData)
      return NextResponse.json({
        error: 'TikTok API error',
        details: (tokenData as any).error_description || (tokenData as any).error
      }, { status: 400 })
    }

    if (!tokenData.access_token || !tokenData.open_id) {
      console.error('Missing access_token or open_id. Token data:', JSON.stringify(tokenData))
      return NextResponse.json({
        error: 'Incomplete token response',
        details: `Missing: ${!tokenData.access_token ? 'access_token ' : ''}${!tokenData.open_id ? 'open_id' : ''}`
      }, { status: 400 })
    }
    console.log('TikTok token data:', {
      hasAccessToken: !!tokenData.access_token,
      openId: tokenData.open_id,
      scope: tokenData.scope
    })

    // Step 2: Fetch user info - build fields based on granted scopes
    const grantedScopes = tokenData.scope?.split(',') || []
    console.log('=== TikTok User Info Request ===')
    console.log('Granted scopes:', grantedScopes)

    // Base fields (user.info.basic)
    const baseFields = ['open_id', 'union_id', 'avatar_url', 'avatar_url_100', 'avatar_large_url', 'display_name']

    // Profile fields (user.info.profile)
    const profileFields = ['bio_description', 'profile_deep_link', 'is_verified', 'username']

    // Stats fields (user.info.stats) - REQUIRES APPROVED SCOPE
    const statsFields = ['follower_count', 'following_count', 'likes_count', 'video_count']

    // Build fields list based on what scopes we have
    let userFields = [...baseFields]

    const hasProfileScope = grantedScopes.includes('user.info.profile')
    const hasStatsScope = grantedScopes.includes('user.info.stats')

    if (hasProfileScope) {
      userFields = [...userFields, ...profileFields]
    }
    if (hasStatsScope) {
      userFields = [...userFields, ...statsFields]
    }

    console.log('Has user.info.profile scope:', hasProfileScope)
    console.log('Has user.info.stats scope:', hasStatsScope)
    console.log('Requesting fields:', userFields.join(','))
    console.log('Access Token (first 20 chars):', tokenData.access_token?.substring(0, 20))
    console.log('Open ID:', tokenData.open_id)

    const userResponse = await fetch(`${TIKTOK_USER_INFO_URL}?fields=${userFields.join(',')}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    const userText = await userResponse.text()
    console.log('TikTok user raw response:', userText)

    let userData: TikTokUserInfo | null = null
    if (userResponse.ok) {
      try {
        const userResult = JSON.parse(userText)
        console.log('TikTok user parsed response:', JSON.stringify(userResult, null, 2))

        // Check for API error in response body
        if (userResult.error && userResult.error.code !== 'ok') {
          console.error('TikTok user API error:', userResult.error)
        }

        // Handle different response structures
        userData = userResult.data?.user || userResult.user || userResult.data || null
        console.log('Parsed user data:', JSON.stringify(userData, null, 2))
      } catch (e) {
        console.error('Failed to parse user response:', e)
      }
    } else {
      console.error('TikTok user info error status:', userResponse.status, userText)
      // Try to parse error for more details
      try {
        const errorResult = JSON.parse(userText)
        console.error('User info error details:', errorResult)
      } catch (e) {
        // Ignore parse error
      }
    }

    // Step 3: Fetch recent videos for engagement calculation
    console.log('=== TikTok Video List Request ===')
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

      const videoText = await videoResponse.text()
      console.log('TikTok video raw response:', videoText)

      if (videoResponse.ok) {
        try {
          const videoResult = JSON.parse(videoText)
          videos = videoResult.data?.videos || []
          console.log('Videos fetched:', videos.length)
        } catch (e) {
          console.error('Failed to parse video response:', e)
        }
      } else {
        console.error('Video fetch failed with status:', videoResponse.status)
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

      // Scope info - helps client show appropriate message
      hasStatsScope: hasStatsScope,
      hasProfileScope: hasProfileScope,
      grantedScopes: grantedScopes,
      missingScopes: !hasStatsScope ? ['user.info.stats'] : [],
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
