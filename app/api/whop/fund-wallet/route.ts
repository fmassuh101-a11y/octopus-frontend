import { NextRequest, NextResponse } from "next/server";
import { whopClient, WHOP_ENVIRONMENT } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { listarTarjetas } from "@/lib/whopCards";
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

    // La empresa ELIGE cómo pagar — no se le impone:
    //   "saved"    → cobra la tarjeta ya guardada (Topup, sin comisión)
    //   "checkout" → abre el checkout de Whop (tarjeta nueva, PayPal, y los
    //                demás medios que Whop tenga habilitados). Cobra comisión
    //                de procesamiento, pero no depende de nada previo.
    //   sin elegir → intenta la guardada y si no hay, abre el checkout.
    const method = String(body?.method || "auto");

    const fundingId = `fund_${user.id.slice(0, 8)}_${Date.now()}`;

    // La plata entra a la cuenta de Whop DE LA EMPRESA, no a la de Octapi.
    // Si es su primera vez, la cuenta se crea acá mismo sin que se entere.
    // (Antes esto apuntaba a OCTOPUS_COMPANY_ID: los fondos de terceros
    // quedaban en nuestra cuenta, que es justo lo que no podemos hacer.)
    const payerCompanyId = await whopAccountForMoney({ id: user.id, email: user.email });
    if (!payerCompanyId) {
      console.error("[FundWallet] sin cuenta de pagos para", user.id);
      return NextResponse.json({ error: "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    // ── TARJETA GUARDADA: TOPUP (sin comisión) ──────────────────────────
    // Whop no cobra por Topup ("Top-ups have no fees or taxes"), pero necesita
    // una tarjeta ya guardada. El checkout de más abajo cuesta 2,7% + $0,30 y
    // a cambio acepta tarjeta nueva, PayPal y lo demás que Whop ofrezca.
    //
    // Cuál tarjeta: la empresa puede tener varias guardadas y mandar cuál
    // quiere usar. Ese id NO se acepta a ciegas — se verifica contra la lista
    // real de su cuenta en Whop, para que nadie pueda hacernos cobrar a un
    // medio de pago ajeno mandando un id inventado.
    const pedida = String(body?.paymentMethodId || "").trim();

    let savedCard: string | null = null;
    if (pedida) {
      const { cards } = await listarTarjetas(payerCompanyId);
      if (!cards.some((c) => c.id === pedida)) {
        return NextResponse.json({ error: "Esa tarjeta no está en tu cuenta" }, { status: 400 });
      }
      savedCard = pedida;
    } else {
      const pmRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=whop_payment_method_id`,
        { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }
      );
      savedCard = ((pmRes.ok ? await pmRes.json() : [])[0] || {}).whop_payment_method_id || null;

      // Nuestra base puede no haberse enterado todavía (el webhook es un atajo,
      // no una garantía). Antes de rendirse, se le pregunta a Whop.
      if (!savedCard && (method === "saved" || method === "auto")) {
        const { cards } = await listarTarjetas(payerCompanyId);
        savedCard = cards[0]?.id || null;
      }
    }

    if (method === "saved" && !savedCard) {
      return NextResponse.json(
        { error: "No tienes una tarjeta guardada todavía", needsCard: true },
        { status: 400 }
      );
    }

    if (savedCard && (method === "saved" || method === "auto")) {
      try {
        const topup: any = await whopClient.topups.create({
          amount: base,
          company_id: payerCompanyId,
          currency: "usd",
          payment_method_id: savedCard,
        } as any);
        const paid = ["succeeded", "paid", "completed", "successful"].includes(
          String(topup?.status || "").toLowerCase()
        );
        if (paid) {
          return NextResponse.json({
            ok: true,
            method: "topup",
            paid: true,
            base,
            fee: 0,
            total: base,
            topupId: topup?.id || null,
            depositsTo: payerCompanyId,
            environment: WHOP_ENVIRONMENT,
          });
        }
        console.error("[FundWallet] topup no quedó pagado:", topup?.status, topup?.failure_message);
        // si el topup no salió, cae al checkout de abajo en vez de dejar al usuario trabado
      } catch (e: any) {
        console.error("[FundWallet] topup falló, se usa checkout:", e?.message?.slice(0, 200));
      }
    }

    // ── RESPALDO: CHECKOUT ──────────────────────────────────────────────
    // Cobra comisión de procesamiento, pero funciona sin tarjeta guardada.
    const cfg: any = await whopClient.checkoutConfigurations.create({
      plan: {
        company_id: payerCompanyId,
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

    // `depositsTo` es a qué cuenta de Whop va a caer la plata. Se devuelve a
    // propósito para poder confirmar de un vistazo que NO es la de Octapi.
    // `hasSavedCard` le dice a la interfaz si puede ofrecer también el pago
    // sin comisión con la tarjeta guardada, o si solo cabe el checkout.
    return NextResponse.json({ ok: true, method: "checkout", planId, sessionId: cfg?.id || null, fundingId, base, fee: 0, total: base, environment: WHOP_ENVIRONMENT, depositsTo: payerCompanyId, hasSavedCard: !!savedCard });
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
    const pre = preRows[0] || null;
    // si no hay pre-ficha (checkout creado con una versión anterior), más abajo usamos
    // la metadata del pago — que también la escribió NUESTRO servidor al crear el checkout.
    let base = pre ? Math.round(Number(pre.base_amount) * 100) / 100 : 0;
    let expectedTotal = pre ? Math.round(Number(pre.total_paid) * 100) / 100 : 0;

    // 2) confirmar el pago contra Whop (forma real verificada: status "paid", total en dólares,
    //    metadata propagada del checkout con funding_id/base_amount/octopus_user_id)
    const isPaid = (p: any) => ["succeeded", "paid", "completed", "successful"].includes(String(p?.status || "").toLowerCase());
    const metaOf = (p: any) => p?.metadata || p?.checkout_configuration?.metadata || p?.plan?.metadata || {};
    const amountMatches = (p: any, expected: number) => {
      const cands = [p?.total, p?.usd_total, p?.subtotal, p?.final_amount, p?.amount]
        .map((v: any) => Number(v))
        .filter((v: number) => Number.isFinite(v) && v > 0);
      return cands.some((v: number) => Math.abs(v - expected) < 0.011 || Math.abs(v / 100 - expected) < 0.011);
    };

    let payment: any = null;
    // CLAVE anti-falso-positivo: el pago SIEMPRE debe pertenecer a ESTE depósito.
    // Su metadata.funding_id tiene que ser EXACTAMENTE el de esta transacción — así
    // un pago viejo (aunque sea del mismo usuario y monto) nunca cuenta como éste.
    const belongsHere = (p: any) => metaOf(p)?.funding_id === fundingId;

    // 2a) camino directo: el receipt id que entrega el checkout embebido al completar
    if (receiptId) {
      try {
        const p: any = await (whopClient as any).payments.retrieve(receiptId);
        if (p && isPaid(p) && belongsHere(p)) payment = p;
      } catch (e) {
        console.error("[FundWallet] payments.retrieve:", e);
      }
    }

    // 2b) respaldo: buscar en la lista SOLO por funding_id de esta transacción.
    // Se busca en la cuenta de Whop DE LA EMPRESA — ahí es donde entra su plata
    // ahora. (Antes se listaba sobre OCTOPUS_COMPANY_ID porque los depósitos
    // caían en la cuenta de Octapi.)
    if (!payment) {
      try {
        const payerCompanyId = ((await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=whop_company_id`,
          { headers: H }
        ).then((r) => (r.ok ? r.json() : [])).catch(() => []))[0] || {}).whop_company_id;
        if (!payerCompanyId) throw new Error("la empresa aún no tiene cuenta de pagos");
        const payments: any = await whopClient.payments.list({ company_id: payerCompanyId } as any);
        const items: any[] = payments?.data || payments?.items || (Array.isArray(payments) ? payments : []);
        payment = items.find((p) => isPaid(p) && belongsHere(p)) || null;
      } catch (e) {
        console.error("[FundWallet] payments.list:", e);
      }
    }

    if (!payment) return NextResponse.json({ ok: true, paid: false });

    // seguridad de identidad y monto:
    const pMeta = metaOf(payment);
    if (pMeta?.octopus_user_id && pMeta.octopus_user_id !== user.id) {
      return NextResponse.json({ error: "Este pago no es tuyo" }, { status: 403 });
    }
    if (!pre) {
      // sin pre-ficha: montos desde la metadata que escribió NUESTRO servidor al crear el checkout
      const mBase = Math.round(Number(pMeta?.base_amount) * 100) / 100;
      if (!Number.isFinite(mBase) || mBase <= 0 || pMeta?.octopus_user_id !== user.id) {
        return NextResponse.json({ error: "Depósito no verificable" }, { status: 400 });
      }
      base = mBase;
      expectedTotal = mBase;
    }
    if (!amountMatches(payment, expectedTotal)) {
      return NextResponse.json({ error: "El monto del pago no coincide" }, { status: 400 });
    }

    // 3) asegurar que el wallet exista (la tabla exige user_type; la RPC no lo setea)
    try {
      const ptRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, { headers: H });
      const userType = ((ptRes.ok ? await ptRes.json() : [])[0]?.user_type) || "company";
      await fetch(`${SUPABASE_URL}/rest/v1/wallets?on_conflict=user_id`, {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: user.id, user_type: userType, balance: 0 }),
      });
    } catch (e) {
      console.error("[FundWallet] ensure wallet:", e);
    }

    // 4) acreditar idempotente con el ID REAL del pago
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
