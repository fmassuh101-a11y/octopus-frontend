'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import Sky from '@/components/oct/Sky'
import { toast } from '@/components/oct/toast'
import { Search, SlidersHorizontal, Check, Sparkles, TrendingUp, DollarSign, Video, EyeOff, Share2, Layers as Images, Star, Package, Crown, History as HistoryIcon, Send } from 'lucide-react'

interface Gig {
  id: string
  title: string
  description: string
  budget: string
  category: string
  company_id: string
  company_name?: string
  company_logo?: string
  image_url?: string
  requirements?: string
  status: string
  created_at: string
  applicants_count?: number
}

const REQUIRE_VERIFICATION = false

// Tipos de contenido (niches) con ícono — estilo "Find by niche" de SideShift
const NICHES = [
  { key: 'ugc', label: 'UGC', icon: Video },
  { key: 'clipping', label: 'Clipping', icon: TrendingUp },
  { key: 'faceless', label: 'Faceless', icon: EyeOff },
  { key: 'social', label: 'Social Media', icon: Share2 },
  { key: 'slideshow', label: 'Slideshows', icon: Images },
  { key: 'review', label: 'Reseñas', icon: Star },
  { key: 'unboxing', label: 'Unboxing', icon: Package },
  { key: 'ambassador', label: 'Embajador', icon: Crown },
]

const GRADS = [
  'from-emerald-400 to-teal-500', 'from-violet-400 to-purple-500', 'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500', 'from-fuchsia-400 to-pink-500', 'from-amber-400 to-orange-500',
]

