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

    // Las dos llamadas a Whop EN PARALELO (antes iban en serie y la página
    // esperaba el doble). OJO: companies.retrieve NO devuelve payouts_enabled
    // (siempre undefined) — la señal REAL de que puede cobrar es tener un
    // método de pago agregado.
    const [companyRes, methodsRes] = await Promise.allSettled([
      whopClient.companies.retrieve(companyId),
      whopClient.payoutMethods.list({ company_id: companyId }),
    ])
    if (companyRes.status === "fulfilled" && companyRes.value) {
      const company: any = companyRes.value
      balance = company.available_balance ? company.available_balance / 100 : 0
      totalBalance = company.total_balance ? company.total_balance / 100 : balance
    } else if (companyRes.status === "rejected") {
      console.error("[Creator Balance] Error fetching company:", companyRes.reason)
    }
    if (methodsRes.status === "fulfilled") {
      payoutMethods = (methodsRes.value as any).data || []
      if (payoutMethods.length > 0) kycComplete = true
    } else {
      console.error("[Creator Balance] Error fetching payout methods:", methodsRes.reason)
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
