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
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/creator/dashboard' },
  { id: 'gigs', label: 'Buscar Gigs', icon: '🔍', href: '/gigs' },
  { id: 'applications', label: 'Mis Aplicaciones', icon: '📋', href: '/creator/applications' },
  { id: 'contracts', label: 'Contratos', icon: '📝', href: '/creator/contracts' },
  { id: 'messages', label: 'Mensajes', icon: '💬', href: '/creator/messages' },
  { id: 'wallet', label: 'Billetera', icon: '💰', href: '/creator/wallet' },
  { id: 'analytics', label: 'Analytics', icon: '📊', href: '/creator/analytics' },
  { id: 'profile', label: 'Mi Perfil', icon: '👤', href: '/creator/profile' },
]

const COMPANY_MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/company/dashboard' },
  { id: 'jobs', label: 'Mis Trabajos', icon: '💼', href: '/company/jobs' },
  { id: 'recruit', label: 'Buscar Creadores', icon: '🔍', href: '/company/recruit' },
  { id: 'applicants', label: 'Aplicantes', icon: '👥', href: '/company/applicants' },
  { id: 'contracts', label: 'Contratos', icon: '📝', href: '/company/contracts' },
  { id: 'messages', label: 'Mensajes', icon: '💬', href: '/company/messages' },
  { id: 'wallet', label: 'Billetera', icon: '💰', href: '/company/wallet' },
  { id: 'analytics', label: 'Analytics', icon: '📊', href: '/company/analytics' },
  { id: 'profile', label: 'Perfil Empresa', icon: '🏢', href: '/company/profile' },
]

const SETTINGS_MENU = [
  { id: 'settings', label: 'Configuración', icon: '⚙️', href: '' }, // Will be set dynamically
  { id: 'help', label: 'Ayuda', icon: '❓', href: '#' },
]

export default function SlideMenu({ userType, userName, userEmail, avatarUrl }: SlideMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = userType === 'creator' ? CREATOR_MENU : COMPANY_MENU
  const settingsHref = userType === 'creator' ? '/creator/profile' : '/company/settings'

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when menu is open
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
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white dark:bg-neutral-900 rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all duration-200 border border-gray-200 dark:border-neutral-700"
        aria-label="Toggle menu"
      >
        <div className="flex flex-col gap-1.5">
          <span className={`w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </div>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-neutral-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  userName?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {userName || 'Usuario'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {userEmail || ''}
                </p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  userType === 'creator'
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                }`}>
                  {userType === 'creator' ? '🎨 Creador' : '🏢 Empresa'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Navegación
              </p>
            </div>
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-violet-500"></span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Divider */}
            <div className="my-4 mx-4 border-t border-gray-200 dark:border-neutral-700"></div>

            {/* Settings Section */}
            <div className="px-4 mb-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Configuración
              </p>
            </div>
            <ul className="space-y-1 px-3">
              <li>
                <Link
                  href={settingsHref}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200"
                >
                  <span className="text-xl">⚙️</span>
                  <span>Configuración</span>
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Trigger support chat if available
                    const chatButton = document.querySelector('[aria-label="Toggle chat"]') as HTMLButtonElement
                    if (chatButton) chatButton.click()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200"
                >
                  <span className="text-xl">❓</span>
                  <span>Ayuda y Soporte</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 font-medium"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>

            {/* Octopus Branding */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                🐙 Octopus © 2024
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
