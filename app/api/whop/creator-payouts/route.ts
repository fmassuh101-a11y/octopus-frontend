import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { shield } from '@/lib/shield'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * GET /api/whop/creator-payouts
 * Devuelve el historial de retiros del usuario AUTENTICADO
 * (antes filtraba el historial de cualquier userId del query string).
 */
export async function GET(request: NextRequest) {
  const _blocked = shield(request as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const userId = user.id

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
