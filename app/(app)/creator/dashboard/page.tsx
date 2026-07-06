'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import Sky from '@/components/oct/Sky'
import { computeXP, getLevel, getMissions } from '@/lib/xp'
import { Shield, Star, Flame, Crown, Trophy, Check, Target, Wallet, FileText, Send, Camera, X } from 'lucide-react'

// Home del creador — copia del Home de SideShift:
// chips arriba, "Tus ganancias" con monto gigante + meta + barra,
// banner de ranking y checklist "Tus tareas de hoy".
export default function CreatorHome() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<{ balance: number; pending_balance: number; total_earned: number } | null>(null)
  const [stats, setStats] = useState({ pending: 0, accepted: 0, completed: 0, total: 0 })
  const [streak, setStreak] = useState(1)
  const [showRankBanner, setShowRankBanner] = useState(true)

  useEffect(() => {
    // racha diaria simple: cuenta días seguidos con visita
    try {
      const raw = JSON.parse(localStorage.getItem('oct-streak') || '{}')
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 864e5).toDateString()
      let count = raw.count || 0
      if (raw.last !== today) count = raw.last === yesterday ? count + 1 : 1
      else count = Math.max(count, 1)
      localStorage.setItem('oct-streak', JSON.stringify({ last: today, count }))
      setStreak(count)
      if (localStorage.getItem('oct-rank-banner') === '0') setShowRankBanner(false)
      // instantáneo: pintar desde caché de sesión y revalidar detrás
      const home = JSON.parse(sessionStorage.getItem('oct-home') || 'null')
      if (home?.profile) {
        setProfile(home.profile)
        if (home.wallet) setWallet(home.wallet)
        if (home.stats) setStats(home.stats)
        setLoading(false)
      }
    } catch {}
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) { window.location.href = '/auth/login'; return }
      const userData = JSON.parse(userStr)
      const headers = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, { headers })
      if (!response.ok) { window.location.href = '/auth/select-type'; return }
      const profiles = await response.json()
      if (!profiles.length) { window.location.href = '/auth/select-type'; return }
      const profileData = profiles[0]
      if (profileData.user_type !== 'creator') {
        window.location.href = profileData.user_type === 'company' ? '/company/dashboard' : '/auth/select-type'
        return
      }
      let finalProfile = profileData
      if (profileData.bio) { try { finalProfile = { ...profileData, ...JSON.parse(profileData.bio) } } catch {} }
      setProfile(finalProfile)

      const [walletRes, appsRes, delivRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${userData.id}&select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${userData.id}&select=id,status`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?creator_id=eq.${userData.id}&status=in.(approved,completed)&select=id`, { headers }),
      ])
      let completedDeliveries = 0
      if (delivRes.ok) { try { completedDeliveries = (await delivRes.json()).length } catch {} }
      if (walletRes.ok) { const w = await walletRes.json(); if (w.length) setWallet(w[0]) }
      if (appsRes.ok) {
        const apps = await appsRes.json()
        setStats({
          pending: apps.filter((a: any) => a.status === 'pending').length,
          accepted: apps.filter((a: any) => a.status === 'accepted' || a.status === 'completed').length,
          completed: completedDeliveries,
          total: apps.length,
        })
      }
      setLoading(false)
    } catch {
      window.location.href = '/auth/select-type'
    }
  }

  // guardar snapshot para próxima visita instantánea
  useEffect(() => {
    if (!loading && profile) {
      try { sessionStorage.setItem('oct-home', JSON.stringify({ profile, wallet, stats })) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile, wallet, stats])

  const xpInput = {
    applications: stats.total,
    accepted: stats.accepted,
    completed: stats.completed,
    hasPhoto: !!(profile?.profile_photo_url || profile?.avatar_url),
    hasSocials: !!(profile?.tiktok || profile?.instagram || profile?.youtube),
  }
  const xp = computeXP(xpInput)
  const { level } = getLevel(xp)
  const missions = getMissions(xpInput)

  const earned = wallet?.total_earned || 0
  const goal = Math.max(1000, Math.ceil((earned + 1) / 1000) * 1000)
  const progress = Math.min(100, Math.round((earned / goal) * 100))

  // ícono + degradado pastel por misión (estilo ilustraciones de SideShift)
  const MISSION_META: Record<string, { icon: any; tile: string }> = {
    photo:    { icon: Camera,   tile: 'from-sky-400 to-blue-600' },
    social:   { icon: Send,     tile: 'from-violet-400 to-purple-600' },
    apply:    { icon: Target,   tile: 'from-amber-400 to-orange-500' },
    contract: { icon: FileText, tile: 'from-rose-400 to-pink-600' },
    first:    { icon: Check,    tile: 'from-emerald-400 to-teal-600' },
    five:     { icon: Trophy,   tile: 'from-yellow-400 to-amber-500' },
  }

  if (loading) {
    return (
      <div className="relative min-h-[100dvh]">
        <Sky />
        <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-14">
          <div className="flex gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-10 w-20 animate-pulse rounded-full bg-white/70" />)}</div>
          <div className="mt-10 h-7 w-40 animate-pulse rounded-lg bg-neutral-200/70" />
          <div className="mt-3 h-14 w-56 animate-pulse rounded-xl bg-neutral-200/70" />
          <div className="mt-5 h-3.5 w-full animate-pulse rounded-full bg-neutral-200/70" />
          <div className="mt-8 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky />
      <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-14">
        {/* chips superiores */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link href="/leaderboard" prefetch className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white px-3.5 py-2 text-sm font-bold shadow-sm active:scale-95 transition-transform">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${level.from} ${level.to}`}>
              <Shield className="h-3 w-3 text-white" />
            </span>
            {level.name}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white px-3.5 py-2 text-sm font-bold shadow-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 5.0
          </div>
          <Link href="/creator/racha" prefetch className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white px-3.5 py-2 text-sm font-bold shadow-sm active:scale-95 transition-transform">
            <Flame className="h-4 w-4 fill-orange-500 text-orange-500" /> {streak}
          </Link>
          <Link href="/creator/pro" prefetch className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white px-3.5 py-2 text-sm font-bold shadow-sm transition-transform active:scale-95">
            <Crown className="h-4 w-4 fill-amber-400 text-amber-500" /> FREE
          </Link>
        </div>

        {/* ganancias */}
        <h1 className="mt-9 text-[26px] font-extrabold tracking-tight">Tus ganancias</h1>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums">
            <span className="align-top text-[30px] font-bold">$</span>
            {Math.floor(earned).toLocaleString('es-CL')}
            <span className="text-[26px] font-bold text-neutral-400">.{String(Math.round((earned % 1) * 100)).padStart(2, '0')}</span>
          </p>
          <div className="mb-1 flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold shadow-sm">
            <Target className="h-4 w-4 text-neutral-500" /> ${goal.toLocaleString('es-CL')}
          </div>
        </div>
        <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
          <div className="h-full rounded-full bg-gradient-to-r from-[#34D399] to-[#0EA472] transition-[width] duration-700" style={{ width: `${Math.max(progress, 4)}%` }} />
        </div>

        {/* banner ranking */}
        {showRankBanner && (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
              <Trophy className="h-6 w-6 text-emerald-600" />
            </div>
            <Link href="/leaderboard" prefetch className="min-w-0 flex-1 active:opacity-70">
              <p className="font-bold">Ranking</p>
              <p className="truncate text-sm text-neutral-500">Mirá tu liga y competí con otros creadores</p>
            </Link>
            <button
              onClick={() => { setShowRankBanner(false); try { localStorage.setItem('oct-rank-banner', '0') } catch {} }}
              className="p-2 text-neutral-400 transition-transform active:scale-90" aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* tareas de hoy — checks chicos y precisos, animados */}
        <h2 className="mt-9 text-[26px] font-extrabold tracking-tight">Tus tareas de hoy</h2>
        <div className="mt-4">
          {missions.map((m, i) => {
            const meta = MISSION_META[m.key] || MISSION_META.apply
            const Icon = meta.icon
            return (
              <motion.div key={m.key} className="flex items-stretch gap-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: 'easeOut' }}>
                {/* check + conector */}
                <div className="flex w-8 flex-col items-center">
                  <div className="mt-[22px] h-7 w-7 shrink-0">
                    {m.done ? (
                      <motion.div
                        initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 22, delay: 0.15 + i * 0.05 }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-200">
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />
                      </motion.div>
                    ) : (
                      <div className="h-7 w-7 rounded-full border-2 border-neutral-200 bg-white" />
                    )}
                  </div>
                  {i < missions.length - 1 && <div className="my-1.5 w-px flex-1 bg-neutral-200" />}
                </div>
                {/* card estilo SideShift: título + XP, ilustración grande a la derecha */}
                <div className="mb-3 flex flex-1 items-center gap-4 rounded-[22px] border border-neutral-100 bg-white p-4 shadow-sm">
                  <div className="min-w-0 flex-1 py-1">
                    <p className={`text-[17px] font-bold leading-snug ${m.done ? 'text-neutral-400 line-through decoration-neutral-300' : ''}`}>{m.label}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-neutral-500">
                      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-400 text-[10px] font-black text-white shadow-sm">✦</span>
                      <span className="font-semibold tabular-nums">{m.xp} xp</span>
                    </p>
                  </div>
                  <div className={`relative flex h-[76px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-2xl ${m.done ? 'bg-neutral-100' : `bg-gradient-to-br ${meta.tile}`}`}>
                    {!m.done && <>
                      <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/25" />
                      <div className="absolute -bottom-5 -left-3 h-14 w-14 rounded-full bg-white/15" />
                      <div className="absolute right-2 bottom-2 h-2 w-2 rounded-full bg-white/50" />
                    </>}
                    <Icon className={`relative h-9 w-9 ${m.done ? 'text-neutral-300' : 'text-white drop-shadow-md'}`} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* accesos rápidos */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/creator/wallet" prefetch className="flex items-center gap-3 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.98]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50"><Wallet className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="font-bold leading-tight">Wallet</p><p className="text-xs text-neutral-500">Tu plata</p></div>
          </Link>
          <Link href="/creator/applications" prefetch className="flex items-center gap-3 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.98]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50"><FileText className="h-5 w-5 text-violet-500" /></div>
            <div><p className="font-bold leading-tight">Postulaciones</p><p className="text-xs text-neutral-500">{stats.pending} pendientes</p></div>
          </Link>
        </div>
      </div>
    </div>
  )
}
