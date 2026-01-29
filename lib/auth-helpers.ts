import type { DBProfile } from './database'

// Helper function to determine where to redirect after successful auth
export function getRedirectPath(profile: DBProfile | null): string {
  // If user doesn't have a profile or user_type, they need to select their role
  if (!profile || !profile.user_type) {
    return '/auth/select-type'
  }

  // For creators, check if they've completed onboarding
  if (profile.user_type === 'creator') {
    // Check if onboarding is complete
    const hasBasicInfo = profile.full_name && profile.location
    const hasPhoneNumber = profile.phone_number
    const hasEducationInfo = profile.academic_level && profile.studies

    if (!hasBasicInfo || !hasPhoneNumber || !hasEducationInfo) {
      // Send to onboarding if not complete
      console.log('🎯 [getRedirectPath] Creator needs onboarding, redirecting to /onboarding/creator/name')
      return '/onboarding/creator/name'
    }

    // Onboarding complete, go to dashboard
    return '/creator/dashboard'
  } else if (profile.user_type === 'company') {
    return '/company/dashboard'
  }

  // Fallback - should not happen
  return '/auth/select-type'
}

// Helper function to check if user needs onboarding
export function needsOnboarding(profile: DBProfile | null): boolean {
  return !profile || !profile.user_type
}