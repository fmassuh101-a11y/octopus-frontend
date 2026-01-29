import { supabase } from './supabase'

// Database types matching MVP schema
export interface DBProfile {
  id: string
  user_id: string
  full_name: string
  bio?: string
  location?: string
  skills?: string[]
  company_name?: string
  website?: string
  user_type?: 'creator' | 'company'
  phone_number?: string
  academic_level?: string
  studies?: string
  linkedin_url?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  profile_photo_url?: string
  created_at: string
  updated_at: string
}

export interface DBGig {
  id: string
  company_id: string
  title: string
  description: string
  budget: string
  category: string
  deadline?: string
  status: 'active' | 'closed' | 'draft'
  requirements?: string
  deliverables?: string
  created_at: string
  updated_at: string
  profiles?: DBProfile
  applications_count?: number
}

export interface DBApplication {
  id: string
  gig_id: string
  creator_id: string
  proposal_text: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

// === GIG OPERATIONS ===

export async function getActiveGigs() {
  const { data, error } = await supabase
    .from('gigs')
    .select(`
      *,
      profiles!company_id (
        full_name,
        company_name
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching gigs:', error)
    return []
  }

  return data || []
}

export async function getGigById(id: string) {
  const { data, error } = await supabase
    .from('gigs')
    .select(`
      *,
      profiles!company_id (
        full_name,
        company_name,
        bio,
        location,
        website
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching gig:', error)
    return null
  }

  return data
}

export async function createGig(gigData: {
  title: string
  description: string
  budget: string
  category: string
  deadline?: string
  requirements?: string
  deliverables?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('gigs')
    .insert({
      ...gigData,
      company_id: user.id,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating gig:', error)
    throw error
  }

  return data
}

// === PROFILE OPERATIONS ===

export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function createUserProfile(profileData: {
  full_name: string
  bio?: string
  location?: string
  skills?: string[]
  company_name?: string
  website?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      ...profileData,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }

  return data
}

export async function updateUserProfile(profileData: {
  full_name?: string
  bio?: string
  location?: string
  skills?: string[]
  company_name?: string
  website?: string
  phone_number?: string
  academic_level?: string
  studies?: string
  linkedin_url?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  profile_photo_url?: string
  user_type?: 'creator' | 'company'
}) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  try {
    // First check if the profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: profileData.full_name || user.email?.split('@')[0] || 'Usuario',
          ...profileData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        if (error.code === '42703') {
          throw new Error('La base de datos necesita ser actualizada. Por favor contacta al administrador.')
        }
        throw new Error(`Error al crear perfil: ${error.message}`)
      }

      return data
    } else {
      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        if (error.code === '42703') {
          throw new Error('La base de datos necesita ser actualizada. Por favor contacta al administrador.')
        }
        throw new Error(`Error al actualizar perfil: ${error.message}`)
      }

      return data
    }
  } catch (error: any) {
    console.error('updateUserProfile error:', error)
    throw error
  }
}

export async function saveCreatorOnboarding(onboardingData: {
  firstName: string
  lastName: string
  countryCode: string
  phoneNumber: string
  academicLevel: string
  location: string
  studies: string
  linkedInUrl?: string
  socialMedia: {
    instagram?: string
    tiktok?: string
    youtube?: string
  }
  profilePhoto?: string
}) {
  try {
    console.log('saveCreatorOnboarding: Starting function')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated. Please sign in first.')
    }

    console.log('saveCreatorOnboarding: User found:', user.email)

    const profileData = {
      user_id: user.id,
      full_name: `${onboardingData.firstName} ${onboardingData.lastName}`,
      location: onboardingData.location,
      phone_number: `${onboardingData.countryCode}${onboardingData.phoneNumber}`,
      academic_level: onboardingData.academicLevel,
      studies: onboardingData.studies,
      linkedin_url: onboardingData.linkedInUrl || null,
      instagram: onboardingData.socialMedia.instagram || null,
      tiktok: onboardingData.socialMedia.tiktok || null,
      youtube: onboardingData.socialMedia.youtube || null,
      profile_photo_url: onboardingData.profilePhoto || null,
      user_type: 'creator' as const
    }

    console.log('saveCreatorOnboarding: Attempting to save profile data:', profileData)

    // Use upsert to simplify - it will create or update
    console.log('saveCreatorOnboarding: Using upsert to save profile')
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'user_id'
      })
      .select()

    console.log('Upsert response:', { data, error })

    if (error) {
      console.error('❌ Error saving profile:', error)
      throw error // Throw error to see what's wrong
    }

    const result = data?.[0] // Get first item from array

    console.log('saveCreatorOnboarding: Profile saved successfully', result)
    return result

  } catch (error: any) {
    console.error('saveCreatorOnboarding: Error in function', error)
    throw error
  }
}

// === APPLICATION OPERATIONS ===

export async function applyToGig(gigId: string, proposalText: string) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      gig_id: gigId,
      creator_id: user.id,
      proposal_text: proposalText
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating application:', error)
    throw error
  }

  return data
}

export async function getUserApplications() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      gigs (
        title,
        budget,
        category,
        profiles!company_id (
          full_name,
          company_name
        )
      )
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
    return []
  }

  return data || []
}

export async function getCompanyGigs() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('gigs')
    .select('*')
    .eq('company_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching company gigs:', error)
    return []
  }

  return data || []
}

export async function getGigApplications(gigId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      profiles!creator_id (
        full_name,
        avatar_url
      )
    `)
    .eq('gig_id', gigId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching gig applications:', error)
    return []
  }

  return data || []
}

// === UTILITY FUNCTIONS ===

export function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

export function formatDeadline(deadline?: string): string {
  if (!deadline) return 'No deadline'

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffInDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays < 0) {
    return 'Deadline passed'
  } else if (diffInDays === 0) {
    return 'Due today'
  } else if (diffInDays === 1) {
    return '1 day left'
  } else if (diffInDays <= 7) {
    return `${diffInDays} days left`
  } else {
    return deadlineDate.toLocaleDateString()
  }
}