import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/whop/payout-token
 * Mintea un access token scoped a la connected account del creador para el
 * PayoutsSession embebido (KYC + agregar banco + balance + retiro) DENTRO de
 * Octopus — sin sacar al usuario a whop.com.
 */
export async function GET(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (_blocked) return _blocked;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // identidad Whop del usuario (se crea sola si no existe — cero pasos previos)
    // ⚠️ SEGURIDAD: whopAccountForMoney, NO ensureWhopIdentity.
    // ensureWhopIdentity puede devolver la cuenta de Octapi como respaldo, y
    // este token abre el portal de cobros: saldo, agregar banco y RETIRAR. Con
    // el respaldo, la persona operaría sobre nuestra cuenta.
    const { whopAccountForMoney } = await import("@/lib/whopIdentity");
    const companyId = await whopAccountForMoney(user);
    if (!companyId) {
      console.error("[PayoutToken] sin cuenta propia:", user.id);
      return NextResponse.json(
        { error: "Todavía estamos preparando tu cuenta de cobros. Intenta en un minuto." },
        { status: 503 }
      );
    }

    // Token corto para los componentes embebidos (KYC + banco + balance + retiro).
    // SIN scoped_actions: el token hereda TODOS los permisos de la API key sobre esta
    // connected account (que es lo que necesita el flujo de payouts). Pasar una lista
    // con nombres de scope inválidos hacía que Whop devolviera error y el elemento
    // quedara en blanco.
    const res: any = await (whopClient as any).accessTokens.create({
      company_id: companyId,
    });
    const token = res?.token || res?.access_token || null;
    if (!token) {
      console.error("[PayoutToken] respuesta sin token:", JSON.stringify(res)?.slice(0, 200));
      return NextResponse.json({ error: "No se pudo crear el token" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, token, companyId });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[PayoutToken] error:", msg);
    // devolvemos el detalle para que el cliente lo muestre (no dejar el modal en blanco)
    return NextResponse.json({ error: `No se pudo crear el token de pagos: ${msg}` }, { status: 500 });
  }
}
