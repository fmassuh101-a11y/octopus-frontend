import { NextRequest, NextResponse } from "next/server";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { listarTarjetasDeEmpresa } from "@/lib/whopCards";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const WHOP_PANEL = "https://whop.com/dashboard";

/**
 * GET /api/whop/company-cards
 *
 * ¿Esta empresa puede depositar SIN COMISIÓN?
 *
 * Solo puede si tiene una tarjeta guardada a nombre de la empresa, porque es
 * la única que el depósito directo (topup) acepta cobrar. Las tarjetas que
 * guardó una persona desde un formulario nuestro NO sirven para esto, aunque
 * se vean iguales.
 *
 * Como Whop no expone forma de crear esa tarjeta por API, acá también se
 * devuelve el enlace exacto al panel de esa cuenta, que es donde se guarda.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 40 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const companyId = await whopAccountForMoney({ id: user.id, email: user.email });
    if (!companyId) {
      return NextResponse.json({ ok: true, cards: [], puedeGratis: false, enlacePanel: null });
    }

    const { cards, problema } = await listarTarjetasDeEmpresa(companyId);

    return NextResponse.json({
      ok: true,
      companyId,
      cards,
      puedeGratis: cards.length > 0,
      // A dónde tiene que ir la empresa para guardar su tarjeta. Es el único
      // camino que existe hoy; mandarla sin el enlace exacto sería mandarla a
      // buscar entre pantallas ajenas.
      enlacePanel: `${WHOP_PANEL}/${companyId}/balance`,
      problema,
    });
  } catch (e: any) {
    console.error("[CompanyCards] error:", e?.message || e);
    return NextResponse.json({ error: "No pudimos leer tus medios de pago" }, { status: 500 });
  }
}
