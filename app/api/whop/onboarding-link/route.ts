import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://octapiapp.com";

/**
 * GET /api/whop/onboarding-link — enlace que VINCULA a la empresa con su cuenta.
 *
 * POR QUÉ ESTO ES IMPRESCINDIBLE
 * Nosotros creamos la cuenta de cada empresa por API. Pero crear la cuenta no
 * le da acceso a nadie: si mandamos a la empresa directo al panel de esa
 * cuenta, Whop le pide iniciar sesión, ella entra con un usuario cualquiera
 * —que no tiene ninguna relación con la cuenta— y termina mirando otra cosa o
 * nada. Es exactamente lo que estaba pasando.
 *
 * Este enlace resuelve eso: Whop lo describe como la forma de que un usuario
 * "acceda a su cuenta de sub-comerciante". Al recorrerlo, la persona queda
 * ligada a SU cuenta, y de ahí en adelante el panel la reconoce.
 *
 * El enlace vence, así que se pide en el momento de usarlo y no se guarda.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    // SALVAGUARDA: esta función nunca devuelve la cuenta de Octapi. Sin ella,
    // podríamos estar dándole acceso a nuestra propia cuenta a un tercero.
    const companyId = await whopAccountForMoney({ id: user.id, email: user.email });
    if (!companyId) {
      return NextResponse.json({ error: "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    // DOS DESTINOS DISTINTOS, según para qué se pida el enlace.
    //
    // ?destino=balance → la pantalla de saldo, para guardar la tarjeta.
    //   El enlace de verificación NO sirve acá: si la identidad ya se envió,
    //   Whop lo da por cumplido y devuelve de inmediato a nuestra app sin
    //   mostrar nada. Es exactamente lo que pasaba. Para el saldo hay que ir a
    //   la dirección del panel, que funciona porque a esa altura la persona ya
    //   quedó con sesión iniciada en Whop tras la verificación.
    //
    // por defecto → la verificación de identidad (accountLinks).
    const destino = new URL(request.url).searchParams.get("destino");

    if (destino === "balance") {
      return NextResponse.json({
        ok: true,
        url: `https://whop.com/dashboard/${companyId}/balance/`,
        companyId,
        tipo: "balance",
      });
    }

    const volver = `${APP_URL}/company/fondear?vinculada=1`;
    const link: any = await (whopClient as any).accountLinks.create({
      company_id: companyId,
      use_case: "account_onboarding",
      return_url: volver,
      // Si el enlace vence a mitad de camino, Whop manda acá para pedir uno
      // nuevo en vez de dejar a la persona en una pantalla muerta.
      refresh_url: `${APP_URL}/company/fondear?revincular=1`,
    });

    if (!link?.url) {
      console.error("[OnboardingLink] respuesta sin url:", JSON.stringify(link)?.slice(0, 200));
      return NextResponse.json({ error: "No se pudo crear el enlace" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, url: link.url, companyId, tipo: "verificacion", expiraEn: link.expires_at || null });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[OnboardingLink] error:", msg);
    return NextResponse.json({ error: `No se pudo crear el enlace: ${msg}` }, { status: 500 });
  }
}
