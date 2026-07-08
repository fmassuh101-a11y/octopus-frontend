import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, WHOP_ENVIRONMENT } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Depósito de la empresa (Agregar fondos).
 *
 * POST { amount } →
 *   1. Crea el checkout en Whop por EXACTAMENTE ese monto (depósito limpio, sin fees en la UI).
 *   2. Guarda una PRE-FICHA en wallet_topups (whop_payment_id = fundingId) con el monto,
 *      escrita por el SERVIDOR — la verificación nunca confía en montos del cliente ni de metadata.
 *
 * GET ?fundingId=&receiptId=&planId= →
 *   1. Lee la pre-ficha (monto autoritativo, debe ser del usuario).
 *   2. Confirma contra Whop que el pago existe y está pagado:
 *      a. por receiptId (payments.retrieve) — lo entrega el onComplete del checkout embebido
 *      b. o buscando en payments.list por metadata/plan.
 *      Además exige que el MONTO del pago coincida con la pre-ficha (nadie acredita $1000 pagando $1).
 *   3. Acredita idempotente (RPC oct_apply_topup con el payment id real — un pago acredita UNA vez).
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (_blocked) return _blocked;
  const limited = rateLimit(request, { limit: 10, name: "fund-wallet" });
  if (limited) return limited;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!SUPABASE_SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const base = Math.round(Number(body?.amount) * 100) / 100;
    if (!Number.isFinite(base) || base < 1 || base > 50000) {
      return NextResponse.json({ error: "Monto inválido (mínimo $1)" }, { status: 400 });
    }

    const fundingId = `fund_${user.id.slice(0, 8)}_${Date.now()}`;

    const cfg: any = await whopClient.checkoutConfigurations.create({
      plan: {
        company_id: OCTOPUS_COMPANY_ID,
        plan_type: "one_time",
        currency: "usd",
        initial_price: base,
      },
      metadata: {
        type: "octopus_fund_wallet",
        funding_id: fundingId,
        octopus_user_id: user.id,
        base_amount: base,
      },
    } as any);

    const planId = cfg?.plan?.id || cfg?.plan_id || null;
    if (!planId) {
      console.error("[FundWallet] respuesta sin plan id:", JSON.stringify(cfg)?.slice(0, 300));
      return NextResponse.json({ error: "No se pudo crear el checkout" }, { status: 502 });
    }

    // PRE-FICHA server-side con el monto autoritativo (id = fundingId; nunca se acredita esta fila)
    const pre = await fetch(`${SUPABASE_URL}/rest/v1/wallet_topups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ user_id: user.id, whop_payment_id: fundingId, base_amount: base, fee_amount: 0, total_paid: base }),
    });
    if (!pre.ok) {
      const t = await pre.text();
      console.error("[FundWallet] no se pudo guardar la pre-ficha:", pre.status, t);
      return NextResponse.json({ error: "No se pudo iniciar el depósito (¿corriste PAGOS_SETUP_2026-07-08.sql?)" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, planId, sessionId: cfg?.id || null, fundingId, base, fee: 0, total: base, environment: WHOP_ENVIRONMENT });
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

    const q = request.nextUrl.searchParams;
    const fundingId = q.get("fundingId") || "";
    const receiptId = q.get("receiptId") || "";
    const planId = q.get("planId") || "";
    if (!fundingId) return NextResponse.json({ error: "Falta fundingId" }, { status: 400 });

    // 1) pre-ficha del servidor: monto autoritativo, debe pertenecer a este usuario
    const H = { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY };
    const preRes = await fetch(
      `${SUPABASE_URL}/rest/v1/wallet_topups?whop_payment_id=eq.${encodeURIComponent(fundingId)}&user_id=eq.${user.id}&select=base_amount,total_paid`,
      { headers: H }
    );
    const preRows = preRes.ok ? await preRes.json() : [];
    const pre = preRows[0];
    if (!pre) return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
    const base = Math.round(Number(pre.base_amount) * 100) / 100;
    const expectedTotal = Math.round(Number(pre.total_paid) * 100) / 100;

    // 2) confirmar el pago contra Whop
    const amountMatches = (p: any) => {
      const cands = [p?.total, p?.final_amount, p?.subtotal, p?.amount, p?.usd_amount]
        .map((v: any) => Number(v))
        .filter((v: number) => Number.isFinite(v) && v > 0);
      // acepta dólares o centavos
      return cands.some((v: number) => Math.abs(v - expectedTotal) < 0.011 || Math.abs(v / 100 - expectedTotal) < 0.011);
    };
    const isPaid = (p: any) => ["succeeded", "paid", "completed", "successful"].includes(String(p?.status || "").toLowerCase());
    const metaOf = (p: any) => p?.metadata || p?.checkout_configuration?.metadata || p?.plan?.metadata || {};

    let payment: any = null;

    // 2a) camino directo: el receipt id que entrega el checkout embebido al completar
    if (receiptId) {
      try {
        const p: any = await (whopClient as any).payments.retrieve(receiptId);
        if (p && isPaid(p) && amountMatches(p)) payment = p;
      } catch (e) {
        console.error("[FundWallet] payments.retrieve:", e);
      }
    }

    // 2b) respaldo: buscar en la lista por metadata o plan
    if (!payment) {
      try {
        const payments: any = await whopClient.payments.list({ company_id: OCTOPUS_COMPANY_ID } as any);
        const items: any[] = payments?.data || payments?.items || (Array.isArray(payments) ? payments : []);
        payment = items.find((p) => {
          if (!isPaid(p) || !amountMatches(p)) return false;
          const m = metaOf(p);
          if (m?.funding_id === fundingId) return true;
          if (planId && (p?.plan_id === planId || p?.plan?.id === planId)) return true;
          return false;
        }) || null;
      } catch (e) {
        console.error("[FundWallet] payments.list:", e);
      }
    }

    if (!payment) return NextResponse.json({ ok: true, paid: false });

    // 3) acreditar idempotente con el ID REAL del pago
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_apply_topup`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_user: user.id,
        p_whop_payment_id: String(payment.id),
        p_base: base,
        p_fee: 0,
        p_total: expectedTotal,
      }),
    });
    const rpc = await rpcRes.json().catch(() => null);
    if (!rpcRes.ok || !rpc?.ok) {
      console.error("[FundWallet] rpc:", rpcRes.status, JSON.stringify(rpc));
      return NextResponse.json({ error: "No se pudo acreditar el depósito" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, paid: true, credited: !rpc.already, amount: base });
  } catch (e: any) {
    console.error("[FundWallet] verify error:", e?.message || e);
    return NextResponse.json({ error: "Error verificando el pago" }, { status: 500 });
  }
}
