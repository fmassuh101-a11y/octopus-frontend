import { NextRequest, NextResponse } from 'next/server'
import { shieldAsync } from '@/lib/shield'

// "Instagram API with Instagram Login" (el producto nuevo de Meta, NO la
// vieja Instagram Basic Display que ya no existe) — flujo de 3 pasos:
// código -> token corto -> token largo (60 días). Documentado acá:
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token'
const LONG_LIVED_URL = 'https://graph.instagram.com/access_token'
const PROFILE_URL = 'https://graph.instagram.com/v21.0/me'
const REDIRECT_URI = 'https://octapiapp.com/auth/instagram'

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

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 15 })
  if (blocked) return blocked

  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })

    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Instagram credentials not configured' }, { status: 500 })
    }

    // 1) code -> token de corta duración (1h)
    const tokenRes = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    }, 15000)
    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      console.error('[instagram/callback] token error:', tokenRes.status, tokenText)
      return NextResponse.json({ error: 'Failed to exchange code for token', details: tokenText }, { status: 400 })
    }
    const tokenData = JSON.parse(tokenText)
    if (!tokenData.access_token || !tokenData.user_id) {
      return NextResponse.json({ error: 'Incomplete token response' }, { status: 400 })
    }

    // 2) token corto -> token largo (60 días) — el que se guarda
    const longRes = await fetchWithTimeout(
      `${LONG_LIVED_URL}?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${tokenData.access_token}`,
      { method: 'GET' },
      15000
    )
    const longText = await longRes.text()
    if (!longRes.ok) {
      console.error('[instagram/callback] long-lived token error:', longRes.status, longText)
      return NextResponse.json({ error: 'Failed to get long-lived token', details: longText }, { status: 400 })
    }
    const longData = JSON.parse(longText)
    const accessToken = longData.access_token || tokenData.access_token

    // 3) perfil básico — instagram_business_basic alcanza para esto
    const profRes = await fetchWithTimeout(
      `${PROFILE_URL}?fields=id,username,account_type,media_count&access_token=${accessToken}`,
      { method: 'GET' },
      15000
    )
    const profText = await profRes.text()
    if (!profRes.ok) {
      console.error('[instagram/callback] profile error:', profRes.status, profText)
      return NextResponse.json({ error: 'Failed to fetch Instagram profile', details: profText }, { status: 400 })
    }
    const profile = JSON.parse(profText)

    const accountData = {
      accessToken,
      expiresIn: longData.expires_in || 5184000, // ~60 días
      igUserId: profile.id,
      username: profile.username,
      accountType: profile.account_type || null, // BUSINESS / MEDIA_CREATOR / PERSONAL
      mediaCount: profile.media_count || 0,
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: accountData })
  } catch (error: any) {
    console.error('[instagram/callback] error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
