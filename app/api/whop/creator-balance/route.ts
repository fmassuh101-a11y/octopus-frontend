import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { shieldAsync } from '@/lib/shield'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * GET /api/whop/creator-balance
 * Devuelve balance/KYC/métodos de pago del usuario AUTENTICADO
 * (antes filtraba el balance de cualquier userId del query string).
 */
export async function GET(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const userId = user.id
    const userToken = null

    // Use service key if available, otherwise use anon key with user token
    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
    const authToken = SUPABASE_SERVICE_KEY || userToken || SUPABASE_ANON_KEY

    // Get profile with whop_company_id
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=whop_company_id,full_name`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': apiKey
        }
      }
    )

    if (!profileRes.ok) {
      const errorText = await profileRes.text()
      console.error("[Creator Balance] Profile fetch error:", profileRes.status, errorText)
      return NextResponse.json({ error: "Failed to get profile", details: errorText }, { status: 500 })
    }

    const profiles = await profileRes.json()
    if (profiles.length === 0 || !profiles[0].whop_company_id) {
      return NextResponse.json({
        needsSetup: true,
        balance: 0,
        totalBalance: 0,
        kycComplete: false
      })
    }

    const companyId = profiles[0].whop_company_id

    // Get company info from Whop (includes balance)
    let balance = 0
    let totalBalance = 0
    let kycComplete = false // Default to false - user must verify
    let payoutMethods: any[] = []

    try {
      const company = await whopClient.companies.retrieve(companyId)

      if (company) {
        balance = (company as any).available_balance ? (company as any).available_balance / 100 : 0
        totalBalance = (company as any).total_balance ? (company as any).total_balance / 100 : balance
        // OJO: companies.retrieve NO devuelve payouts_enabled (siempre undefined),
        // por eso el banner nunca se marcaba verificado. La señal REAL de que el
        // creador puede cobrar es tener un método de pago agregado (abajo).
      }
    } catch (companyError) {
      console.error("[Creator Balance] Error fetching company:", companyError)
    }

    // Get payout methods - if they have any, KYC is definitely complete
    try {
      const methods = await whopClient.payoutMethods.list({
        company_id: companyId
      })
      payoutMethods = methods.data || []
      // If user has payout methods configured, they've completed KYC
      if (payoutMethods.length > 0) {
        kycComplete = true
      }
    } catch (methodsError) {
      console.error("[Creator Balance] Error fetching payout methods:", methodsError)
    }

    return NextResponse.json({
      success: true,
      companyId,
      balance,
      totalBalance,
      kycComplete,
      hasPayoutMethods: payoutMethods.length > 0,
      payoutMethodsCount: payoutMethods.length
    })

  } catch (error) {
    console.error("[Creator Balance] Error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
