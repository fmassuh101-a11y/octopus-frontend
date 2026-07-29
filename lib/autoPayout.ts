import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { ensureWhopIdentity } from "@/lib/whopIdentity";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

// AUTO-PAYOUT: cuando le pagan a un creador, su plata se transfiere DE INMEDIATO
// a su cuenta de Whop (no custodiamos fondos de terceros — requisito legal CL).
// 1) transferencia Whop→Whop (idempotente)  2) si salió, descuenta el ledger.
// Si Whop falla, la plata queda en el ledger y puede retirarla manual (fallback).
//
// El ORIGEN es la cuenta de Whop de la EMPRESA que paga (originCompanyId), no
// la de Octapi. Antes salía de OCTOPUS_COMPANY_ID: aunque la transferencia era
// inmediata, el capital pasaba igual por nosotros. Ahora va directo de la
// cuenta de la empresa a la del creador y Octapi nunca lo toca.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function autoPayoutToWhop(opts: {
  userId: string;
  email?: string | null;
  amount: number;
  idempotenceKey: string;
  notes?: string;
  originCompanyId: string; // cuenta Whop de la empresa que paga
}): Promise<{ sent: boolean; transferId?: string; error?: string }> {
  try {
    if (!opts.originCompanyId) {
      return { sent: false, error: "falta la cuenta de pagos de la empresa" };
    }
    const { companyId } = await ensureWhopIdentity({ id: opts.userId, email: opts.email });

    // SALVAGUARDA CRÍTICA — no borrar.
    // ensureWhopIdentity tiene un "último recurso" que devuelve la cuenta de
    // Octapi cuando no logra resolver al usuario. Ese respaldo existe para que
    // el CHAT nunca falle, y está bien ahí. Pero acá el companyId es el DESTINO
    // DE LA PLATA: si se colara, el pago del creador terminaría en la cuenta de
    // Octapi sin que nadie se entere. Antes que eso, el pago falla y queda en el
    // ledger como pendiente — el creador no pierde nada y se puede reintentar.
    if (!companyId || companyId === OCTOPUS_COMPANY_ID) {
      console.error("[AutoPayout] BLOQUEADO: el creador", opts.userId, "no tiene cuenta propia de Whop");
      return { sent: false, error: "el creador todavía no tiene cuenta de pagos" };
    }
    if (companyId === opts.originCompanyId) {
      console.error("[AutoPayout] BLOQUEADO: origen y destino son la misma cuenta");
      return { sent: false, error: "origen y destino coinciden" };
    }

    const transfer: any = await (whopClient as any).transfers.create({
      amount: Math.round(opts.amount * 100) / 100,
      currency: "usd",
      origin_id: opts.originCompanyId,
      destination_id: companyId,
      idempotence_key: opts.idempotenceKey,
      // Whop rechaza notes de más de 50 caracteres. Si se pasa, transfers.create
      // falla, pero el RPC de la base YA descontó el saldo y le avisó al creador
      // "te pagaron": plata que nunca se movió. Se corta acá y no en quien llama,
      // para que ninguna ruta futura pueda reintroducir el problema.
      notes: (opts.notes || "Pago Octopus").slice(0, 50),
      metadata: { octopus_user_id: opts.userId, auto_payout: true },
    });
    if (!transfer?.id) return { sent: false, error: "transfer sin id" };

    // descontar el ledger (atómico, solo server)
    const key = SERVICE_KEY || SUPABASE_ANON_KEY;
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_auto_payout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: opts.userId, p_amount: opts.amount }),
    });
    const out = await rpc.json().catch(() => null);
    if (!rpc.ok || !out?.ok) {
      // la transferencia YA salió; si el ledger no bajó queda como saldo extra visible
      // (peor caso: el creador ve saldo de más — corregible por admin; nunca pierde plata)
      console.error("[AutoPayout] transfer OK pero ledger no bajó:", JSON.stringify(out)?.slice(0, 150));
    }
    return { sent: true, transferId: transfer.id };
  } catch (e: any) {
    console.error("[AutoPayout] falló (queda en el ledger como fallback):", e?.message?.slice(0, 200));
    return { sent: false, error: e?.message };
  }
}
