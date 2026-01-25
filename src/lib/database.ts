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

export interface DBConversation {
  id: string
  gig_id: string
  creator_id: string
  company_id: string
  created_at: string
}

export interface DBMessage {
  id: string
  conversation_id: string
  sender_id: string
  text: string
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

export async function updateUserProfile(profileData: {
  full_name?: string
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
    .update(profileData)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
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

export async function getGigApplications(gigId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      profiles!creator_id (
        full_name,
        bio,
        skills,
        location
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

// === CONVERSATION OPERATIONS ===

export async function createConversation(gigId: string, creatorId: string, companyId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      gig_id: gigId,
      creator_id: creatorId,
      company_id: companyId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    throw error
  }

  return data
}

export async function getUserConversations() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      gigs (
        title,
        budget
      ),
      profiles!creator_id (
        full_name
      ),
      profiles!company_id (
        full_name,
        company_name
      )
    `)
    .or(`creator_id.eq.${user.id},company_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  return data || []
}

// === MESSAGE OPERATIONS ===

export async function sendMessage(conversationId: string, text: string) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      text
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending message:', error)
    throw error
  }

  return data
}

export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles!sender_id (
        full_name
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
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