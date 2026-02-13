import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'

/**
 * POST /api/whop/withdraw
 * Body: { userId, action: 'portal' | 'withdraw', amount?, payoutMethodId? }
 *
 * action: 'portal' - Returns URL to Whop payout portal where user can withdraw
 * action: 'withdraw' - Initiates direct withdrawal (requires amount and payoutMethodId)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action = 'portal', amount, payoutMethodId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Get profile with whop_company_id
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=whop_company_id`,
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
        error: "No payment account configured",
        needsSetup: true
      }, { status: 400 })
    }

    const companyId = profiles[0].whop_company_id

    if (action === 'portal') {
      // Generate payout portal link - user can manage their payout methods and withdraw
      const accountLink = await whopClient.accountLinks.create({
        company_id: companyId,
        use_case: "payouts_portal",
        return_url: `${APP_URL}/creator/wallet`,
        refresh_url: `${APP_URL}/creator/wallet`,
      })

      return NextResponse.json({
        success: true,
        portalUrl: accountLink.url
      })
    }

    if (action === 'withdraw') {
      // Direct withdrawal
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }
      if (!payoutMethodId) {
        return NextResponse.json({ error: "Payout method required" }, { status: 400 })
      }

      const withdrawal = await whopClient.withdrawals.create({
        company_id: companyId,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payout_method_id: payoutMethodId,
        platform_covers_fees: false
      })

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: withdrawal.id,
          amount: (withdrawal as any).amount / 100,
          status: (withdrawal as any).status
        }
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("[Withdraw] Error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
