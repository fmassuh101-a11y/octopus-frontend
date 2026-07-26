import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { SUPABASE_URL } from "@/lib/config/supabase";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Devuelve el whop_company_id del usuario, creándolo en Whop si todavía no
 * tiene. Silencioso: la empresa nunca ve esto ni tiene que hacer nada.
 *
 * POR QUÉ EXISTE
 * Antes TODA la plata pasaba por la cuenta de Octapi: la empresa fondeaba a
 * nuestra cuenta, el saldo era un número en Supabase, y los pagos salían de
 * nosotros. Eso es retener fondos de terceros — no se puede hacer en Chile
 * sin ser una institución financiera regulada.
 *
 * Ahora cada empresa tiene SU PROPIA cuenta en Whop: fondea ahí, la plata es
 * suya, y los pagos salen de su cuenta a la del creador. Octapi solo cobra su
 * comisión. El capital ajeno nunca nos toca.
 */
export async function ensureWhopCompanyId(opts: {
  userId: string;
  email?: string | null;
  name?: string | null;
  type: "company" | "creator";
}): Promise<{ companyId: string | null; created: boolean; error?: string }> {
  const { userId, type } = opts;
  if (!SERVICE_KEY) return { companyId: null, created: false, error: "Config del servidor incompleta" };
  if (!OCTOPUS_COMPANY_ID) return { companyId: null, created: false, error: "Falta WHOP_OCTOPUS_COMPANY_ID" };

  const H = {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    "Content-Type": "application/json",
  };

  // ¿ya tiene?
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=whop_company_id,email,full_name,company_name`,
    { headers: H }
  );
  const profile = (profRes.ok ? await profRes.json() : [])[0];
  if (profile?.whop_company_id) {
    return { companyId: profile.whop_company_id as string, created: false };
  }

  const email = opts.email || profile?.email;
  if (!email) return { companyId: null, created: false, error: "El perfil no tiene email" };

  const baseTitle =
    opts.name ||
    profile?.company_name ||
    profile?.full_name ||
    `${type === "company" ? "Empresa" : "Creator"}_${userId.slice(0, 8)}`;

  let company: any;
  try {
    company = await whopClient.companies.create({
      email,
      parent_company_id: OCTOPUS_COMPANY_ID,
      title: baseTitle,
      metadata: { octopus_user_id: userId, type },
    } as any);
  } catch (e: any) {
    // Whop rechaza dos cuentas con el mismo nombre — se reintenta una sola vez
    // con sufijo, igual que hace setup-creator.
    const msg = e?.message || e?.error?.message || "";
    if (/same name/i.test(msg)) {
      try {
        company = await whopClient.companies.create({
          email,
          parent_company_id: OCTOPUS_COMPANY_ID,
          title: `${baseTitle}_${Date.now()}`,
          metadata: { octopus_user_id: userId, type },
        } as any);
      } catch (e2: any) {
        console.error("[ensureWhopCompanyId] fallo el reintento:", e2?.message || e2);
        return { companyId: null, created: false, error: "No se pudo crear la cuenta de pagos" };
      }
    } else {
      console.error("[ensureWhopCompanyId] fallo al crear:", msg || e);
      return { companyId: null, created: false, error: "No se pudo crear la cuenta de pagos" };
    }
  }

  if (!company?.id) return { companyId: null, created: false, error: "Whop no devolvió el id de la cuenta" };

  const upd = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ whop_company_id: company.id }),
  });
  if (!upd.ok) {
    console.error("[ensureWhopCompanyId] no se pudo guardar el id:", upd.status, await upd.text().catch(() => ""));
    // la cuenta existe en Whop igual — se devuelve para no bloquear la operación
  }

  return { companyId: company.id as string, created: true };
}
