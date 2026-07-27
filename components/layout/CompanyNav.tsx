'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Search, Briefcase, Users, MessagesSquare,
  Megaphone, UserCheck, FileText, AtSign, Video,
  BarChart3, FileStack, Wallet, PlusCircle,
  Settings, Building2, Menu, X, LogOut,
} from 'lucide-react'

// Menú de la empresa.
//
// POR QUÉ CAMBIÓ
// Antes era un cajón de hamburguesa: para cambiar de sección había que abrirlo,
// elegir y esperar a que se cerrara, y mientras estaba abierto tapaba la app
// entera con un fondo oscuro. Tres pasos donde debería haber uno.
//
// Ahora, en pantalla de computador, el menú vive fijo a la izquierda y NO se
// mueve al navegar: solo cambia el contenido de la derecha. En teléfono se
// queda como cajón, que ahí sí es lo correcto — no hay ancho para un carril.
//
// Las entradas van agrupadas por LO QUE LA EMPRESA QUIERE HACER (contratar,
// gestionar, medir, dinero) y no por orden alfabético ni por tablas de la base.
// Con quince pantallas, una lista plana obliga a leerlas todas cada vez.

const GRUPOS: { titulo: string | null; items: { label: string; href: string; Icono: any }[] }[] = [
  {
    titulo: null,
    items: [{ label: 'Inicio', href: '/company/dashboard', Icono: LayoutDashboard }],
  },
  {
    titulo: 'Contratar creadores',
    items: [
      { label: 'Descubrir creadores', href: '/company/recruit', Icono: Search },
      { label: 'Mis gigs', href: '/company/jobs', Icono: Briefcase },
      { label: 'Postulantes', href: '/company/applicants', Icono: Users },
      { label: 'Mensajes', href: '/company/chat', Icono: MessagesSquare },
    ],
  },
  {
    titulo: 'Gestionar creadores',
    items: [
      { label: 'Campañas', href: '/company/campaigns', Icono: Megaphone },
      { label: 'Mis creadores', href: '/company/creators', Icono: UserCheck },
      { label: 'Contratos', href: '/company/contracts', Icono: FileText },
      { label: 'Cuentas por aprobar', href: '/company/handle-requests', Icono: AtSign },
      { label: 'Revisar contenido', href: '/company/review-content', Icono: Video },
    ],
  },
  {
    titulo: 'Medir',
    items: [
      { label: 'Analítica', href: '/company/analytics', Icono: BarChart3 },
      { label: 'Publicaciones', href: '/company/posts', Icono: FileStack },
    ],
  },
  {
    titulo: 'Dinero',
    items: [
      { label: 'Billetera', href: '/company/wallet', Icono: Wallet },
      { label: 'Agregar fondos', href: '/company/fondear', Icono: PlusCircle },
    ],
  },
]

const PIE = [
  { label: 'Perfil de empresa', href: '/company/profile', Icono: Building2 },
  { label: 'Ajustes', href: '/company/settings', Icono: Settings },
]

export default function CompanyNav({
  userName,
  userEmail,
  avatarUrl,
}: {
  userName?: string
  userEmail?: string
  avatarUrl?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [fotoRota, setFotoRota] = useState(false)
  const pathname = usePathname()

  // al navegar, el cajón de teléfono se cierra solo
  useEffect(() => { setAbierto(false) }, [pathname])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  // Solo se bloquea el fondo cuando el cajón está encima (teléfono). En
  // computador el menú no tapa nada, así que la página nunca se congela.
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  const salir = async () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('oct-user-type')
    // al cerrar sesión, el navegador vuelve DETRÁS del muro de waitlist
    try { await fetch('/api/waitlist/lock', { method: 'POST' }) } catch {}
    window.location.href = '/waitlist'
  }

  const activo = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const Fila = ({ label, href, Icono }: { label: string; href: string; Icono: any }) => {
    const on = activo(href)
    return (
      <li>
        <Link
          href={href}
          aria-current={on ? 'page' : undefined}
          className={`group flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13.5px] transition-colors ${
            on
              ? 'bg-emerald-500/15 font-semibold text-emerald-400'
              : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
          }`}
        >
          <Icono className={`h-[18px] w-[18px] shrink-0 ${on ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
          <span className="truncate">{label}</span>
        </Link>
      </li>
    )
  }

  const inicial = (userName || '?').trim().charAt(0).toUpperCase() || '?'

  const contenido = (
    <div className="flex h-full flex-col bg-neutral-950">
      {/* marca */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-neutral-800 px-5">
        <span className="text-[19px]" aria-hidden="true">🐙</span>
        <span className="text-[17px] font-extrabold tracking-tight text-white">Octapi</span>
      </div>

      {/* navegación */}
      <nav className="oct-nav-fade flex-1 overflow-y-auto px-3 py-3">
        {GRUPOS.map((g, i) => (
          <div key={g.titulo || i} className={i > 0 ? 'mt-4' : ''}>
            {g.titulo && (
              <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-neutral-600">
                {g.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => <Fila key={it.href} {...it} />)}
            </ul>
          </div>
        ))}

      </nav>

      {/* Cuenta y ajustes.
          Perfil y Ajustes viven ACÁ y no dentro de la lista de arriba a
          propósito: la lista se desplaza cuando la pantalla es baja, y en un
          laptop de 720px de alto "Ajustes" quedaba fuera de vista. Al estar en
          esta franja fija, siempre se alcanzan sin desplazar nada. */}
      <div className="shrink-0 border-t border-neutral-800 p-3">
        <ul className="mb-2 space-y-0.5">
          {PIE.map((it) => <Fila key={it.href} {...it} />)}
        </ul>
        <div className="flex items-center gap-2.5 border-t border-neutral-800/70 px-2 pb-1 pt-3">
          {avatarUrl && !fotoRota ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              onError={() => setFotoRota(true)}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white">
              {inicial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{userName || 'Empresa'}</p>
            <p className="truncate text-[11px] text-neutral-500">{userEmail || ''}</p>
          </div>
        </div>
        <button
          onClick={salir}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 text-neutral-500" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* CARRIL FIJO — solo en computador. No se desmonta al navegar. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-neutral-800 lg:block">
        {contenido}
      </aside>

      {/* Botón de hamburguesa — solo en teléfono, y solo con el cajón cerrado:
          abierto quedaba encima del logo del propio menú. Para cerrar está la
          X del cajón, tocar fuera, o Escape. */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-white shadow-lg transition-transform active:scale-95 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* cajón de teléfono */}
      <div
        onClick={() => setAbierto(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed inset-y-0 left-0 z-[56] w-64 border-r border-neutral-800 transition-transform duration-300 ease-out lg:hidden ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setAbierto(false)}
          aria-label="Cerrar menú"
          className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {contenido}
      </div>
    </>
  )
}
