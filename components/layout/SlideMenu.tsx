'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SlideMenuProps {
  userType: 'creator' | 'company'
  userName?: string
  userEmail?: string
  avatarUrl?: string
}

const CREATOR_MENU = [
  { id: 'dashboard', label: 'Dashboard', href: '/creator/dashboard' },
  { id: 'gigs', label: 'Buscar Gigs', href: '/gigs' },
  { id: 'applications', label: 'Mis Aplicaciones', href: '/creator/applications' },
  { id: 'contracts', label: 'Contratos', href: '/creator/contracts' },
  { id: 'messages', label: 'Mensajes', href: '/creator/messages' },
  { id: 'wallet', label: 'Billetera', href: '/creator/wallet' },
  { id: 'analytics', label: 'Analytics', href: '/creator/analytics' },
  { id: 'profile', label: 'Mi Perfil', href: '/creator/profile' },
]

const COMPANY_MENU = [
  { id: 'dashboard', label: 'Dashboard', href: '/company/dashboard' },
  { id: 'jobs', label: 'Mis Trabajos', href: '/company/jobs' },
  { id: 'recruit', label: 'Buscar Creadores', href: '/company/recruit' },
  { id: 'applicants', label: 'Aplicantes', href: '/company/applicants' },
  { id: 'contracts', label: 'Contratos', href: '/company/contracts' },
  { id: 'messages', label: 'Mensajes', href: '/company/messages' },
  { id: 'wallet', label: 'Billetera', href: '/company/wallet' },
  { id: 'analytics', label: 'Analytics', href: '/company/analytics' },
  { id: 'profile', label: 'Perfil Empresa', href: '/company/profile' },
]

export default function SlideMenu({ userType, userName, userEmail, avatarUrl }: SlideMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = userType === 'creator' ? CREATOR_MENU : COMPANY_MENU
  const settingsHref = userType === 'creator' ? '/creator/profile' : '/company/settings'

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    window.location.href = '/auth/login'
  }

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] w-11 h-11 bg-neutral-900 rounded-lg flex items-center justify-center hover:bg-neutral-800 transition-all duration-200 border border-neutral-700 shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-neutral-950 border-r border-neutral-800 z-[55] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-16">
          {/* User Profile */}
          <div className="px-5 py-6 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  userName?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white truncate text-sm">
                  {userName || 'Usuario'}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {userEmail || ''}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {userType === 'creator' ? 'Creador' : 'Empresa'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-violet-600/20 text-violet-400 font-medium'
                          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                      }`}
                    >
                      {item.label}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Divider */}
            <div className="my-4 border-t border-neutral-800"></div>

            {/* Settings */}
            <ul className="space-y-1">
              <li>
                <Link
                  href={settingsHref}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-white transition-all duration-150"
                >
                  Configuracion
                </Link>
              </li>
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all duration-150 text-sm font-medium"
            >
              Cerrar Sesion
            </button>
            <p className="text-center text-xs text-neutral-600 mt-4">
              Octopus v1.0
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
