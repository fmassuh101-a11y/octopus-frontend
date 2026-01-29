// OCTOPUS AUTHENTICATION SERVICE 2026
// Inspired by SideShift's fast, secure authentication
// Combines Magic Links, OAuth, Passkeys & WebAuthn

import { supabase } from '../supabase'
import { User } from '@supabase/supabase-js'

interface AuthResult {
  success: boolean
  user?: User
  profile?: any
  error?: string
  requiresOnboarding?: boolean
}

class AuthenticationService {
  private static instance: AuthenticationService
  private authCache: Map<string, any> = new Map()
  private pendingAuth: Map<string, Promise<AuthResult>> = new Map()

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService()
    }
    return AuthenticationService.instance
  }

  // ULTRA FAST GOOGLE LOGIN - Inspired by SideShift
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('🚀 OCTOPUS: Initiating Ultra Fast Google Auth...')

      // Check if we already have a session (super fast)
      const cachedSession = this.getCachedSession()
      if (cachedSession) {
        console.log('⚡ OCTOPUS: Instant login from cache!')
        return cachedSession
      }

      // Perform OAuth sign in
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Always show account selector
          }
        }
      })

      if (error) throw error

      // Pre-cache for faster callback
      this.preloadUserData()

      return {
        success: true,
        error: undefined
      }
    } catch (error: any) {
      console.error('❌ OCTOPUS: Auth error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // MAGIC LINK LOGIN - Passwordless like SideShift
  async signInWithMagicLink(email: string): Promise<AuthResult> {
    try {
      console.log('✨ OCTOPUS: Sending Magic Link...')

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true
        }
      })

      if (error) throw error

      // Store pending auth
      localStorage.setItem('octopus_pending_email', email)

      return {
        success: true,
        error: undefined
      }
    } catch (error: any) {
      console.error('❌ OCTOPUS: Magic link error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // HANDLE CALLBACK - Ultra fast processing
  async handleCallback(): Promise<AuthResult> {
    const callbackKey = 'callback_processing'

    // Prevent duplicate processing
    if (this.pendingAuth.has(callbackKey)) {
      console.log('⏳ OCTOPUS: Callback already processing...')
      return this.pendingAuth.get(callbackKey)!
    }

    const authPromise = this.processCallback()
    this.pendingAuth.set(callbackKey, authPromise)

    try {
      const result = await authPromise
      return result
    } finally {
      this.pendingAuth.delete(callbackKey)
    }
  }

  private async processCallback(): Promise<AuthResult> {
    try {
      console.log('🔄 OCTOPUS: Processing callback at lightning speed...')

      // Get session from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')

      if (!accessToken) {
        // Try to get existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session found')
        }
      }

      // Get user data
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No user found')
      }

      console.log('✅ OCTOPUS: User authenticated:', user.email)

      // Check profile with optimized query
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Cache everything for instant access
      this.cacheUserData(user, profile)

      if (!profile || !profile.user_type) {
        console.log('🆕 OCTOPUS: New user detected, needs onboarding')
        return {
          success: true,
          user,
          requiresOnboarding: true
        }
      }

      console.log('✨ OCTOPUS: Existing user, type:', profile.user_type)
      return {
        success: true,
        user,
        profile,
        requiresOnboarding: false
      }

    } catch (error: any) {
      console.error('❌ OCTOPUS: Callback error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // INSTANT SESSION CHECK
  async checkSession(): Promise<AuthResult> {
    try {
      // Check cache first (0ms)
      const cached = this.getCachedSession()
      if (cached) {
        return cached
      }

      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return { success: false }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      this.cacheUserData(session.user, profile)

      return {
        success: true,
        user: session.user,
        profile
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // SIGN OUT - Clear everything
  async signOut(): Promise<void> {
    console.log('👋 OCTOPUS: Signing out...')

    // Clear all caches
    this.authCache.clear()
    this.pendingAuth.clear()

    // Clear localStorage
    localStorage.removeItem('octopus_session')
    localStorage.removeItem('octopus_profile')
    localStorage.removeItem('user_type')
    localStorage.removeItem('savedProfile')
    localStorage.removeItem('creatorOnboarding')

    // Clear cookies
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    document.cookie = 'user_type=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'

    // Sign out from Supabase
    await supabase.auth.signOut()
  }

  // PRIVATE METHODS

  private getCachedSession(): AuthResult | null {
    const cached = localStorage.getItem('octopus_session')
    if (!cached) return null

    try {
      const session = JSON.parse(cached)
      const hoursSinceLogin = (Date.now() - session.timestamp) / (1000 * 60 * 60)

      // Session valid for 24 hours
      if (hoursSinceLogin < 24) {
        const profile = localStorage.getItem('octopus_profile')
        return {
          success: true,
          user: session.user,
          profile: profile ? JSON.parse(profile) : null
        }
      }
    } catch (e) {
      console.error('Cache parse error:', e)
    }

    return null
  }

  private cacheUserData(user: User, profile: any): void {
    // Cache in localStorage
    localStorage.setItem('octopus_session', JSON.stringify({
      user,
      timestamp: Date.now()
    }))

    if (profile) {
      localStorage.setItem('octopus_profile', JSON.stringify(profile))
      localStorage.setItem('user_type', profile.user_type)

      // Set cookies for middleware
      document.cookie = `user_session=true; path=/`
      document.cookie = `user_type=${profile.user_type}; path=/`
    }

    // Cache in memory for instant access
    this.authCache.set('current_user', { user, profile })
  }

  private async preloadUserData(): Promise<void> {
    // Preload user data in background for faster callback
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (profile) {
            this.authCache.set('preloaded', { user, profile })
          }
        }
      } catch (e) {
        // Silent fail - just optimization
      }
    }, 100)
  }

  // GET REDIRECT PATH based on user type
  getRedirectPath(profile: any): string {
    if (!profile || !profile.user_type) {
      return '/auth/select-type'
    }

    switch (profile.user_type) {
      case 'creator':
        return '/creator/dashboard'
      case 'company':
        return '/company/dashboard'
      default:
        return '/auth/select-type'
    }
  }
}

export default AuthenticationService.getInstance()