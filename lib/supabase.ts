import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/supabase'

// Create client with session persistence
// IMPORTANT: Using default storage key so it matches what login pages use
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

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