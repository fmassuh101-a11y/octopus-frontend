import { NextRequest, NextResponse } from "next/server";
import { WHOP_ENVIRONMENT } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const API = WHOP_ENVIRONMENT === "sandbox"
  ? "https://sandbox-api.whop.com/api/v1"
  : "https://api.whop.com/api/v1";

/**
 * GET /api/whop/metodos-deposito — qué formas de depositar tiene habilitadas
 * esta empresa, y con qué instrucciones.
 *
 * POR QUÉ SE LLAMA A LA API DIRECTO Y NO POR EL SDK
 * El recurso `deposits` no existe en la versión del SDK que tenemos (0.0.27);
 * aparece recién en la 0.0.42. Actualizar el SDK entero por una llamada es
 * arriesgado —hay cambios de nombres de parámetros entre medio— así que se
 * llama al endpoint REST tal cual. Si algún día se actualiza el SDK, esto se
 * puede reemplazar por deposits.create sin cambiar nada más.
 *
 * QUÉ RESPONDE ESTO
 * Whop NO publica la comisión de los depósitos por transferencia ni por cripto:
 * no está en su tabla de tarifas, ni en el objeto Deposit, ni en los tipos de
 * comisión de su libro contable. Esta llamada dice si esos métodos están
 * habilitados para la cuenta, que es el paso previo a saber cuánto cuestan.
 *
 * No mueve plata ni cobra nada: solo pide las instrucciones.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const key = process.env.WHOP_API_KEY || "";
  if (!key) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  try {
    const companyId = await whopAccountForMoney({ id: user.id, email: user.email });
    if (!companyId) {
      return NextResponse.json({ error: "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    const res = await fetch(`${API}/deposits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ destination: companyId }),
    });

    const cuerpo = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[MetodosDeposito]", res.status, JSON.stringify(cuerpo)?.slice(0, 300));
      return NextResponse.json(
        { ok: false, estado: res.status, detalle: cuerpo, companyId },
        { status: 200 } // se devuelve 200 para que la pantalla pueda mostrar el motivo
      );
    }

    const banco = cuerpo?.methods?.bank ?? null;
    const cripto = Array.isArray(cuerpo?.methods?.crypto) ? cuerpo.methods.crypto : [];

    return NextResponse.json({
      ok: true,
      companyId,
      paginaAlojada: cuerpo?.hosted_url ?? null,
      transferencia: {
        habilitada: !!banco,
        // Las instrucciones traen datos bancarios reales; se devuelven tal cual
        // porque son de la propia empresa y las necesita para transferir.
        detalle: banco,
      },
      cripto: {
        habilitada: cripto.length > 0,
        redes: cripto.map((c: any) => ({
          nombre: c?.name,
          direccion: c?.deposit_address,
          monedas: (c?.supported_currencies || []).map((m: any) => m?.symbol || m?.name || m),
        })),
      },
      crudo: cuerpo,
    });
  } catch (e: any) {
    console.error("[MetodosDeposito] error:", e?.message || e);
    return NextResponse.json({ error: "No pudimos consultar los métodos de depósito" }, { status: 500 });
  }
}
