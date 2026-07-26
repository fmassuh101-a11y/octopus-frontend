import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * GET /api/whop/my-balance — saldo REAL de la cuenta de Whop del usuario.
 *
 * Antes el saldo era un número guardado en la tabla `wallets` de Supabase.
 * Eso era el síntoma del problema de fondo: si el saldo lo lleva Octapi en su
 * base, la plata está en la cuenta de Octapi. Ahora cada empresa y cada creador
 * tiene su propia cuenta en Whop, y este endpoint lee ESE saldo — el número que
 * muestra la app es el mismo que ve Whop, sin que nosotros custodiemos nada.
 *
 * Devuelve el saldo disponible, el pendiente (pagos aún no liquidados) y el
 * reservado, para poder mostrarlos distinto en la interfaz.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  try {
    const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=email`,
      { headers: H }
    );
    const profile = (profRes.ok ? await profRes.json() : [])[0];

    const companyId = await whopAccountForMoney({ id: user.id, email: profile?.email || user.email });
    if (!companyId) {
      return NextResponse.json({ error: "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    // La cuenta de saldo (ledger) se pide con ledgerAccounts.retrieve(). Según
    // la documentación de transferencias, los ids de empresa (biz_) sirven donde
    // se espera una cuenta, así que se prueba con el companyId directo. El
    // objeto Company NO trae el ledger anidado — verificado en los tipos del SDK.
    let ledger: any = null;
    let ledgerError = "";
    try {
      ledger = await (whopClient as any).ledgerAccounts.retrieve(companyId);
    } catch (e: any) {
      ledgerError = (e?.message || String(e)).slice(0, 200);
      console.error("[MyBalance] ledgerAccounts.retrieve falló para", companyId, ledgerError);
    }

    // balances es un arreglo por moneda: { balance, currency, pending_balance,
    // reserve_balance } — así lo declara el SDK.
    const usd = Array.isArray(ledger?.balances)
      ? ledger.balances.find((b: any) => String(b?.currency).toLowerCase() === "usd") || ledger.balances[0]
      : null;

    const balance = Number(usd?.balance) || 0;
    const pending = Number(usd?.pending_balance) || 0;
    const reserved = Number(usd?.reserve_balance) || 0;

    return NextResponse.json({
      ok: true,
      companyId,
      balance,
      pending,
      reserved,
      currency: "usd",
      // readable = pudimos hablar con Whop. Una cuenta recién creada devuelve
      // `balances` vacío, y eso NO es un fallo: significa saldo 0, y esa es la
      // verdad. Solo es ilegible si la llamada falló — ahí la app se queda con
      // lo que tenga en vez de mostrar un 0 inventado.
      readable: !!ledger,
      reason: ledger ? undefined : ledgerError || "no se pudo leer la cuenta",
    });
  } catch (e: any) {
    console.error("[MyBalance] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo leer tu saldo" }, { status: 500 });
  }
}
