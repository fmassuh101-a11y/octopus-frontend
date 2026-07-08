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
  return NextResponse.json(out);
}
