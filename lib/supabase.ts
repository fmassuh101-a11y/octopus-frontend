import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/supabase'

// Supabase client with OAuth callback detection enabled
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true  // CRITICAL: Enables OAuth token detection from URL hash
  }
})

// Helper to get current session from localStorage
export const getStoredSession = () => {
  if (typeof window === 'undefined') return null

  const accessToken = localStorage.getItem('sb-access-token')
  const refreshToken = localStorage.getItem('sb-refresh-token')
  const userStr = localStorage.getItem('sb-user')

  if (!accessToken || !userStr) return null

  try {
    const user = JSON.parse(userStr)
    return {
      access_token: accessToken,
      refresh_token: refreshToken || '',
      user: user
    }
  } catch (e) {
    return null
  }
}

// Helper to set session in Supabase client from localStorage
export const restoreSession = async () => {
  const stored = getStoredSession()
  if (stored) {
    await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token
    })
  }
  return stored
}

// Helper to sync session to our custom localStorage keys
export const syncSessionToStorage = async () => {
  if (typeof window === 'undefined') return

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      localStorage.setItem('sb-access-token', session.access_token)
      localStorage.setItem('sb-user', JSON.stringify(session.user))
      localStorage.setItem('sb-refresh-token', session.refresh_token || '')
    }
  } catch (e) {
    console.error('Error syncing session:', e)
  }
}

// Helper to refresh session if needed
export const refreshSessionIfNeeded = async () => {
  if (typeof window === 'undefined') return null

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      // Try to refresh using stored refresh token
      const refreshToken = localStorage.getItem('sb-refresh-token')
      if (refreshToken) {
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError && data.session) {
          await syncSessionToStorage()
          return data.session
        }
      }
      return null
    }

    // Sync current session
    await syncSessionToStorage()
    return session
  } catch (e) {
    console.error('Error refreshing session:', e)
    return null
  }
}

export type Profile = {
  id: string
  user_id: string
  full_name: string
  bio?: string
  location?: string
  skills?: string[]
  company_name?: string
  website?: string
  created_at: string
  updated_at: string
  user_type?: string
  username?: string
  email?: string
  role?: string
  company_type?: string
  company_description?: string
  avatar_url?: string
  country?: string
  phone_number?: string
  experience_level?: string
  whop_company_id?: string
}