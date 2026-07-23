import { NextRequest, NextResponse } from 'next/server'
import { shieldAsync } from '@/lib/shield'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'
const PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems'
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
const REDIRECT_URI = 'https://octapiapp.com/auth/youtube'

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs}ms`)
    throw error
  }
}

// PT1M5S / PT45S / PT2H1M5S -> segundos totales
function parseIsoDuration(iso: string): number {
  const m = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2] || '0', 10)
  const s = parseInt(m[3] || '0', 10)
  return h * 3600 + min * 60 + s
}

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 15 })
  if (blocked) return blocked

  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'YouTube credentials not configured' }, { status: 500 })
    }

    // 1) Code -> token
    const tokenRes = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    }, 15000)
    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      console.error('[youtube/callback] token error:', tokenRes.status, tokenText)
      return NextResponse.json({ error: 'Failed to exchange code for token', details: tokenText }, { status: 400 })
    }
    const tokenData = JSON.parse(tokenText)
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Incomplete token response' }, { status: 400 })
    }

    const authHeader = { Authorization: `Bearer ${tokenData.access_token}` }

    // 2) Canal propio + estadísticas + playlist de subidas
    const chRes = await fetchWithTimeout(
      `${CHANNELS_URL}?part=snippet,statistics,contentDetails&mine=true`,
      { headers: authHeader },
      15000
    )
    const chText = await chRes.text()
    if (!chRes.ok) {
      console.error('[youtube/callback] channels error:', chRes.status, chText)
      return NextResponse.json({ error: 'Failed to fetch channel', details: chText }, { status: 400 })
    }
    const chData = JSON.parse(chText)
    const channel = chData.items?.[0]
    if (!channel) {
      return NextResponse.json({ error: 'No se encontró un canal de YouTube para esta cuenta' }, { status: 404 })
    }

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads

    // 3) Últimos videos subidos (hasta 20)
    let videos: any[] = []
    if (uploadsPlaylistId) {
      try {
        const plRes = await fetchWithTimeout(
          `${PLAYLIST_ITEMS_URL}?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=20`,
          { headers: authHeader },
          15000
        )
        if (plRes.ok) {
          const plData = await plRes.json()
          const videoIds = (plData.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean)
          if (videoIds.length > 0) {
            const vRes = await fetchWithTimeout(
              `${VIDEOS_URL}?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}`,
              { headers: authHeader },
              15000
            )
            if (vRes.ok) {
              const vData = await vRes.json()
              videos = vData.items || []
            } else {
              console.error('[youtube/callback] videos fetch failed:', vRes.status)
            }
          }
        } else {
          console.error('[youtube/callback] playlistItems fetch failed:', plRes.status)
        }
      } catch (e: any) {
        console.error('[youtube/callback] error fetching videos:', e?.message)
      }
    }

    // Métricas — mismo cálculo que TikTok para que ambos alimenten los
    // mismos componentes de analítica (formatNumber, gráficos, etc.)
    let avgViews = 0, avgLikes = 0, avgComments = 0, engagementRate = 0, totalViews = 0
    if (videos.length > 0) {
      totalViews = videos.reduce((s, v) => s + parseInt(v.statistics?.viewCount || '0', 10), 0)
      const totalLikes = videos.reduce((s, v) => s + parseInt(v.statistics?.likeCount || '0', 10), 0)
      const totalComments = videos.reduce((s, v) => s + parseInt(v.statistics?.commentCount || '0', 10), 0)
      avgViews = Math.round(totalViews / videos.length)
      avgLikes = Math.round(totalLikes / videos.length)
      avgComments = Math.round(totalComments / videos.length)
      if (totalViews > 0) engagementRate = parseFloat((((totalLikes + totalComments) / totalViews) * 100).toFixed(2))
    }

    const recentVideos = videos.map((v) => {
      const durationSec = parseIsoDuration(v.contentDetails?.duration)
      return {
        id: v.id,
        title: v.snippet?.title || 'Video',
        thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url || '',
        views: parseInt(v.statistics?.viewCount || '0', 10),
        likes: parseInt(v.statistics?.likeCount || '0', 10),
        comments: parseInt(v.statistics?.commentCount || '0', 10),
        shares: 0, // YouTube Data API no expone conteo de shares
        createdAt: v.snippet?.publishedAt || new Date().toISOString(),
        isShort: durationSec > 0 && durationSec <= 60,
      }
    })

    const accountData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,

      channelId: channel.id,
      username: channel.snippet?.customUrl?.replace(/^@/, '') || channel.snippet?.title || 'Canal de YouTube',
      displayName: channel.snippet?.title || 'Canal de YouTube',
      avatarUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || null,
      bio: channel.snippet?.description || '',
      profileUrl: channel.snippet?.customUrl ? `https://youtube.com/${channel.snippet.customUrl}` : `https://youtube.com/channel/${channel.id}`,

      followers: parseInt(channel.statistics?.subscriberCount || '0', 10),
      following: 0,
      likes: recentVideos.reduce((s, v) => s + v.likes, 0),
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),

      avgViews, avgLikes, avgComments, engagementRate,

      recentVideos,
      shortsCount: recentVideos.filter((v) => v.isShort).length,

      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: accountData })
  } catch (error: any) {
    console.error('[youtube/callback] error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
