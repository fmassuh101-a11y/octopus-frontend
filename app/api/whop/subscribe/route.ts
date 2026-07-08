import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, WHOP_ENVIRONMENT } from "@/lib/whop";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Suscripciones RECURRENTES (Whop cobra solo cada período):
// creador Pro (mensual/anual) + planes de empresa. Al confirmarse el pago,
// se activa el flag en el perfil (is_pro / company_plan).
const TIERS: Record<string, { price: number; period: number; label: string; apply: Record<string, any> }> = {
  pro_monthly: { price: 9.99, period: 30, label: "Octopus Pro (mensual)", apply: { is_pro: true } },
  pro_annual: { price: 99, period: 365, label: "Octopus Pro (anual)", apply: { is_pro: true } },
  company_growth: { price: 49, period: 30, label: "Plan Crecimiento (empresa)", apply: { company_plan: "growth" } },
  company_pro: { price: 199, period: 30, label: "Plan Pro (empresa)", apply: { company_plan: "pro" } },
};

export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (_blocked) return _blocked;
  const limited = rateLimit(request, { limit: 10, name: "subscribe" });
  if (limited) return limited;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const tierKey = String(body?.tier || "");
    const tier = TIERS[tierKey];
    if (!tier) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const subId = `sub_${user.id.slice(0, 8)}_${Date.now()}`;
    const cfg: any = await whopClient.checkoutConfigurations.create({
      plan: {
        company_id: OCTOPUS_COMPANY_ID,
        plan_type: "renewal",
        billing_period: tier.period,
        currency: "usd",
        initial_price: tier.price,
        renewal_price: tier.price,
      },
      metadata: {
        type: "octopus_subscription",
        sub_id: subId,
        tier: tierKey,
        octopus_user_id: user.id,
      },
    } as any);

    const planId = cfg?.plan?.id || cfg?.plan_id || null;
    if (!planId) return NextResponse.json({ error: "No se pudo crear la suscripción" }, { status: 502 });

    return NextResponse.json({
      ok: true, planId, sessionId: cfg?.id || null, subId, tier: tierKey,
      price: tier.price, label: tier.label, environment: WHOP_ENVIRONMENT,
    });
  } catch (e: any) {
    console.error("[Subscribe] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo crear la suscripción" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (_blocked) return _blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!SUPABASE_SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

    const subId = request.nextUrl.searchParams.get("subId") || "";
    const receiptId = request.nextUrl.searchParams.get("receiptId") || "";
    if (!subId) return NextResponse.json({ error: "Falta subId" }, { status: 400 });

    const isPaid = (p: any) => ["succeeded", "paid", "completed"].includes(String(p?.status || "").toLowerCase());
    let payment: any = null;

    if (receiptId) {
      try {
        const p: any = await (whopClient as any).payments.retrieve(receiptId);
        if (p && isPaid(p) && p?.metadata?.sub_id === subId) payment = p;
      } catch {}
    }
    if (!payment) {
      try {
        const payments: any = await whopClient.payments.list({ company_id: OCTOPUS_COMPANY_ID } as any);
        const items: any[] = payments?.data || [];
        payment = items.find((p) => isPaid(p) && p?.metadata?.sub_id === subId) || null;
      } catch {}
    }
    if (!payment) return NextResponse.json({ ok: true, paid: false });

    // seguridad: el pago debe ser de este usuario y de un tier conocido
    if (payment.metadata?.octopus_user_id !== user.id) {
      return NextResponse.json({ error: "Esta suscripción no es tuya" }, { status: 403 });
    }
    const tier = TIERS[String(payment.metadata?.tier || "")];
    if (!tier) return NextResponse.json({ error: "Plan desconocido" }, { status: 400 });

    // activar el plan en el perfil
    const up = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify(tier.apply),
    });
    if (!up.ok) {
      const t = await up.text();
      console.error("[Subscribe] activar plan:", up.status, t);
      // company_plan puede no existir como columna todavía
      return NextResponse.json({ error: "Pago recibido pero no se pudo activar el plan (avisá al admin)" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, paid: true, tier: payment.metadata.tier, label: tier.label });
  } catch (e: any) {
    console.error("[Subscribe] verify:", e?.message || e);
    return NextResponse.json({ error: "Error verificando la suscripción" }, { status: 500 });
  }
}
