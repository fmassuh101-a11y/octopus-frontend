import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { ensureWhopIdentity } from "@/lib/whopIdentity";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

// AUTO-PAYOUT: cuando le pagan a un creador, su plata se transfiere DE INMEDIATO
// a su cuenta de Whop (no custodiamos fondos de terceros — requisito legal CL).
// 1) transferencia Whop→Whop (idempotente)  2) si salió, descuenta el ledger.
// Si Whop falla, la plata queda en el ledger y puede retirarla manual (fallback).
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function autoPayoutToWhop(opts: {
  userId: string;
  email?: string | null;
  amount: number;
  idempotenceKey: string;
  notes?: string;
}): Promise<{ sent: boolean; transferId?: string; error?: string }> {
  try {
    const { companyId } = await ensureWhopIdentity({ id: opts.userId, email: opts.email });

    const transfer: any = await (whopClient as any).transfers.create({
      amount: Math.round(opts.amount * 100) / 100,
      currency: "usd",
      origin_id: OCTOPUS_COMPANY_ID,
      destination_id: companyId,
      idempotence_key: opts.idempotenceKey,
      notes: opts.notes || "Pago Octopus",
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
