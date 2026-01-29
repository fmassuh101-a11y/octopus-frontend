import { supabase } from './supabase'
import { DBProfile } from './database'

// Simple auth check that doesn't use context
export async function checkAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { user: null, profile: null }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    return { user: session.user, profile: profile as DBProfile }
  } catch (error) {
    console.error('Error checking auth:', error)
    return { user: null, profile: null }
  }
}

// Utility to handle redirect after auth
export function getAuthRedirectPath(profile: DBProfile | null): string {
  // No profile or no user_type = need to select type
  if (!profile || !profile.user_type) {
    return '/auth/select-type'
  }

  // Creator: check if onboarding is complete
  if (profile.user_type === 'creator') {
    if (!profile.phone_number || !profile.location || !profile.academic_level) {
      return '/onboarding/creator/name'
    }
    return '/creator/dashboard'
  }

  // Company: go to dashboard
  if (profile.user_type === 'company') {
    return '/company/dashboard'
  }

  // Default fallback
  return '/auth/select-type'
}