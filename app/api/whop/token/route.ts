import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'
import { shield } from '@/lib/shield'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * GET /api/whop/token
 * Genera un access token para los componentes embebidos de Whop.
 * El companyId se deriva SIEMPRE del perfil del usuario autenticado
 * (antes venía del query string → cualquiera sacaba token de otra empresa).
 */
export async function GET(request: NextRequest) {
  const _blocked = shield(request as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  const limited = rateLimit(request, { limit: 15, name: 'whop-token' })
  if (limited) return limited

  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config incompleta" }, { status: 500 })

  try {
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=whop_company_id`,
      { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
    )
    const profiles = pRes.ok ? await pRes.json() : []
    const companyId = profiles[0]?.whop_company_id
    if (!companyId) {
      return NextResponse.json({ error: "No tienes una cuenta de pagos configurada", needsSetup: true }, { status: 400 });
    }

    const tokenResponse = await whopClient.accessTokens.create({ company_id: companyId });
    return NextResponse.json({ token: tokenResponse.token });
  } catch (error) {
    console.error("[Whop Token] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar token" },
      { status: 500 }
    );
  }
}
