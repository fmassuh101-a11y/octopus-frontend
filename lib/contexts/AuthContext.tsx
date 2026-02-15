'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { getCurrentUserProfile, type DBProfile } from '../database'

interface AuthContextType {
  user: User | null
  profile: DBProfile | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<any>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<DBProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load profile data
  const loadProfile = async () => {
    try {
      const profileData = await getCurrentUserProfile()
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
    }
  }

  // Refresh profile manually
  const refreshProfile = async () => {
    if (user) {
      await loadProfile()
    }
  }

  // Sign in with email/password - using Supabase client
  const signInWithEmail = async (email: string, password: string) => {
    console.log('🔵 [AuthContext] Signing in with email:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('❌ [AuthContext] Sign in error:', error)
      throw error
    }

    if (data.session) {
      console.log('✅ [AuthContext] Session created successfully')
    } else {
      throw new Error('No se pudo iniciar sesión')
    }
  }

  // Sign up with email/password
  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    console.log('🚀 [AuthContext] Starting signUp for:', email)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      console.log('📋 [AuthContext] SignUp response:', {
        user: data.user ? 'User created' : 'No user',
        session: data.session ? 'Session created' : 'No session',
        error: error ? error.message : 'No error',
        needsConfirmation: data.user && !data.session
      })

      if (error) {
        console.error('❌ [AuthContext] SignUp error:', error)
        throw error
      }

      console.log('✅ [AuthContext] SignUp completed successfully')
      return data
    } catch (err) {
      console.error('💥 [AuthContext] SignUp exception:', err)
      throw err
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    console.log('🔵 [AuthContext] Starting Google OAuth')
    console.log('📍 [AuthContext] Current origin:', window.location.origin)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      console.log('📋 [AuthContext] Google OAuth response:', {
        hasData: !!data,
        error: error ? error.message : 'No error',
        url: data?.url || 'No URL'
      })

      if (error) {
        console.error('❌ [AuthContext] Google OAuth error:', error)
        throw error
      }

      console.log('✅ [AuthContext] Google OAuth initiated - redirecting to callback...')
    } catch (err) {
      console.error('💥 [AuthContext] Google OAuth exception:', err)
      throw err
    }
  }

  // Sign out
  const signOut = async () => {
    console.log('👋 [AuthContext] Signing out...')

    // Clear local state first
    setUser(null)
    setProfile(null)

    // Clear localStorage items related to auth
    try {
      // Clear Supabase session keys
      localStorage.removeItem('sb-access-token')
      localStorage.removeItem('sb-refresh-token')
      localStorage.removeItem('sb-user')

      // Clear app-specific keys
      localStorage.removeItem('user_type')
      localStorage.removeItem('octopus_session')
      localStorage.removeItem('octopus_profile')
      localStorage.removeItem('savedProfile')
      localStorage.removeItem('creatorOnboarding')
      localStorage.removeItem('companyOnboarding')

      // Clear TikTok state
      localStorage.removeItem('tiktok_oauth_state')
      localStorage.removeItem('tiktok_csrf_state')

      console.log('✅ [AuthContext] localStorage cleared')
    } catch (e) {
      console.warn('⚠️ [AuthContext] Error clearing localStorage:', e)
    }

    // Sign out from Supabase
    await supabase.auth.signOut()
    console.log('✅ [AuthContext] Signed out successfully')
  }

  useEffect(() => {
    let mounted = true

    // Initialize auth state
    const initAuth = async () => {
      try {
        console.log('🔄 [AuthContext] Initializing auth...')

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ [AuthContext] Error getting session:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        console.log('📝 [AuthContext] Session found:', !!session)

        if (mounted) {
          setUser(session?.user ?? null)

          if (session?.user) {
            // Try to get profile
            try {
              const profileData = await getCurrentUserProfile()
              console.log('✅ [AuthContext] Profile loaded:', !!profileData)
              if (mounted) {
                setProfile(profileData)
              }
            } catch (profileError) {
              console.log('⚠️ [AuthContext] No profile found')
              if (mounted) {
                setProfile(null)
              }
            }
          } else {
            setProfile(null)
          }

          // ALWAYS set loading to false
          setLoading(false)
        }
      } catch (error) {
        console.error('💥 [AuthContext] Init error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Call init
    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [AuthContext] Auth state changed:', event, {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id
      })

      if (!mounted) {
        console.log('⚠️ [AuthContext] Component unmounted, ignoring auth change')
        return
      }

      // Update user state
      setUser(session?.user ?? null)

      // Handle different auth events
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [AuthContext] User signed in:', session.user.email)
        // Load profile after sign in
        try {
          const profileData = await getCurrentUserProfile()
          console.log('📋 [AuthContext] Profile loaded on SIGNED_IN:', !!profileData)
          if (mounted) {
            setProfile(profileData)
          }
        } catch (err) {
          console.log('⚠️ [AuthContext] No profile found on SIGNED_IN')
          if (mounted) {
            setProfile(null)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 [AuthContext] User signed out')
        if (mounted) {
          setProfile(null)
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [AuthContext] Token refreshed')
        // Profile stays the same, just token refresh
      } else if (event === 'USER_UPDATED' && session?.user) {
        console.log('📝 [AuthContext] User updated')
        // Reload profile in case it changed
        try {
          const profileData = await getCurrentUserProfile()
          if (mounted) {
            setProfile(profileData)
          }
        } catch {
          // Keep existing profile on error
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}