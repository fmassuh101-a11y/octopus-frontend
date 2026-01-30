import { createClient } from '@supabase/supabase-js'

// Hardcoded values to ensure they work in production
const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

// Create client with minimal options
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false  // We'll handle this manually
  }
})

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
}