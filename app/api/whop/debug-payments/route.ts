import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, WHOP_ENVIRONMENT } from "@/lib/whop";

// SOLO SANDBOX: inspección temporal de pagos para calibrar la verificación del fondeo.
// Se desactiva sola en producción. Sin datos sensibles (sandbox = plata falsa).
export async function GET(request: NextRequest) {
  if (WHOP_ENVIRONMENT !== "sandbox") {
    return NextResponse.json({ error: "Solo disponible en sandbox" }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("k") !== "octo-debug-2026") {
    return NextResponse.json({ error: "No" }, { status: 403 });
  }
  const out: any = { env: WHOP_ENVIRONMENT, company: OCTOPUS_COMPANY_ID };
  try {
    const payments: any = await whopClient.payments.list({ company_id: OCTOPUS_COMPANY_ID } as any);
    out.listShapeKeys = Object.keys(payments || {});
    const items: any[] = payments?.data || payments?.items || (Array.isArray(payments) ? payments : []);
    out.count = items.length;
    out.sample = items.slice(0, 4);
  } catch (e: any) {
    out.listError = e?.message || String(e);
    out.listErrorStatus = e?.status || e?.statusCode || null;
  }
  try {
    const rid = request.nextUrl.searchParams.get("receipt");
    if (rid) out.receipt = await (whopClient as any).payments.retrieve(rid);
  } catch (e: any) {
    out.receiptError = e?.message || String(e);
  }

  // ?sub=1 → intenta crear un checkout RECURRENTE y devuelve el error crudo de Whop
  if (request.nextUrl.searchParams.get("sub") === "1") {
    try {
      const cfg: any = await whopClient.checkoutConfigurations.create({
        plan: {
          company_id: OCTOPUS_COMPANY_ID,
          plan_type: "renewal",
          billing_period: 30,
          currency: "usd",
          initial_price: 9.99,
          renewal_price: 9.99,
          title: "Debug sub test",
          product: { external_identifier: "octopus_debug_sub", title: "Debug sub test" },
        },
        metadata: { type: "debug_sub_test" },
      } as any);
      out.subTest = { ok: true, planId: cfg?.plan?.id || cfg?.plan_id || null, keys: Object.keys(cfg || {}) };
    } catch (e: any) {
      out.subTest = { ok: false, error: e?.message || String(e), status: e?.status || null, body: e?.error || e?.body || null };
    }
  }

  // ?wallets=<uuid> → estado del wallet y últimas transacciones de ese usuario (raw de la DB)
  const wUser = request.nextUrl.searchParams.get("wallets");
  if (wUser) {
    const SK = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const { SUPABASE_URL } = await import("@/lib/config/supabase");
    const H = { Authorization: `Bearer ${SK}`, apikey: SK };
    const wRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${wUser}&select=*`, { headers: H });
    out.wallet = { status: wRes.status, rows: await wRes.json().catch(() => null) };
    for (const t of ["transactions", "payments"]) {
      const tRes = await fetch(`${SUPABASE_URL}/rest/v1/${t}?or=(user_id.eq.${wUser},creator_id.eq.${wUser},to_user_id.eq.${wUser})&order=created_at.desc&limit=5&select=*`, { headers: H });
      (out as any)[t] = { status: tRes.status, rows: await tRes.text().then((x) => x.slice(0, 900)) };
    }
  }

  // ?credit=1 → reintenta acreditar el último pago 'paid' de fondeo y devuelve el error CRUDO de la DB
  if (request.nextUrl.searchParams.get("credit") === "1") {
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const { SUPABASE_URL } = await import("@/lib/config/supabase");
    try {
      const payments: any = await whopClient.payments.list({ company_id: OCTOPUS_COMPANY_ID } as any);
      const items: any[] = payments?.data || [];
      const p = items.find((x) => x?.status === "paid" && x?.metadata?.type === "octopus_fund_wallet");
      if (!p) { out.credit = "no hay pagos de fondeo"; return NextResponse.json(out); }
      // asegurar wallet con user_type (la tabla lo exige)
      const H = { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY };
      const ptRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${p.metadata.octopus_user_id}&select=user_type`, { headers: H });
      const userType = ((ptRes.ok ? await ptRes.json() : [])[0]?.user_type) || "company";
      const ensRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?on_conflict=user_id`, {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: p.metadata.octopus_user_id, user_type: userType, balance: 0 }),
      });
      out.ensureWallet = { status: ensRes.status, body: (await ensRes.text()).slice(0, 400), userType };
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_apply_topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({
          p_user: p.metadata.octopus_user_id,
          p_whop_payment_id: String(p.id),
          p_base: Number(p.metadata.base_amount),
          p_fee: 0,
          p_total: Number(p.total),
        }),
      });
      out.credit = { paymentId: p.id, user: p.metadata.octopus_user_id, base: p.metadata.base_amount, rpcStatus: rpcRes.status, rpcBody: await rpcRes.text() };
    } catch (e: any) {
      out.creditError = e?.message || String(e);
    }
  }
  return NextResponse.json(out);
}
