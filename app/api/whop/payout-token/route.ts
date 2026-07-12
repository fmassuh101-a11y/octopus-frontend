import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/whop/payout-token
 * Mintea un access token scoped a la connected account del creador para el
 * PayoutsSession embebido (KYC + agregar banco + balance + retiro) DENTRO de
 * Octopus — sin sacar al usuario a whop.com.
 */
export async function GET(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (_blocked) return _blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // connected account del creador
    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=whop_company_id`,
      { headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey } }
    );
    const companyId = ((pRes.ok ? await pRes.json() : [])[0])?.whop_company_id || null;
    if (!companyId) {
      return NextResponse.json({ error: "Primero activá los pagos", needsSetup: true }, { status: 400 });
    }

    // token con permisos de payouts (KYC, método de pago, balance, retiro)
    const res: any = await (whopClient as any).accessTokens.create({
      company_id: companyId,
      scoped_actions: [
        "payouts:read", "payouts:withdraw",
        "identity:write", "payout_method:manage",
      ],
    });
    const token = res?.token || res?.access_token || null;
    if (!token) {
      console.error("[PayoutToken] respuesta sin token:", JSON.stringify(res)?.slice(0, 200));
      return NextResponse.json({ error: "No se pudo crear el token" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, token, companyId });
  } catch (e: any) {
    console.error("[PayoutToken] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo crear el token de pagos" }, { status: 500 });
  }
}
