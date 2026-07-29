import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

/**
 * GET /api/whop/wallet-token
 *
 * Token para el DEPÓSITO embebido (WalletSession + DepositElement), apuntado a
 * la cuenta de Whop DE LA EMPRESA.
 *
 * POR QUÉ EXISTE
 * Whop tiene dos "bolsas" distintas de medios de pago, con el mismo formato de
 * id: la del MIEMBRO (una persona guarda su tarjeta para pagarle a una empresa)
 * y la de la EMPRESA (la empresa guarda una tarjeta para recargar su propio
 * saldo). Solo la segunda sirve para depositar sin comisión, y nuestro
 * formulario de "guardar tarjeta" creaba la primera. De ahí el
 * 404 "This PaymentToken was not found".
 *
 * El widget de depósito de Whop crea la bolsa correcta, porque adentro de él la
 * EMPRESA es la que está comprando. La documentación del propio paquete dice
 * cómo autenticarlo: "For v1, mint this token from your backend with the
 * existing whop.accessTokens.create({ company_id }) call — the same approach
 * used by PayoutsSession."
 *
 * Es el mismo patrón que ya usamos para los retiros del creador
 * (/api/whop/payout-token), pero del lado del que paga.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // SALVAGUARDA: whopAccountForMoney nunca devuelve la cuenta de Octapi. Si
    // devolviera la nuestra, estaríamos dejando que una empresa recargue —y
    // después mueva— saldo de la plataforma.
    const companyId = await whopAccountForMoney({ id: user.id, email: user.email });
    if (!companyId) {
      console.error("[WalletToken] sin cuenta de pagos para", user.id);
      return NextResponse.json({ error: "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    // Sin scoped_actions: el token hereda los permisos de la llave sobre esta
    // cuenta. Pasar una lista con nombres inválidos hace que Whop devuelva
    // error y el widget quede en blanco (ya nos pasó con el de retiros).
    const res: any = await (whopClient as any).accessTokens.create({ company_id: companyId });
    const token = res?.token || res?.access_token || null;
    if (!token) {
      console.error("[WalletToken] respuesta sin token:", JSON.stringify(res)?.slice(0, 200));
      return NextResponse.json({ error: "No se pudo crear el token de depósito" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, token, companyId });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[WalletToken] error:", msg);
    return NextResponse.json({ error: `No se pudo crear el token de depósito: ${msg}` }, { status: 500 });
  }
}
