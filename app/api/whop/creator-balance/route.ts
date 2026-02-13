import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

/**
 * GET /api/whop/creator-balance?userId=xxx
 * Returns creator's Whop balance, KYC status, and payout methods
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const userToken = request.nextUrl.searchParams.get('token')

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

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
    let kycComplete = true // Default to true so users can see wallet
    let payoutMethods: any[] = []

    try {
      const company = await whopClient.companies.retrieve(companyId)

      if (company) {
        balance = (company as any).available_balance ? (company as any).available_balance / 100 : 0
        totalBalance = (company as any).total_balance ? (company as any).total_balance / 100 : balance
        // Check various KYC/payout status fields
        kycComplete = (company as any).payouts_enabled ?? (company as any).charges_enabled ?? true
      }
    } catch (companyError) {
      console.error("[Creator Balance] Error fetching company:", companyError)
      // If we can't fetch company, still show wallet with 0 balance
    }

    // Get payout methods
    try {
      const methods = await whopClient.payoutMethods.list({
        company_id: companyId
      })
      payoutMethods = methods.data || []
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
