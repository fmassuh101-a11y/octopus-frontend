import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * GET /api/whop/creator-balance?userId=xxx
 * Returns creator's Whop balance, KYC status, and payout methods
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Get profile with whop_company_id
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=whop_company_id,full_name`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      }
    )

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Failed to get profile" }, { status: 500 })
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
    let kycComplete = false
    let payoutMethods: any[] = []

    try {
      const company = await whopClient.companies.retrieve(companyId)

      // Check KYC status - if company has payouts_enabled or similar
      // The company object should have balance info
      if (company) {
        // Whop SDK company object structure
        // balance is typically in cents, convert to dollars
        balance = (company as any).available_balance ? (company as any).available_balance / 100 : 0
        totalBalance = (company as any).total_balance ? (company as any).total_balance / 100 : balance
        kycComplete = (company as any).payouts_enabled || (company as any).charges_enabled || false
      }
    } catch (companyError) {
      console.error("[Creator Balance] Error fetching company:", companyError)
    }

    // Get payout methods
    try {
      const methods = await whopClient.payoutMethods.list({
        company_id: companyId
      })
      payoutMethods = methods.data || []
      // If they have payout methods, KYC is likely complete
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
