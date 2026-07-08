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

  // ?credit=1 → reintenta acreditar el último pago 'paid' de fondeo y devuelve el error CRUDO de la DB
  if (request.nextUrl.searchParams.get("credit") === "1") {
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const { SUPABASE_URL } = await import("@/lib/config/supabase");
    try {
      const payments: any = await whopClient.payments.list({ company_id: OCTOPUS_COMPANY_ID } as any);
      const items: any[] = payments?.data || [];
      const p = items.find((x) => x?.status === "paid" && x?.metadata?.type === "octopus_fund_wallet");
      if (!p) { out.credit = "no hay pagos de fondeo"; return NextResponse.json(out); }
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
