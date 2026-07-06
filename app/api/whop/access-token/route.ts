import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { shieldAsync } from '@/lib/shield'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * POST /api/whop/access-token
 * Genera un access token de Whop para el usuario AUTENTICADO
 * (antes aceptaba cualquier userId del body → robo de tokens ajenos).
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const userId = user.id

    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

    // Get profile with whop_company_id
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=whop_company_id`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'apikey': apiKey
        }
      }
    )

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Failed to get profile" }, { status: 500 })
    }

    const profiles = await profileRes.json()
    if (profiles.length === 0 || !profiles[0].whop_company_id) {
      return NextResponse.json({ error: "No Whop company", needsSetup: true }, { status: 400 })
    }

    const companyId = profiles[0].whop_company_id

    // Generate access token for embedded components
    const tokenResponse = await whopClient.accessTokens.create({
      company_id: companyId
    })

    return NextResponse.json({
      success: true,
      token: (tokenResponse as any).token || tokenResponse,
      companyId
    })

  } catch (error) {
    console.error("[Access Token] Error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
