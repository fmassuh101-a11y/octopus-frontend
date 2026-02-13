import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

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

    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
    const authToken = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

    // Get profile with whop_company_id
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=whop_company_id`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': apiKey
        }
      }
    )

    if (!profileRes.ok) {
      return NextResponse.json({ payouts: [] })
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
      const withdrawals = await whopClient.withdrawals.list({
        company_id: companyId
      })

      payouts = (withdrawals.data || []).map((w: any) => ({
        id: w.id,
        amount: w.amount / 100,
        status: w.status || 'pending',
        method: w.payout_method?.type || 'bank',
        methodIcon: getMethodIcon(w.payout_method?.type),
        date: formatDate(w.created_at),
        createdAt: w.created_at
      }))
    } catch (withdrawalsError) {
      console.error("[Creator Payouts] Error fetching withdrawals:", withdrawalsError)
    }

    try {
      const transfers = await whopClient.transfers.list({
        destination_id: companyId
      })

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
    return NextResponse.json({ payouts: [] })
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
