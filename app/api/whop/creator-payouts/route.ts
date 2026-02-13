import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * GET /api/whop/creator-payouts?userId=xxx
 * Returns creator's withdrawal/payout history
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

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
        payouts: [],
        needsSetup: true
      })
    }

    const companyId = profiles[0].whop_company_id
    let payouts: any[] = []

    try {
      // Get withdrawals for this company
      const withdrawals = await whopClient.withdrawals.list({
        company_id: companyId
      })

      // Transform to our format
      payouts = (withdrawals.data || []).map((w: any) => ({
        id: w.id,
        amount: w.amount / 100, // Convert from cents
        status: w.status || 'pending',
        method: w.payout_method?.type || 'bank',
        methodIcon: getMethodIcon(w.payout_method?.type),
        date: formatDate(w.created_at),
        createdAt: w.created_at
      }))
    } catch (withdrawalsError) {
      console.error("[Creator Payouts] Error fetching withdrawals:", withdrawalsError)
    }

    // Also try to get transfers TO this company (incoming payments)
    try {
      const transfers = await whopClient.transfers.list({
        destination_id: companyId
      })

      // Add transfers as "received" type
      const incomingPayments = (transfers.data || []).map((t: any) => ({
        id: t.id,
        amount: t.amount / 100,
        status: t.status || 'completed',
        method: 'transfer',
        methodIcon: 'crypto' as const,
        date: formatDate(t.created_at),
        createdAt: t.created_at,
        type: 'incoming'
      }))

      // Combine and sort by date
      payouts = [...payouts, ...incomingPayments].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } catch (transfersError) {
      console.error("[Creator Payouts] Error fetching transfers:", transfersError)
    }

    return NextResponse.json({
      success: true,
      companyId,
      payouts
    })

  } catch (error) {
    console.error("[Creator Payouts] Error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

function getMethodIcon(type?: string): 'bank' | 'paypal' | 'bitcoin' | 'crypto' {
  switch (type?.toLowerCase()) {
    case 'bank':
    case 'bank_account':
      return 'bank'
    case 'paypal':
      return 'paypal'
    case 'bitcoin':
    case 'btc':
      return 'bitcoin'
    default:
      return 'crypto'
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
