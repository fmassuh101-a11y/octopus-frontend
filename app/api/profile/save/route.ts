import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'
import { shieldAsync } from '@/lib/shield'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * POST /api/profile/save
 * Guarda el perfil del usuario AUTENTICADO (el userId sale de la sesión,
 * nunca del body — antes cualquiera podía sobrescribir perfiles ajenos).
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 15 })
  if (_blocked) return _blocked

  const limited = rateLimit(request, { limit: 20, name: 'profile-save' })
  if (limited) return limited
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { profileData, userToken } = body
    const userId = user.id

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

    // WHITELIST: solo campos que el usuario PUEDE editar de su perfil.
    // NUNCA plan, plan_source, discount_percent, is_admin, verified, whop_*,
    // kyc_status, user_type, id, user_id, email (escalada / robo de payouts).
    const ALLOWED_FIELDS = [
      'full_name', 'username', 'bio', 'avatar_url', 'profile_photo_url',
      'phone_number', 'location', 'academic_level', 'studies', 'linkedin_url',
      'instagram', 'tiktok', 'youtube', 'skills', 'company_name', 'website',
    ]
    const safeData: any = {}
    for (const k of ALLOWED_FIELDS) {
      if (profileData && profileData[k] !== undefined) safeData[k] = profileData[k]
    }
    // user_type: permitido SOLO 'creator' o 'company' (nunca 'admin' ni otro).
    // Necesario para el onboarding; seguro porque admin se decide por email, no por user_type.
    if (profileData?.user_type === 'creator' || profileData?.user_type === 'company') {
      safeData.user_type = profileData.user_type
    }

    // Prepare profile data (solo campos permitidos)
    const dataToSave = {
      user_id: userId,
      ...safeData,
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
