'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import Sky from '@/components/oct/Sky'
import { computeXP, getLevel, getMissions } from '@/lib/xp'
import { Pencil, Settings, Flame, Eye, Star, Banknote, Shield, ChevronRight, Wallet as WalletIcon, FileText, Award, LogOut, BarChart3, Send } from 'lucide-react'
import { Wallet as WalletDuo, Cards, Gift, ChartLineUp, UploadSimple, Scroll, PencilSimple } from '@phosphor-icons/react'

// Perfil del creador — copia del perfil de SideShift (tab Overview):
// cielo, avatar centrado con mini-badge de liga, balance gigante + botón Wallet,
// card 2x2 de stats, logros y accesos.
export default function CreatorProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number } | null>(null)
  const [stats, setStats] = useState({ pending: 0, accepted: 0, completed: 0, total: 0 })
  const [avgRating, setAvgRating] = useState<{ avg: number; count: number } | null>(null)
  const [streak, setStreak] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try { setStreak(JSON.parse(localStorage.getItem('oct-streak') || '{}').count || 1) } catch {}
    const load = async () => {
      try {
        const token = localStorage.getItem('sb-access-token')
        const userStr = localStorage.getItem('sb-user')
        if (!token || !userStr) { window.location.href = '/auth/login'; return }
        const user = JSON.parse(userStr)
        const headers = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
        const [pRes, wRes, aRes, dRes, rRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&select=balance,total_earned`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${user.id}&select=id,status`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?creator_id=eq.${user.id}&status=in.(approved,completed)&select=id`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/reviews?reviewee_id=eq.${user.id}&select=rating`, { headers }),
        ])
        if (pRes.ok) {
          const ps = await pRes.json()
          if (ps.length) {
            let fp = ps[0]
            if (fp.bio) { try { fp = { ...fp, ...JSON.parse(fp.bio) } } catch {} }
            setProfile(fp)
          }
        }
        if (wRes.ok) { const w = await wRes.json(); if (w.length) setWallet(w[0]) }
        if (rRes.ok) {
          const revs = await rRes.json()
          if (revs.length) setAvgRating({ avg: revs.reduce((s: number, r: any) => s + r.rating, 0) / revs.length, count: revs.length })
        }
        let deliv = 0
        if (dRes.ok) { try { deliv = (await dRes.json()).length } catch {} }
        if (aRes.ok) {
          const apps = await aRes.json()
          setStats({
            pending: apps.filter((a: any) => a.status === 'pending').length,
            accepted: apps.filter((a: any) => a.status === 'accepted' || a.status === 'completed').length,
            completed: deliv,
            total: apps.length,
          })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const xpInput = {
    applications: stats.total, accepted: stats.accepted, completed: stats.completed,
    hasPhoto: !!(profile?.profile_photo_url || profile?.avatar_url),
    hasSocials: !!(profile?.tiktok || profile?.instagram || profile?.youtube),
  }
  const xp = computeXP(xpInput)
  const { level } = getLevel(xp)
  const missions = getMissions(xpInput)
  const doneMissions = missions.filter((m) => m.done).length

  const avatar = profile?.profile_photo_url || profile?.avatar_url || null
  const name = profile?.full_name || 'Creador'
  const balance = Math.max(0, Number(wallet?.balance) || 0)
  const earned = Math.max(0, Number(wallet?.total_earned) || 0)

  const logout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    window.location.href = '/'
  }

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky />
      <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-4">
        {/* top: editar / ajustes */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1.5 shadow-sm">
            <Link href="/creator/profile/edit" prefetch className="p-2 transition-transform active:scale-90" aria-label="Editar perfil">
              <Pencil className="h-5 w-5" />
            </Link>
            <Link href="/creator/settings" prefetch className="p-2 transition-transform active:scale-90" aria-label="Ajustes">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* avatar + liga */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt={name} className="h-32 w-32 rounded-full border-4 border-white object-cover shadow" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-cyan-100 text-4xl font-extrabold text-cyan-700 shadow">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <Link href="/leaderboard" prefetch
              className={`absolute -bottom-2 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br ${level.from} ${level.to} shadow-md ring-2 ring-white transition-transform active:scale-90`}
              aria-label="Tu liga">
              <Shield className="h-5 w-5 text-white" />
            </Link>
          </div>
          <p className="mt-5 text-2xl font-extrabold">{name}</p>
          <p className="text-neutral-500">Liga {level.name} · {xp.toLocaleString('es-CL')} XP</p>
        </div>

        {/* balance */}
        <div className="mt-8 text-center">
          <p className="text-lg text-neutral-500">Balance disponible</p>
          <p className="mt-1 text-[56px] font-extrabold leading-none tracking-tight tabular-nums">
            <span className="align-top text-[32px] font-bold">$</span>{Math.floor(balance).toLocaleString('es-CL')}
            <span className="text-[28px] font-bold text-neutral-400">.{String(Math.round((balance % 1) * 100)).padStart(2, '0')}</span>
          </p>
          <Link href="/creator/wallet" prefetch
            className="mt-5 block w-full rounded-full bg-gradient-to-b from-[#22D3EE] to-[#0891B2] py-4 text-center text-lg font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98]">
            Wallet
          </Link>
        </div>

        {/* overview 2x2 */}
        <h2 className="mt-9 text-[24px] font-extrabold tracking-tight">Resumen</h2>
        <div className="mt-3 grid grid-cols-2 rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <StatCell icon={<Flame className="h-6 w-6 fill-orange-500 text-orange-500" />} value={`${streak}`} label={streak === 1 ? 'día' : 'días'} divider="rb" />
          <StatCell icon={<Eye className="h-6 w-6 text-cyan-700" />} value={xp.toLocaleString('es-CL')} label="XP" divider="b" />
          <StatCell icon={<Star className="h-6 w-6 fill-amber-400 text-amber-400" />} value={avgRating ? avgRating.avg.toFixed(1) : '—'} label="rating" divider="r" />
          <StatCell icon={<Banknote className="h-6 w-6 text-cyan-600" />} value={`$${Math.floor(earned).toLocaleString('es-CL')}`} label="ganado" />
        </div>

        {/* logros */}
        <div className="mt-4 flex items-center gap-3 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
            <Award className="h-6 w-6 text-amber-500" />
          </div>
          <Link href="/creator/academia" prefetch className="min-w-0 flex-1 active:opacity-70">
            <p className="font-bold">Academia Octopus</p>
            <p className="text-sm text-neutral-500">{doneMissions} de {missions.length} completadas</p>
          </Link>
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        </div>

        {/* accesos */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <Row href="/creator/wallet" icon={<WalletDuo className="h-5 w-5 text-cyan-600" weight="duotone" />} label="Wallet y retiros" />
          <Row href="/creator/applications" icon={<Cards className="h-5 w-5 text-violet-500" weight="duotone" />} label="Mis postulaciones" />
          <Row href="/creator/referidos" icon={<Gift className="h-5 w-5 text-sky-500" weight="duotone" />} label="Invita y gana (referidos)" />
          <Row href="/creator/analytics" icon={<ChartLineUp className="h-5 w-5 text-orange-500" weight="duotone" />} label="Analytics" />
          <Row href="/creator/deliveries" icon={<UploadSimple className="h-5 w-5 text-teal-500" weight="duotone" />} label="Mis entregas" />
          <Row href="/creator/contracts" icon={<Scroll className="h-5 w-5 text-cyan-700" weight="duotone" />} label="Mis contratos" />
          <Row href="/creator/profile/edit" icon={<PencilSimple className="h-5 w-5 text-neutral-500" weight="duotone" />} label="Editar perfil" last />
        </div>

        <button onClick={logout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border border-red-100 bg-white py-4 font-bold text-red-500 shadow-sm transition-transform active:scale-[0.98]">
          <LogOut className="h-5 w-5" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function StatCell({ icon, value, label, divider }: { icon: React.ReactNode; value: string; label: string; divider?: string }) {
  const cls = [
    divider?.includes('r') ? 'border-r border-neutral-100' : '',
    divider?.includes('b') ? 'border-b border-neutral-100' : '',
  ].join(' ')
  return (
    <div className={`flex items-center gap-3 p-5 ${cls}`}>
      {icon}
      <div>
        <p className="text-xl font-extrabold leading-tight tabular-nums">{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function Row({ href, icon, label, last }: { href: string; icon: React.ReactNode; label: string; last?: boolean }) {
  return (
    <Link href={href} prefetch
      className={`flex items-center gap-3 px-5 py-4 active:bg-neutral-50 ${last ? '' : 'border-b border-neutral-100'}`}>
      {icon}
      <span className="flex-1 font-semibold">{label}</span>
      <ChevronRight className="h-5 w-5 text-neutral-400" />
    </Link>
  )
}
