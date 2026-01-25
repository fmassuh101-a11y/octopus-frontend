import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our app
export interface Profile {
  id: string
  email: string
  username: string
  full_name: string
  role: 'creator' | 'company'
  avatar_url?: string
  country?: string
  phone_number?: string
  experience_level?: string
  company_name?: string
  company_type?: string
  company_description?: string
  company_logo_url?: string
  payment_options?: {
    cpm?: boolean
    fixed?: boolean
    fixed_plus_cpm?: boolean
  }
  created_at: string
  updated_at: string
}

export interface Gig {
  id: string
  company_id: string
  title: string
  description: string
  gig_image_url?: string
  payment_type: 'cpm' | 'fixed' | 'fixed_plus_cpm'
  cpm_rate?: number
  fixed_amount?: number
  instagram_url?: string
  tiktok_url?: string
  linkedin_url?: string
  website_url?: string
  appstore_url?: string
  company_location?: string
  status: 'active' | 'paused' | 'closed'
  applications_count: number
  created_at: string
  company?: Profile
}

export interface Application {
  id: string
  gig_id: string
  creator_id: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}