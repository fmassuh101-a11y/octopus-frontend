'use client'

import { useEffect, useState } from 'react'
import { getStoredSession, restoreSession } from '@/lib/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { popInstagramReturnTo } from '@/lib/instagramConnect'

// Mismo blindaje que app/auth/youtube/page.tsx: límite duro de tiempo para
// que nunca quede pegado en "Conectando…", guardado directo por REST, y
// vuelve exactamente adonde estaba el creador si venía de un contrato.
export default function InstagramCallbackPage() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => p + (94 - p) * 0.08), 120)
    return () => clearInterval(t)
  }, [])

  const finish = (ok: boolean, extra?: { error?: string }) => {
    const returnTo = popInstagramReturnTo()
    if (returnTo) {
      const qs = new URLSearchParams()
      qs.set('instagram', ok ? 'connected' : 'error')
      if (!ok && extra?.error) qs.set('instagramError', extra.error)
      if (returnTo.contractId) qs.set('openContract', returnTo.contractId)
      const sep = returnTo.path.includes('?') ? '&' : '?'
      window.location.href = `${returnTo.path}${sep}${qs.toString()}`
      return
    }
    window.location.href = ok
      ? '/creator/analytics?instagram=connected'
      : `/creator/analytics?instagram=error${extra?.error ? `&instagramError=${encodeURIComponent(extra.error)}` : ''}`
  }

  useEffect(() => {
    let rawSearch = ''
    try { rawSearch = sessionStorage.getItem('oct_instagram_raw_search') || '' } catch {}
    try { sessionStorage.removeItem('oct_instagram_raw_search') } catch {}
    const params = rawSearch ? new URLSearchParams(rawSearch) : new URLSearchParams(window.location.search)

    const error = params.get('error')
    if (error) { finish(false, { error }); return }

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) { finish(false, { error: 'missing_code' }); return }

    handleCallback(code, state)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCallback = async (code: string, state: string) => {
    const savedState = localStorage.getItem('instagram_oauth_state')
    if (state !== savedState) {
      console.error('[Instagram] State mismatch:', state, 'vs', savedState)
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
      console.error('[Instagram] Watchdog: no terminó en 35s, se fuerza a terminar igual')
      finishOnce(false, { error: 'timeout' })
    }, 35000)

    try {
      restoreSession().catch((err) => console.error('[Instagram] restoreSession error:', err))

      const controller = new AbortController()
      const abortTimer = setTimeout(() => controller.abort(), 28000)
      let response: Response
      try {
        response = await fetch('/api/instagram/callback', {
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
        console.error('[Instagram] API error:', data.error)
        finishOnce(false, { error: data.error || 'unknown' })
        return
      }

      const ig = data.data
      const accountData = {
        id: `instagram_${ig.igUserId}`,
        igUserId: ig.igUserId,
        username: ig.username,
        accountType: ig.accountType,
        mediaCount: ig.mediaCount || 0,
        accessToken: ig.accessToken,
        expiresIn: ig.expiresIn,
        connectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }

      const H = { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=bio`, { headers: H })
      const profiles = profRes.ok ? await profRes.json() : []

      if (profiles?.length > 0) {
        let bioData: any = {}
        try { bioData = profiles[0].bio ? JSON.parse(profiles[0].bio) : {} } catch { bioData = {} }

        const instagramAccounts = bioData.instagramAccounts || []
        const existingIndex = instagramAccounts.findIndex((a: any) => a.igUserId === accountData.igUserId)
        if (existingIndex >= 0) instagramAccounts[existingIndex] = accountData
        else instagramAccounts.push(accountData)
        bioData.instagramAccounts = instagramAccounts
        bioData.instagramConnected = true

        const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: H,
          body: JSON.stringify({ bio: JSON.stringify(bioData), updated_at: new Date().toISOString() }),
        })
        if (!saveRes.ok) console.error('[Instagram] Save error:', await saveRes.text().catch(() => ''))
      }

      localStorage.removeItem('instagram_oauth_state')

      await fetch('/api/handle-requests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      }).catch(() => {})

      finishOnce(true)
    } catch (error: any) {
      console.error('[Instagram] Callback error:', error)
      finishOnce(false, { error: 'callback_failed' })
    } finally {
      clearTimeout(watchdog)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.198-4.354-2.618-6.78-6.98-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </div>
      <div className="w-56 h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-400 to-yellow-400 transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.round(progress))}%` }}
        />
      </div>
      <p className="text-white/60 text-sm tabular-nums">
        Conectando con Instagram… {Math.min(100, Math.round(progress))}%
      </p>
    </div>
  )
}
