'use client'

import { useEffect, useState } from 'react'
import { getStoredSession, restoreSession } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { popYouTubeReturnTo } from '@/lib/youtubeConnect'

// Página dedicada de vuelta de Google (a diferencia de TikTok, que vuelve a
// la raíz porque tiene ese redirect_uri fijo y no se puede cambiar sin
// pedirle a TikTok que lo revise de nuevo). Mismo blindaje que app/page.tsx
// usa para TikTok: límite duro de tiempo para que nunca quede pegado en
// "Conectando…", guardado directo por REST (no depende del cliente de
// Supabase), y vuelve exactamente adonde estaba el creador si venía de un
// contrato puntual.
export default function YouTubeCallbackPage() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => p + (94 - p) * 0.08), 120)
    return () => clearInterval(t)
  }, [])

  const finish = (ok: boolean, extra?: { error?: string }) => {
    const returnTo = popYouTubeReturnTo()
    if (returnTo) {
      const qs = new URLSearchParams()
      qs.set('youtube', ok ? 'connected' : 'error')
      if (!ok && extra?.error) qs.set('youtubeError', extra.error)
      if (returnTo.contractId) qs.set('openContract', returnTo.contractId)
      const sep = returnTo.path.includes('?') ? '&' : '?'
      window.location.href = `${returnTo.path}${sep}${qs.toString()}`
      return
    }
    window.location.href = ok
      ? '/creator/analytics?youtube=connected'
      : `/creator/analytics?youtube=error${extra?.error ? `&youtubeError=${encodeURIComponent(extra.error)}` : ''}`
  }

  useEffect(() => {
    let rawSearch = ''
    try { rawSearch = sessionStorage.getItem('oct_youtube_raw_search') || '' } catch {}
    try { sessionStorage.removeItem('oct_youtube_raw_search') } catch {}
    const params = rawSearch ? new URLSearchParams(rawSearch) : new URLSearchParams(window.location.search)

    const error = params.get('error')
    if (error) { finish(false, { error }); return }

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) { finish(false, { error: 'missing_code' }); return }

    handleCallback(code, state)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCallback = async (code: string, state: string) => {
    const savedState = localStorage.getItem('youtube_oauth_state')
    if (state !== savedState) {
      console.error('[YouTube] State mismatch:', state, 'vs', savedState)
      finish(false, { error: 'state_mismatch' })
      return
    }

    const storedSession = getStoredSession()
    if (!storedSession?.access_token || !storedSession?.user?.id) {
      finish(false, { error: 'no_session' })
      return
    }
    const accessToken = storedSession.access_token
    const userId = storedSession.user.id

    let finished = false
    const finishOnce = (ok: boolean, extra?: { error?: string }) => {
      if (finished) return
      finished = true
      finish(ok, extra)
    }

    const watchdog = setTimeout(() => {
      console.error('[YouTube] Watchdog: no terminó en 35s, se fuerza a terminar igual')
      finishOnce(false, { error: 'timeout' })
    }, 35000)

    try {
      restoreSession().catch((err) => console.error('[YouTube] restoreSession error:', err))

      const controller = new AbortController()
      const abortTimer = setTimeout(() => controller.abort(), 28000)
      let response: Response
      try {
        response = await fetch('/api/youtube/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(abortTimer)
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        console.error('[YouTube] API error:', data.error)
        finishOnce(false, { error: data.error || 'unknown' })
        return
      }

      const yt = data.data
      const accountData = {
        id: `youtube_${yt.channelId}`,
        channelId: yt.channelId,
        username: yt.username || yt.displayName || 'Canal de YouTube',
        displayName: yt.displayName || yt.username || 'Canal de YouTube',
        avatarUrl: yt.avatarUrl,
        bio: yt.bio || '',
        followers: yt.followers || 0,
        likes: yt.likes || 0,
        videoCount: yt.videoCount || 0,
        avgViews: yt.avgViews || 0,
        avgLikes: yt.avgLikes || 0,
        avgComments: yt.avgComments || 0,
        engagementRate: yt.engagementRate || 0,
        recentVideos: yt.recentVideos || [],
        shortsCount: yt.shortsCount || 0,
        accessToken: yt.accessToken,
        refreshToken: yt.refreshToken,
        connectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }

      const H = { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=bio`, { headers: H })
      const profiles = profRes.ok ? await profRes.json() : []

      if (profiles?.length > 0) {
        let bioData: any = {}
        try { bioData = profiles[0].bio ? JSON.parse(profiles[0].bio) : {} } catch { bioData = {} }

        const youtubeAccounts = bioData.youtubeAccounts || []
        const existingIndex = youtubeAccounts.findIndex((a: any) => a.channelId === accountData.channelId)
        if (existingIndex >= 0) youtubeAccounts[existingIndex] = accountData
        else youtubeAccounts.push(accountData)
        bioData.youtubeAccounts = youtubeAccounts
        bioData.youtubeConnected = true

        const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: H,
          body: JSON.stringify({ bio: JSON.stringify(bioData), updated_at: new Date().toISOString() }),
        })
        if (!saveRes.ok) console.error('[YouTube] Save error:', await saveRes.text().catch(() => ''))
      }

      localStorage.removeItem('youtube_oauth_state')

      // Igual que TikTok: si esta cuenta era justo la que un contrato
      // estaba esperando, se verifica sola sin un paso manual aparte.
      await fetch('/api/handle-requests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      }).catch(() => {})

      finishOnce(true)
    } catch (error: any) {
      console.error('[YouTube] Callback error:', error)
      finishOnce(false, { error: 'callback_failed' })
    } finally {
      clearTimeout(watchdog)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/20">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.582 6.186a2.51 2.51 0 00-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418a2.51 2.51 0 00-1.768 1.768C2 7.746 2 12 2 12s0 4.254.418 5.814a2.51 2.51 0 001.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.51 2.51 0 001.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM10 15.5v-7l6 3.5-6 3.5z" />
        </svg>
      </div>
      <div className="w-56 h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-500 transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.round(progress))}%` }}
        />
      </div>
      <p className="text-white/60 text-sm tabular-nums">
        Conectando con YouTube… {Math.min(100, Math.round(progress))}%
      </p>
    </div>
  )
}
