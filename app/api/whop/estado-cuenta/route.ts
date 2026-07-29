import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { listarTarjetasDeEmpresa } from "@/lib/whopCards";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

/**
 * GET /api/whop/estado-cuenta — en qué paso va la empresa.
 *
 * POR QUÉ EXISTE
 * Depositar sin comisión no es un botón: es una secuencia, y hay que saber en
 * qué punto va cada empresa para pedirle lo que corresponde y nada más.
 *
 *   1. verificar  → Whop exige identidad antes de dejar operar la cuenta.
 *   2. tarjeta    → guardar una tarjeta A NOMBRE DE LA EMPRESA (única que el
 *                   depósito directo acepta cobrar).
 *   3. listo      → de acá en adelante los depósitos son sin comisión.
 *
 * Antes se mandaba a la empresa a guardar la tarjeta sin fijarse en el paso 1,
 * y Whop la desviaba a su pantalla de verificación en medio del camino. Las
 * instrucciones dejaban de calzar y la persona quedaba perdida.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 40 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const companyId = await whopAccountForMoney({ id: user.id, email: user.email });
    if (!companyId) {
      return NextResponse.json({ ok: true, paso: "verificar", verificada: false, tieneTarjeta: false });
    }

    // Estado de la cuenta según Whop.
    let verificada = false;
    let enRevision = false;
    let estadoPagos: string | null = null;
    let estadoVerificacion: string | null = null;
    try {
      const ledger: any = await (whopClient as any).ledgerAccounts.retrieve(companyId);
      estadoPagos = ledger?.payments_approval_status ?? null;
      estadoVerificacion = ledger?.payout_account_details?.latest_verification?.status ?? null;

      // APROBADA de verdad. Solo estos estados cuentan.
      verificada =
        estadoPagos === "approved" ||
        estadoPagos === "monitoring" ||
        ["verified", "approved"].includes(String(estadoVerificacion));

      // EN REVISIÓN — enviada pero todavía sin respuesta de Whop.
      //
      // Esto faltaba y causó un error feo: la empresa terminaba el formulario,
      // Whop devolvía con status=submitted, y como no estaba "aprobada" pero
      // tampoco se distinguía "en revisión", la pantalla la mandaba al paso
      // siguiente como si ya estuviera lista. Pedirle guardar la tarjeta antes
      // de que Whop apruebe no lleva a ninguna parte.
      enRevision =
        !verificada &&
        (["pending", "processing"].includes(String(estadoPagos)) ||
          ["processing", "submitted", "review", "started", "created"].includes(String(estadoVerificacion)));
    } catch (e: any) {
      console.error("[EstadoCuenta] no se pudo leer el ledger:", e?.message?.slice(0, 150));
    }

    const { cards } = await listarTarjetasDeEmpresa(companyId);
    const tieneTarjeta = cards.length > 0;

    const paso = enRevision && !verificada
      ? "revisando"
      : !verificada
        ? "verificar"
        : !tieneTarjeta
          ? "tarjeta"
          : "listo";

    return NextResponse.json({
      ok: true,
      companyId,
      paso,
      verificada,
      enRevision,
      tieneTarjeta,
      tarjetas: cards,
      estadoPagos,
      estadoVerificacion,
    });
  } catch (e: any) {
    console.error("[EstadoCuenta] error:", e?.message || e);
    return NextResponse.json({ error: "No pudimos leer el estado de tu cuenta" }, { status: 500 });
  }
}
