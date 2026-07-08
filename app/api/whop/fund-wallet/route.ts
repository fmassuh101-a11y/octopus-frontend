import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fee de plataforma a la MARCA según su plan (tiered):
// sin plan 8% · Crecimiento 5% · Pro empresa 2%
function brandFeePercent(plan?: string | null): number {
  if (plan === "pro") return 0.02;
  if (plan === "growth" || plan === "crecimiento") return 0.05;
  return 0.08;
}

/**
 * POST /api/whop/fund-wallet  Body: { amount }
 * La empresa fondea su wallet: creamos un checkout de Whop por (monto + fee de plataforma).
 * Devuelve planId/sessionId para el checkout embebido + un fundingId para verificar.
 *
 * GET /api/whop/fund-wallet?fundingId=...
 * Verifica contra la API de Whop si el pago ya está y ACREDITA el wallet
 * (idempotente vía RPC oct_apply_topup — un pago acredita una sola vez).
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (_blocked) return _blocked;
  const limited = rateLimit(request, { limit: 10, name: "fund-wallet" });
  if (limited) return limited;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const base = Math.round(Number(body?.amount) * 100) / 100;
    if (!Number.isFinite(base) || base < 1 || base > 50000) {
      return NextResponse.json({ error: "Monto inválido (mínimo $1)" }, { status: 400 });
    }

    // plan de la empresa para el fee tiered (si la columna no existe, cae al 8%)
    let plan: string | null = null;
    try {
      const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=company_plan`, {
        headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey },
      });
      if (r.ok) plan = (await r.json())?.[0]?.company_plan || null;
    } catch {}

    const feePct = brandFeePercent(plan);
    const fee = Math.round(base * feePct * 100) / 100;
    const total = Math.round((base + fee) * 100) / 100;
    const fundingId = `fund_${user.id.slice(0, 8)}_${Date.now()}`;

    const cfg: any = await whopClient.checkoutConfigurations.create({
      plan: {
        company_id: OCTOPUS_COMPANY_ID,
        plan_type: "one_time",
        currency: "usd",
        initial_price: total,
      },
      metadata: {
        type: "octopus_fund_wallet",
        funding_id: fundingId,
        octopus_user_id: user.id,
        base_amount: base,
        fee_amount: fee,
      },
    } as any);

    const planId = cfg?.plan?.id || cfg?.plan_id || null;
    if (!planId) {
      console.error("[FundWallet] respuesta sin plan id:", JSON.stringify(cfg)?.slice(0, 300));
      return NextResponse.json({ error: "No se pudo crear el checkout" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, planId, sessionId: cfg?.id || null, fundingId, base, fee, feePct, total });
  } catch (e: any) {
    console.error("[FundWallet] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo crear el checkout" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (_blocked) return _blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!SUPABASE_SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

    const fundingId = request.nextUrl.searchParams.get("fundingId") || "";
    if (!fundingId) return NextResponse.json({ error: "Falta fundingId" }, { status: 400 });

    // buscar el pago en Whop (fuente de verdad: la API, no el cliente)
    let match: any = null;
    try {
      const payments: any = await whopClient.payments.list({ company_id: OCTOPUS_COMPANY_ID } as any);
      const items: any[] = payments?.data || payments?.items || [];
      match = items.find(
        (p) => p?.metadata?.funding_id === fundingId && p?.metadata?.octopus_user_id === user.id
      );
    } catch (e) {
      console.error("[FundWallet] payments.list:", e);
    }

    if (!match) return NextResponse.json({ ok: true, paid: false });

    const status = String(match.status || "").toLowerCase();
    const paid = ["succeeded", "paid", "completed", "successful"].includes(status);
    if (!paid) return NextResponse.json({ ok: true, paid: false, status });

    // montos desde la METADATA que escribió el servidor al crear el checkout (no del cliente)
    const base = Math.round(Number(match.metadata?.base_amount) * 100) / 100;
    const fee = Math.round(Number(match.metadata?.fee_amount || 0) * 100) / 100;
    if (!Number.isFinite(base) || base <= 0) {
      return NextResponse.json({ error: "Pago sin monto válido" }, { status: 500 });
    }

    // acreditar idempotente (el RPC ignora pagos ya aplicados)
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_apply_topup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        p_user: user.id,
        p_whop_payment_id: String(match.id),
        p_base: base,
        p_fee: fee,
        p_total: Math.round((base + fee) * 100) / 100,
      }),
    });
    const rpc = await rpcRes.json().catch(() => null);
    if (!rpcRes.ok || !rpc?.ok) {
      return NextResponse.json({ error: "No se pudo acreditar (¿corriste PAGOS_SETUP_2026-07-08.sql?)" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, paid: true, credited: !rpc.already, amount: base });
  } catch (e: any) {
    console.error("[FundWallet] verify error:", e?.message || e);
    return NextResponse.json({ error: "Error verificando el pago" }, { status: 500 });
  }
}
