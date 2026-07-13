import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, OCTOPUS_FEE_PERCENT, MIN_WITHDRAW_USD } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/whop/request-withdraw  Body: { amount }
 * Retiro del creador desde SU saldo del ledger (tabla wallets):
 * 1. Valida sesión + KYC de Whop (payouts_enabled).
 * 2. Descuenta el saldo y crea la solicitud ATÓMICAMENTE (RPC oct_request_withdrawal,
 *    fila bloqueada => sin dobles retiros). Fee: 3.7% no-Pro / 0% Pro, mínimo $20.
 * 3. Intenta transferir el neto a la connected account del creador en Whop.
 *    Si la transferencia falla, la solicitud queda 'pending' y la procesa el admin.
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (_blocked) return _blocked;
  const limited = rateLimit(request, { limit: 5, name: "whop-request-withdraw" });
  if (limited) return limited;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const body = await request.json().catch(() => ({}));
    const amount = Math.round(Number(body?.amount) * 100) / 100;

    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_USD) {
      return NextResponse.json({ error: `El retiro mínimo es $${MIN_WITHDRAW_USD}` }, { status: 400 });
    }

    // perfil: cuenta Whop + flag Pro
    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=whop_company_id,is_pro`,
      { headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey } }
    );
    const profiles = profRes.ok ? await profRes.json() : [];
    const profile = profiles[0] || {};
    if (!profile.whop_company_id) {
      return NextResponse.json({ error: "Primero activá los pagos", needsSetup: true }, { status: 400 });
    }

    // KYC aprobado en Whop (si no, no puede cobrar)
    let kycOk = false;
    try {
      const company: any = await whopClient.companies.retrieve(profile.whop_company_id);
      kycOk = company?.payouts_enabled === true;
      if (!kycOk) {
        const methods = await whopClient.payoutMethods.list({ company_id: profile.whop_company_id });
        kycOk = (methods.data || []).length > 0;
      }
    } catch {}
    if (!kycOk) {
      return NextResponse.json({ error: "Completá tu verificación antes de retirar", needsKyc: true }, { status: 400 });
    }

    // FEE 0 POR AHORA (decisión de Felipe jul-13): la plataforma vive de las
    // suscripciones hasta cerrar con Whop el % por transacción (feeMarkups /
    // Whop for Platforms). Cuando se apruebe, volver a: is_pro ? 0 : OCTOPUS_FEE_PERCENT.
    const feePercent = 0;
    void OCTOPUS_FEE_PERCENT; void profile.is_pro;

    // descuento ATÓMICO del ledger (como el usuario — auth.uid() = él mismo)
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_request_withdrawal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ p_amount: amount, p_fee_percent: feePercent }),
    });
    const rpc = await rpcRes.json().catch(() => null);
    if (!rpcRes.ok || !rpc?.ok) {
      const code = rpc?.error;
      const msg =
        code === "insufficient" ? "Saldo insuficiente"
        : code === "min_20" ? `El retiro mínimo es $${MIN_WITHDRAW_USD}`
        : code === "no_wallet" ? "No encontramos tu wallet"
        : "No se pudo procesar el retiro (¿corriste PAGOS_SETUP_2026-07-08.sql?)";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // transferir el NETO a la connected account del creador (el fee queda en la plataforma)
    let transferId: string | null = null;
    let sent = false;
    try {
      const transfer: any = await whopClient.transfers.create({
        amount: rpc.net,
        currency: "usd",
        origin_id: OCTOPUS_COMPANY_ID,
        destination_id: profile.whop_company_id,
        idempotence_key: `wd_${rpc.id}`,
        notes: "Retiro Octopus",
        metadata: { withdrawal_id: rpc.id, octopus_user_id: user.id },
      } as any);
      transferId = transfer?.id || null;
      sent = !!transferId;
    } catch (e) {
      console.error("[Withdraw] transfer failed (queda pending para el admin):", e);
    }

    // reflejar estado (best effort, con service key)
    if (SUPABASE_SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_requests?id=eq.${rpc.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify(sent ? { status: "completed", whop_transfer_id: transferId } : { status: "pending" }),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      id: rpc.id,
      amount,
      fee: rpc.fee,
      net: rpc.net,
      sent, // true = ya viajó a su cuenta Whop; false = queda en revisión del admin
    });
  } catch (e: any) {
    console.error("[Withdraw] error:", e);
    return NextResponse.json({ error: "Error procesando el retiro" }, { status: 500 });
  }
}
