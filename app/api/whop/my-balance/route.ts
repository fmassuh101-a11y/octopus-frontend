import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { ensureWhopCompanyId } from "@/lib/ensureWhopAccount";
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
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type,email,company_name,full_name,whop_company_id`,
      { headers: H }
    );
    const profile = (profRes.ok ? await profRes.json() : [])[0];
    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    const type = profile.user_type === "company" ? "company" : "creator";
    const { companyId, error: acctError } = await ensureWhopCompanyId({
      userId: user.id,
      email: profile.email,
      name: profile.company_name || profile.full_name,
      type,
    });
    if (!companyId) {
      return NextResponse.json({ error: acctError || "No se pudo preparar tu cuenta de pagos" }, { status: 502 });
    }

    // El ledger de la cuenta: puede venir anidado en la company o pedirse aparte,
    // según la versión del SDK. Se prueban las dos formas antes de rendirse.
    let ledger: any = null;
    try {
      const company: any = await whopClient.companies.retrieve(companyId);
      ledger = company?.ledger_account || company?.ledgerAccount || null;
      if (!ledger?.id && (whopClient as any).ledgerAccounts?.retrieve) {
        const ledgerId = company?.ledger_account_id || company?.ledgerAccountId;
        if (ledgerId) ledger = await (whopClient as any).ledgerAccounts.retrieve(ledgerId);
      }
    } catch (e: any) {
      console.error("[MyBalance] no se pudo leer la cuenta:", e?.message?.slice(0, 200));
    }

    // Whop puede devolver los saldos como número suelto o como lista por moneda.
    const pick = (v: any): number => {
      if (typeof v === "number") return v;
      if (Array.isArray(v)) {
        const usd = v.find((b: any) => String(b?.currency).toLowerCase() === "usd");
        return Number(usd?.amount ?? usd?.balance ?? 0) || 0;
      }
      if (v && typeof v === "object") return Number((v as any).usd ?? 0) || 0;
      return 0;
    };

    const balance = pick(ledger?.balance ?? ledger?.balances);
    const pending = pick(ledger?.pending_balance ?? ledger?.pendingBalance);
    const reserved = pick(ledger?.reserve_balance ?? ledger?.reserveBalance);

    return NextResponse.json({
      ok: true,
      companyId,
      balance,
      pending,
      reserved,
      currency: "usd",
      // si Whop no devolvió ledger, la app puede avisar en vez de mostrar $0 falso
      readable: !!ledger,
    });
  } catch (e: any) {
    console.error("[MyBalance] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo leer tu saldo" }, { status: 500 });
  }
}
