'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'

interface SessionContextType {
  user: User | null
  profile: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (data: any) => void
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
  updateProfile: () => {}
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Protected routes
  const protectedPaths = ['/creator', '/company', '/gigs', '/onboarding', '/profile']
  const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/callback', '/terms', '/privacy']

  useEffect(() => {
    // Initialize session
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)

        // Save session to localStorage
        localStorage.setItem('octopus_session', JSON.stringify({
          user: session.user,
          timestamp: Date.now()
        }))
        document.cookie = `user_session=true; path=/`

      } else if (event === 'SIGNED_OUT') {
        handleSignOut()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Check if current path requires auth
    const isProtectedPath = protectedPaths.some(path => pathname?.startsWith(path))
    const isPublicPath = publicPaths.includes(pathname || '')

    if (isProtectedPath && !loading && !user) {
      // Redirect to login if trying to access protected route without auth
      console.log('No auth, redirecting to login')
      router.push('/auth/login')
    }
  }, [pathname, user, loading])

  const checkSession = async () => {
    try {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)

        // Update localStorage
        localStorage.setItem('octopus_session', JSON.stringify({
          user: session.user,
          timestamp: Date.now()
        }))
        document.cookie = `user_session=true; path=/`
      } else {
        // Check localStorage for recent session
        const savedSession = localStorage.getItem('octopus_session')
        if (savedSession) {
          const { user: savedUser, timestamp } = JSON.parse(savedSession)
          const hoursSinceLogin = (Date.now() - timestamp) / (1000 * 60 * 60)

          // Keep session for 24 hours
          if (hoursSinceLogin < 24) {
            setUser(savedUser)
            await loadProfile(savedUser.id)
          } else {
            // Session expired
            handleSignOut()
          }
        }
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProfile = async (userId: string) => {
    try {
      // Try database first
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setProfile(data)
        localStorage.setItem('octopus_profile', JSON.stringify(data))

        // Set user type cookie for middleware
        if (data.user_type) {
          document.cookie = `user_type=${data.user_type}; path=/`
        }
      } else {
        // Try localStorage fallback
        const savedProfile = localStorage.getItem('octopus_profile')
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile))
        }
      }
    } catch (error) {
      console.error('Profile load error:', error)

      // Try localStorage fallback
      const savedProfile = localStorage.getItem('octopus_profile')
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile))
      }
    }
  }

  const handleSignOut = () => {
    setUser(null)
    setProfile(null)
    localStorage.removeItem('octopus_session')
    localStorage.removeItem('octopus_profile')
    localStorage.removeItem('savedProfile')
    localStorage.removeItem('creatorOnboarding')
    localStorage.removeItem('user_type')
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    document.cookie = 'user_type=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    handleSignOut()
    router.push('/')
  }

  const refreshSession = async () => {
    await checkSession()
  }

  const updateProfile = (data: any) => {
    setProfile(data)
    localStorage.setItem('octopus_profile', JSON.stringify(data))
  }

  return (
    <SessionContext.Provider value={{
      user,
      profile,
      loading,
      signOut,
      refreshSession,
      updateProfile
    }}>
      {children}
    </SessionContext.Provider>
  )
}