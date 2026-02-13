import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

/**
 * POST /api/profile/save
 * Saves user profile - uses service key if available, falls back to user token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, profileData, userToken } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Use service key if available, otherwise fall back to user's token
    let authKey = SUPABASE_SERVICE_KEY
    let useServiceKey = true

    if (!SUPABASE_SERVICE_KEY) {
      // No service key - use user's token if provided, else anon key
      authKey = userToken || SUPABASE_ANON_KEY
      useServiceKey = false
      console.log('[SaveProfile] No service key, using', userToken ? 'user token' : 'anon key')
    }

    console.log('[SaveProfile] Saving profile for user:', userId, 'Using service key:', useServiceKey)

    // Check if profile exists
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${authKey}`,
          'apikey': authKey
        }
      }
    )

    const existingProfiles = await checkRes.json()
    const profileExists = existingProfiles && existingProfiles.length > 0

    console.log('[SaveProfile] Profile exists:', profileExists)

    // Prepare profile data
    const dataToSave = {
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    }

    let saveRes
    if (profileExists) {
      // Update existing profile
      saveRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authKey}`,
            'apikey': authKey,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(dataToSave)
        }
      )
    } else {
      // Insert new profile - use upsert to handle RLS
      saveRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authKey}`,
            'apikey': authKey,
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(dataToSave)
        }
      )
    }

    if (!saveRes.ok) {
      const errorText = await saveRes.text()
      console.error('[SaveProfile] Error:', saveRes.status, errorText)
      return NextResponse.json(
        { error: `Database error: ${errorText}` },
        { status: saveRes.status }
      )
    }

    const savedProfile = await saveRes.json()
    console.log('[SaveProfile] Success:', savedProfile)

    return NextResponse.json({
      success: true,
      profile: Array.isArray(savedProfile) ? savedProfile[0] : savedProfile
    })

  } catch (error) {
    console.error('[SaveProfile] Exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
