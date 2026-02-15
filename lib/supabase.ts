import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/supabase'

// Custom storage adapter that maps Supabase's keys to our custom keys
const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null

    // When Supabase asks for its default key, return our custom stored session
    const accessToken = localStorage.getItem('sb-access-token')
    const refreshToken = localStorage.getItem('sb-refresh-token')
    const userStr = localStorage.getItem('sb-user')

    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr)
        return JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_in: 3600,
          token_type: 'bearer',
          user: user
        })
      } catch (e) {
        return null
      }
    }
    return null
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return

    try {
      const data = JSON.parse(value)
      if (data.access_token) {
        localStorage.setItem('sb-access-token', data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem('sb-refresh-token', data.refresh_token)
      }
      if (data.user) {
        localStorage.setItem('sb-user', JSON.stringify(data.user))
      }
    } catch (e) {
      console.error('[Supabase Storage] Error setting item:', e)
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
  }
}

// Create client with custom storage that syncs with our localStorage keys
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: customStorage
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