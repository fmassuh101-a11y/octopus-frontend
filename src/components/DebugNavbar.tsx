'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface DebugNavbarProps {
  title?: string
  showBackToDashboard?: boolean
  dashboardPath?: string
  children?: React.ReactNode
}

export function DebugNavbar({
  title = "App Octopus",
  showBackToDashboard = false,
  dashboardPath = "/dashboard",
  children
}: DebugNavbarProps) {
  const { user, profile, isAuthenticated, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={isAuthenticated && profile?.role ? (profile.role === 'company' ? '/company/dashboard' : '/creator/dashboard') : "/"}>
              <span className="text-2xl font-bold text-slate-900">{title}</span>
            </Link>
            {children}
          </div>
          <div className="flex items-center space-x-4">
            {/* Debug indicator - only show in development when authenticated */}
            {process.env.NODE_ENV === 'development' && isAuthenticated && (
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border">
                ✓ {user?.email || 'logged in'}
              </div>
            )}

            {showBackToDashboard && (
              <Link
                href={dashboardPath}
                className="text-slate-600 hover:text-slate-900"
              >
                Back to Dashboard
              </Link>
            )}

            {isAuthenticated && profile && (
              <>
                <span className="text-sm text-slate-600">
                  Welcome, {profile.full_name || profile.username}
                </span>
                {profile.role === 'company' && (
                  <Link href="/company/profile" className="text-slate-600 hover:text-slate-900">
                    Profile
                  </Link>
                )}
                {profile.role === 'creator' && (
                  <Link href="/creator/profile" className="text-slate-600 hover:text-slate-900">
                    Profile
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Logout
                </button>
              </>
            )}

            {!isAuthenticated && (
              <>
                <Link
                  href="/auth/login"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}