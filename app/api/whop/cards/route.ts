import { NextRequest, NextResponse } from "next/server";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { listarTarjetas } from "@/lib/whopCards";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function cuentaDePagos(userId: string, correo?: string | null) {
  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=email,whop_payment_method_id`,
    { headers: H }
  );
  const perfil = (res.ok ? await res.json() : [])[0] || {};
  const companyId = await whopAccountForMoney({ id: userId, email: perfil.email || correo });
  return { companyId, elegida: perfil.whop_payment_method_id || null, H };
}

/**
 * GET /api/whop/cards — los medios de pago que la empresa tiene guardados.
 *
 * Se le pregunta a Whop en cada carga en vez de leer nuestra base: la base solo
 * recuerda CUÁL eligió la empresa, no cuáles existen. Si Whop es la que las
 * guarda, Whop es la que sabe.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 40 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  try {
    const { companyId, elegida, H } = await cuentaDePagos(user.id, user.email);
    if (!companyId) {
      return NextResponse.json({ ok: true, cards: [], elegida: null, problema: null });
    }

    const { cards, problema, via } = await listarTarjetas(companyId);

    // Si la elegida ya no existe (venció, la borraron en Whop), no la dejamos
    // apuntando al vacío: se cae a la más nueva, que es la que acaba de guardar.
    let seleccion = elegida;
    if (!cards.some((c) => c.id === seleccion)) seleccion = cards[0]?.id || null;

    // Guardar la selección corregida para que el cobro use la misma que ve en pantalla.
    if (seleccion !== elegida) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ whop_payment_method_id: seleccion }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, companyId, cards, elegida: seleccion, problema, via });
  } catch (e: any) {
    console.error("[Cards][GET] error:", e?.message || e);
    return NextResponse.json({ error: "No pudimos leer tus medios de pago" }, { status: 500 });
  }
}

/**
 * PUT /api/whop/cards — la empresa elige con cuál de sus tarjetas quiere pagar.
 * Solo acepta un id que exista de verdad en su cuenta de Whop, para que nadie
 * pueda hacernos cobrar a un medio de pago ajeno mandando un id inventado.
 */
export async function PUT(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  try {
    const body = await request.json().catch(() => ({}));
    const pedido = String(body?.paymentMethodId || "").trim();
    if (!pedido) return NextResponse.json({ error: "Falta la tarjeta" }, { status: 400 });

    const { companyId, H } = await cuentaDePagos(user.id, user.email);
    if (!companyId) return NextResponse.json({ error: "No tienes cuenta de pagos" }, { status: 400 });

    const { cards } = await listarTarjetas(companyId);
    if (!cards.some((c) => c.id === pedido)) {
      return NextResponse.json({ error: "Esa tarjeta no está en tu cuenta" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ whop_payment_method_id: pedido }),
    });
    if (!res.ok) return NextResponse.json({ error: "No se pudo guardar tu elección" }, { status: 502 });

    return NextResponse.json({ ok: true, elegida: pedido });
  } catch (e: any) {
    console.error("[Cards][PUT] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo guardar tu elección" }, { status: 500 });
  }
}
