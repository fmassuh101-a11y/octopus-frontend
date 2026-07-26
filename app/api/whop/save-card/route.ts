import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { listarTarjetas } from "@/lib/whopCards";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octapiapp.com";

/**
 * POST /api/whop/save-card — abre un checkout en modo "setup" para que la
 * empresa guarde su tarjeta SIN que se le cobre nada.
 *
 * POR QUÉ EXISTE
 * Depositar por checkout normal cuesta 2,7% + $0,30 de procesamiento. La API
 * de Topup no cobra nada ("Top-ups have no fees or taxes"), pero necesita un
 * payment_method_id: una tarjeta ya guardada. Y esa tarjeta no se puede
 * guardar por API — solo capturándola en un checkout embebido (PCI).
 *
 * Entonces: una vez se guarda la tarjeta acá (gratis), y de ahí en adelante
 * todos los depósitos van por Topup sin comisión.
 *
 * El payment_method_id llega después por webhook (setup_intent.succeeded),
 * no en esta respuesta — ver app/api/whop/webhooks/route.ts.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  try {
    const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=email`, { headers: H });
    const profile = (profRes.ok ? await profRes.json() : [])[0];

    // La tarjeta se guarda en la cuenta de Whop DE LA EMPRESA, no en la nuestra.
    const companyId = await whopAccountForMoney({ id: user.id, email: profile?.email || user.email });
    if (!companyId) {
      return NextResponse.json({ error: "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    const cfg: any = await whopClient.checkoutConfigurations.create({
      company_id: companyId,
      mode: "setup",
      currency: "usd",
      redirect_url: `${APP_URL}/company/fondear?card=saved`,
      // el webhook usa esto para saber a qué usuario pertenece la tarjeta
      metadata: { octopus_user_id: user.id, type: "octopus_save_card" },
    } as any);

    if (!cfg?.id) {
      console.error("[SaveCard] respuesta sin id:", JSON.stringify(cfg)?.slice(0, 300));
      return NextResponse.json({ error: "No se pudo abrir el formulario de tarjeta" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sessionId: cfg.id, companyId });
  } catch (e: any) {
    console.error("[SaveCard] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo abrir el formulario de tarjeta" }, { status: 500 });
  }
}

/**
 * GET /api/whop/save-card — ¿esta empresa ya tiene tarjeta guardada?
 *
 * Se le pregunta a Whop, que es quien las guarda. Antes esta ruta se tragaba el
 * error de la consulta y devolvía "no hay tarjeta", que es una respuesta
 * distinta y mucho peor: la empresa veía "no la vemos confirmada" con la
 * tarjeta perfectamente guardada del otro lado. Ahora, si la consulta falla,
 * se dice que falló.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=email,whop_payment_method_id`,
      { headers: H }
    );
    const profile = (profRes.ok ? await profRes.json() : [])[0] || {};

    const companyId = await whopAccountForMoney({ id: user.id, email: profile.email || user.email });
    if (!companyId) {
      return NextResponse.json({ ok: true, hasCard: false, paymentMethodId: null, problema: null });
    }

    const { cards, problema, via } = await listarTarjetas(companyId);

    // La elegida antes, si sigue existiendo; si no, la más nueva.
    const guardada = profile.whop_payment_method_id || null;
    const elegida = cards.some((c) => c.id === guardada) ? guardada : cards[0]?.id || null;

    if (elegida && elegida !== guardada) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ whop_payment_method_id: elegida }),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      hasCard: !!elegida,
      paymentMethodId: elegida,
      cards,
      problema, // null salvo que la consulta a Whop haya fallado de verdad
      via,
    });
  } catch (e: any) {
    console.error("[SaveCard][GET] error:", e?.message || e);
    return NextResponse.json(
      { ok: true, hasCard: false, paymentMethodId: null, problema: "no pudimos consultar a Whop" },
      { status: 200 }
    );
  }
}
