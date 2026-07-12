import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, WHOP_ENVIRONMENT } from "@/lib/whop";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Suscripciones RECURRENTES (Whop cobra solo cada período).
// Creador Pro: precios fijos. Empresa: precio calculado EN EL SERVER según
// plan (pro/scale) + período (anual -30% / semestral -15% / mensual) + descuento
// personal del perfil — nunca se confía en un precio del cliente.
const CREATOR_TIERS: Record<string, { price: number; period: number; label: string; trial?: number }> = {
  pro_monthly: { price: 9.99, period: 30, label: "Octopus Pro (mensual)", trial: 3 },
  pro_annual: { price: 99, period: 365, label: "Octopus Pro (anual)", trial: 3 },
};
const COMPANY_MONTHLY: Record<string, number> = { pro: 99, scale: 499 };
const PERIODS: Record<string, { months: number; off: number; label: string }> = {
  mensual: { months: 1, off: 0, label: "mensual" },
  semestral: { months: 6, off: 0.15, label: "semestral" },
  anual: { months: 12, off: 0.30, label: "anual" },
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

    let tier: { price: number; period: number; label: string; trial?: number } | null = null;
    if (CREATOR_TIERS[tierKey]) {
      tier = CREATOR_TIERS[tierKey];
    } else if (tierKey.startsWith("company_")) {
      const planKey = tierKey.replace("company_", ""); // pro | scale
      const monthly = COMPANY_MONTHLY[planKey];
      const per = PERIODS[String(body?.period || "mensual")];
      if (monthly && per) {
        // descuento personal regalado por el admin (profiles.discount_percent)
        let personal = 0;
        try {
          const apiKey = SUPABASE_SERVICE_KEY || "";
          const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=discount_percent`, {
            headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey },
          });
          if (r.ok) personal = Number(((await r.json())[0])?.discount_percent) || 0;
        } catch {}
        const monthlyEff = Math.round(monthly * (1 - per.off) * (1 - Math.min(90, Math.max(0, personal)) / 100));
        tier = {
          price: monthlyEff * per.months,
          period: per.months * 30,
          label: `Plan ${planKey === "pro" ? "Pro" : "Scale"} empresa (${per.label})`,
          trial: planKey === "pro" ? 3 : 0, // el plan Pro empresa tiene 3 días gratis
        };
      }
    }
    if (!tier || tier.price <= 0) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const subId = `sub_${user.id.slice(0, 8)}_${Date.now()}`;
    const cfg: any = await whopClient.checkoutConfigurations.create({
      plan: {
        company_id: OCTOPUS_COMPANY_ID,
        plan_type: "renewal",
        billing_period: tier.period,
        currency: "usd",
        // NADA hoy: initial_price 0 (si no, Whop lo SUMA al renewal y cobra doble).
        // Solo se cobra el renewal_price cada período, y tras la prueba gratis si hay.
        initial_price: 0,
        renewal_price: tier.price,
        ...(tier.trial ? { trial_period_days: tier.trial } : {}),
        title: tier.label,
        // Whop exige un producto para planes recurrentes — uno fijo por tier
        product: {
          external_identifier: `octopus_${tierKey}`,
          title: tier.label,
        },
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
      price: tier.price, label: tier.label, trialDays: tier.trial || 0, environment: WHOP_ENVIRONMENT,
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

    // durante la PRUEBA GRATIS no hay cobro todavía: buscamos una MEMBRESÍA
    // (trialing/active) de esta suscripción para activar el plan igual.
    let membershipMeta: any = null;
    if (!payment) {
      try {
        const mem: any = await (whopClient as any).memberships.list({ company_id: OCTOPUS_COMPANY_ID });
        const items: any[] = mem?.data || [];
        const m = items.find((x) => x?.metadata?.sub_id === subId && ['trialing', 'active', 'completed'].includes(String(x?.status)));
        if (m) membershipMeta = m.metadata;
      } catch (e) { console.error('[Subscribe] memberships:', e); }
    }

    if (!payment && !membershipMeta) return NextResponse.json({ ok: true, paid: false });

    const meta = payment?.metadata || membershipMeta || {};
    // seguridad: la suscripción debe ser de este usuario y de un tier conocido
    if (meta?.octopus_user_id !== user.id) {
      return NextResponse.json({ error: "Esta suscripción no es tuya" }, { status: 403 });
    }
    const paidTier = String(meta?.tier || "");
    let apply: Record<string, any> | null = null;
    if (CREATOR_TIERS[paidTier]) apply = { is_pro: true };
    else if (paidTier === "company_pro") apply = { plan: "pro", plan_source: "whop" };
    else if (paidTier === "company_scale") apply = { plan: "scale", plan_source: "whop" };
    if (!apply) return NextResponse.json({ error: "Plan desconocido" }, { status: 400 });

    // activar el plan en el perfil
    const up = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify(apply),
    });
    if (!up.ok) {
      const t = await up.text();
      console.error("[Subscribe] activar plan:", up.status, t);
      // company_plan puede no existir como columna todavía
      return NextResponse.json({ error: "Pago recibido pero no se pudo activar el plan (avisá al admin)" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, paid: true, tier: paidTier });
  } catch (e: any) {
    console.error("[Subscribe] verify:", e?.message || e);
    return NextResponse.json({ error: "Error verificando la suscripción" }, { status: 500 });
  }
}