export default function GigsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [tab, setTab] = useState<'gigs' | 'mine' | 'history'>('gigs')
  const [sort, setSort] = useState<'new' | 'trend' | 'pay'>('new')
  const [niche, setNiche] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [user, setUser] = useState<any>(null)
  const [appliedGigs, setAppliedGigs] = useState<Set<string>>(new Set())
  const [isVerified, setIsVerified] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    if (userStr) setUser(JSON.parse(userStr))
    const headers = { Authorization: token ? `Bearer ${token}` : '', apikey: SUPABASE_ANON_KEY }
    try {
      const userData = userStr ? JSON.parse(userStr) : null
      const promises: Promise<any>[] = [
        fetch(`${SUPABASE_URL}/rest/v1/gigs?select=*&status=eq.active&order=created_at.desc`, { headers }),
      ]
      if (token && userData) {
        promises.push(
          fetch(`${SUPABASE_URL}/rest/v1/applications?select=gig_id&creator_id=eq.${userData.id}`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=bio`, { headers })
        )
      }
      const results = await Promise.all(promises)
      if (results[0].ok) setGigs(await results[0].json())
      if (results[1]?.ok) {
        const applied = await results[1].json()
        setAppliedGigs(new Set(applied.map((a: any) => a.gig_id)))
      }
      if (results[2]?.ok) {
        const profiles = await results[2].json()
        if (profiles.length && profiles[0].bio) {
          try {
            const bio = JSON.parse(profiles[0].bio)
            setIsVerified(!!(bio.tiktokConnected && bio.tiktokAccounts?.length))
          } catch { setIsVerified(false) }
        }
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  // One-tap apply optimista (rollback si falla)
  const handleApply = async (gig: Gig) => {
    if (!user) { router.push('/auth/login'); return }
    if (REQUIRE_VERIFICATION && !isVerified) {
      setSelectedGig(null)
      setTimeout(() => setShowVerificationModal(true), 100)
      return
    }
    if (appliedGigs.has(gig.id)) return
    setAppliedGigs(prev => new Set([...Array.from(prev), gig.id]))
    setSelectedGig(null)
    toast('Postulaste con éxito')
    try {
      const token = localStorage.getItem('sb-access-token')
      const res = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, Prefer: 'return=representation' },
        body: JSON.stringify({ gig_id: gig.id, creator_id: user.id, company_id: gig.company_id, message: 'Me interesa esta oportunidad', status: 'pending' }),
      })
      if (!res.ok) {
        const err = await res.text()
        if (err.includes('duplicate')) return
        setAppliedGigs(prev => { const n = new Set(prev); n.delete(gig.id); return n })
        toast('No se pudo postular. Intentá de nuevo.', 'error')
      }
    } catch {
      setAppliedGigs(prev => { const n = new Set(prev); n.delete(gig.id); return n })
      toast('No se pudo postular. Revisá tu conexión.', 'error')
    }
  }

  const filtered = useMemo(() => {
    let list = gigs.filter(g => {
      if (niche && (g.category || '').toLowerCase() !== niche) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return g.title?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q) || g.company_name?.toLowerCase().includes(q)
      }
      return true
    })
    if (sort === 'pay') list = [...list].sort((a, b) => parseInt(b.budget?.replace(/\D/g, '') || '0') - parseInt(a.budget?.replace(/\D/g, '') || '0'))
    if (sort === 'trend') list = [...list].sort((a, b) => (b.applicants_count || 0) - (a.applicants_count || 0))
    return list
  }, [gigs, niche, searchQuery, sort])

  const mine = useMemo(() => gigs.filter(g => appliedGigs.has(g.id)), [gigs, appliedGigs])
  const spotlight = filtered[0]
  const nicheMeta = (key?: string) => NICHES.find(n => n.key === (key || '').toLowerCase())
  const priceLabel = (g: Gig) => g.budget || '$—'

  return (
    <div className="relative min-h-[100dvh] pb-32 text-neutral-900">
      <Sky height={230} />
      <div className="relative mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-12">
        {/* search + filtros */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text" placeholder="Buscar acá..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-neutral-200 bg-white py-3.5 pl-12 pr-4 text-[16px] shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <Link href="/leaderboard" prefetch aria-label="Ranking"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm transition-transform active:scale-90">
            <SlidersHorizontal className="h-5 w-5 text-neutral-600" />
          </Link>
        </div>

        {/* tabs */}
        <div className="mt-5 flex items-center gap-7 border-b border-neutral-200/70">
          {([['gigs', 'Trabajos'], ['mine', 'Mis campañas'], ['history', 'Historial']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`relative pb-3 text-[17px] transition-colors ${tab === k ? 'font-bold text-neutral-900' : 'font-medium text-neutral-400'}`}>
              {label}
              {tab === k && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-neutral-900" />}
            </button>
          ))}
        </div>

        {tab === 'gigs' && (
          <>
            {/* Spotlight */}
            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-[24px] font-extrabold tracking-tight">Destacado</h2>
              <span className="text-xl text-neutral-400">›</span>
            </div>
            {loading ? (
              <div className="mt-3 h-40 animate-pulse rounded-3xl bg-white shadow-sm" />
            ) : spotlight ? (
              <button onClick={() => setSelectedGig(spotlight)}
                className="mt-3 w-full rounded-3xl border border-neutral-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.985]">
                <div className="flex items-center gap-4">
                  <div className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${GRADS[0]}`}>
                    {spotlight.image_url?.startsWith('http') && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={spotlight.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-extrabold">{spotlight.company_name || spotlight.title}</p>
                    <p className="text-neutral-500">{nicheMeta(spotlight.category)?.label || 'Creador de contenido'}</p>
                    <p className="mt-3 text-xl font-extrabold tabular-nums">{priceLabel(spotlight)}</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="mt-3 rounded-3xl border border-neutral-100 bg-white p-6 text-center text-neutral-500 shadow-sm">Todavía no hay campañas</div>
            )}
            {/* dots */}
            <div className="mt-3 flex justify-center gap-1.5">
              {[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-8 bg-emerald-400' : 'w-6 bg-neutral-200'}`} />)}
            </div>

            {/* Browse */}
            <h2 className="mt-7 text-[24px] font-extrabold tracking-tight">Explorar</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {([['new', 'Nuevas', Sparkles], ['trend', 'Tendencia', TrendingUp], ['pay', 'Mejor pago', DollarSign]] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setSort(k)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-3 text-[16px] font-semibold shadow-sm transition-all active:scale-95 ${
                    sort === k ? 'border-emerald-400 bg-white text-emerald-600' : 'border-neutral-200 bg-white text-neutral-700'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {/* niches */}
            <div className="mt-7 flex items-center justify-between">
              <h2 className="text-[24px] font-extrabold tracking-tight">Buscar por tipo</h2>
              <span className="text-xl text-neutral-400">›</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {NICHES.map(n => (
                <button key={n.key} onClick={() => setNiche(niche === n.key ? null : n.key)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[15px] font-semibold shadow-sm transition-all active:scale-95 ${
                    niche === n.key ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-neutral-200 bg-white text-neutral-700'}`}>
                  <n.icon className="h-4 w-4" /> {n.label}
                </button>
              ))}
            </div>

            {/* grid de campañas */}
            <div className="mt-7 flex items-center justify-between">
              <h2 className="text-[24px] font-extrabold tracking-tight">{filtered.length} {filtered.length === 1 ? 'campaña' : 'campañas'}</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {loading
                ? [1, 2, 3, 4].map(i => <div key={i} className="h-56 animate-pulse rounded-3xl bg-white shadow-sm" />)
                : filtered.map((gig, idx) => (
                  <button key={gig.id} onClick={() => setSelectedGig(gig)}
                    className="text-left transition-transform active:scale-[0.97]">
                    <div className={`relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br ${GRADS[idx % GRADS.length]} shadow-sm`}>
                      {gig.image_url?.startsWith('http') && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={gig.image_url} alt="" className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )}
                      <span className="absolute right-2 top-2 max-w-[calc(100%-16px)] truncate rounded-full bg-neutral-600/60 px-3 py-1.5 text-[13px] font-bold text-white backdrop-blur-sm">
                        {priceLabel(gig)}
                      </span>
                      {appliedGigs.has(gig.id) && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[12px] font-bold text-white">
                          <Check className="h-3 w-3" strokeWidth={3} /> Postulado
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-[15px] text-neutral-500">{gig.company_name || 'Empresa'}</p>
                    <p className="truncate text-[17px] font-bold leading-tight">{gig.title}</p>
                  </button>
                ))}
            </div>
            {!loading && filtered.length === 0 && (
              <EmptyState text="No hay campañas con ese filtro" cta="Ver todas" onCta={() => { setNiche(null); setSearchQuery('') }} />
            )}
          </>
        )}

        {tab === 'mine' && (
          mine.length === 0 ? (
            <EmptyState text="Unite a campañas para ver tu progreso acá" cta="Explorar trabajos" onCta={() => setTab('gigs')} />
          ) : (
            <div className="mt-6 space-y-3">
              {mine.map(g => (
                <Link key={g.id} href="/creator/applications" prefetch
                  className="flex items-center gap-4 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.985]">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${GRADS[1]}`}>
                    {g.image_url?.startsWith('http') && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{g.title}</p>
                    <p className="truncate text-sm text-neutral-500">{g.company_name || 'Empresa'} · {priceLabel(g)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">Ver estado</span>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === 'history' && (
          <EmptyState icon={<HistoryIcon className="h-16 w-16 text-emerald-500" />}
            title="Tu historial de campañas"
            text="Acá vas a ver cada campaña a la que postulaste y completaste — todo en un solo lugar."
            cta="Ver mis postulaciones" onCta={() => router.push('/creator/applications')} />
        )}
      </div>

      {/* Modal verificación */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <p className="text-lg font-bold">Conectá tus redes primero</p>
            <p className="mt-1 text-neutral-500">Para postular necesitás verificar tu cuenta de TikTok o Instagram.</p>
            <button onClick={() => setShowVerificationModal(false)}
              className="mt-5 w-full rounded-full bg-gradient-to-b from-[#34D399] to-[#0EA472] py-3.5 font-bold text-white">Entendido</button>
          </div>
        </div>
      )}

      {/* Detalle como bottom sheet — estilo tarjeta de campaña de SideShift */}
      <Drawer.Root open={!!selectedGig} onOpenChange={(o) => { if (!o) setSelectedGig(null) }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] bg-white text-neutral-900 outline-none">
            <div aria-hidden className="mx-auto mb-1 mt-3 h-1.5 w-10 shrink-0 rounded-full bg-neutral-200" />
            <div className="overflow-y-auto overscroll-contain px-5 pb-10 pt-2">
              {selectedGig && (
                <>
                  <div className={`relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br ${GRADS[0]} shadow`}>
                    {selectedGig.image_url?.startsWith('http') && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={selectedGig.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <h2 className="mt-5 text-center text-[28px] font-extrabold leading-tight tracking-tight">
                    {selectedGig.title} <span className="text-neutral-400">para</span> {selectedGig.company_name || 'la marca'}
                  </h2>
                  <div className="mt-5 grid grid-cols-2 divide-x divide-neutral-100 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
                    <div className="pr-3">
                      <DollarSign className="h-6 w-6 text-emerald-500" />
                      <p className="mt-2 text-xl font-extrabold tabular-nums">{priceLabel(selectedGig)}</p>
                      <p className="text-sm text-neutral-500">Pago</p>
                    </div>
                    <div className="pl-4">
                      <Video className="h-6 w-6 text-orange-400" />
                      <p className="mt-2 text-xl font-extrabold">{nicheMeta(selectedGig.category)?.label || 'UGC'}</p>
                      <p className="text-sm text-neutral-500">Tipo de creador</p>
                    </div>
                  </div>
                  {selectedGig.description && (
                    <div className="mt-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
                      <p className="font-bold">Sobre esta campaña</p>
                      <p className="mt-1 whitespace-pre-line text-neutral-600">{selectedGig.description}</p>
                    </div>
                  )}
                  {selectedGig.requirements && (
                    <div className="mt-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
                      <p className="font-bold">Requisitos</p>
                      <p className="mt-1 whitespace-pre-line text-neutral-600">{selectedGig.requirements}</p>
                    </div>
                  )}
                  {(selectedGig.applicants_count || 0) > 0 && (
                    <p className="mt-4 text-center text-sm text-neutral-500">
                      {selectedGig.applicants_count} {selectedGig.applicants_count === 1 ? 'persona postuló' : 'personas postularon'}
                    </p>
                  )}
                  <div className="mt-6">
                    {appliedGigs.has(selectedGig.id) ? (
                      <Link href="/creator/applications" prefetch
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-4 text-lg font-bold text-emerald-600">
                        <Check className="h-5 w-5" strokeWidth={3} /> Ya postulaste — ver estado
                      </Link>
                    ) : (
                      <button onClick={() => handleApply(selectedGig)}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#34D399] to-[#0EA472] py-4 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98]">
                        <Send className="h-5 w-5" /> Postularme
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}

function EmptyState({ icon, title, text, cta, onCta }: { icon?: React.ReactNode; title?: string; text: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      {icon || <Send className="h-16 w-16 text-emerald-500" />}
      {title && <p className="mt-6 text-xl font-extrabold">{title}</p>}
      <p className="mt-2 max-w-xs text-neutral-500">{text}</p>
      <button onClick={onCta}
        className="mt-6 w-full max-w-xs rounded-full bg-gradient-to-b from-[#34D399] to-[#0EA472] py-4 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98]">
        {cta}
      </button>
    </div>
  )
}
