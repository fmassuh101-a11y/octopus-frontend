import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/supabase";

// Identidad Whop de un usuario de Octopus (SIN OAuth, SIN login de Whop).
// Cada usuario se enrola como connected account con NUESTRA API key
// (companies.create) y su owner_user.id es su identidad de chat/DMs.
// Así el chat funciona 100% dentro de la app, como dice la guía oficial
// (docs.whop.com/developer/guides/chat/quickstart).

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const sbHeaders = () => {
  const key = SERVICE_KEY || SUPABASE_ANON_KEY;
  return { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };
};

export interface WhopIdentity {
  companyId: string;
  whopUserId: string;
}

/**
 * Devuelve (creándola si hace falta) la identidad Whop del usuario:
 * su connected account (companyId) y su usuario de Whop (whopUserId).
 * Persiste ambos en profiles para no repetir llamadas.
 */
export async function ensureWhopIdentity(user: { id: string; email?: string | null }): Promise<WhopIdentity> {
  // 1) leer lo que ya tenemos en el perfil
  const pRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=whop_company_id,whop_user_id,full_name`,
    { headers: sbHeaders() }
  );
  const profile = ((pRes.ok ? await pRes.json() : [])[0]) || {};

  let companyId: string = profile.whop_company_id || "";
  let whopUserId: string = profile.whop_user_id || "";
  if (companyId && whopUserId) return { companyId, whopUserId };

  if (companyId && !whopUserId) {
    // ya tiene connected account (creadores) → buscar su owner_user
    const co: any = await whopClient.companies.retrieve(companyId);
    whopUserId = co?.owner_user?.id || "";
  }

  if (!companyId) {
    // enrolar al usuario como connected account (crea su cuenta Whop mapeada)
    const email = (user.email || "").trim();
    if (!email || !email.includes("@")) throw new Error("email inválido para crear la cuenta de pagos/chat");
    const created: any = await (whopClient as any).companies.create({
      parent_company_id: OCTOPUS_COMPANY_ID,
      email,
      title: (profile.full_name || email.split("@")[0]).slice(0, 60),
    });
    companyId = created?.id || "";
    whopUserId = created?.owner_user?.id || "";
  }

  if (!companyId || !whopUserId) throw new Error("no se pudo resolver la identidad de Whop");

  // 2) persistir para la próxima — en DOS pasos para que el company_id quede
  //    guardado aunque la columna whop_user_id todavía no exista (sin esto,
  //    cada llamada crearía OTRA connected account duplicada).
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
    method: "PATCH",
    headers: sbHeaders(),
    body: JSON.stringify({ whop_company_id: companyId }),
  }).catch(() => {});
  const uRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`, {
    method: "PATCH",
    headers: sbHeaders(),
    body: JSON.stringify({ whop_user_id: whopUserId }),
  }).catch(() => null);
  if (!uRes || !uRes.ok) {
    console.error("[WhopIdentity] no se pudo guardar whop_user_id — ¿falta correr MENSAJES_SETUP.sql?");
  }

  return { companyId, whopUserId };
}

// scopes del token de chat embebido (los de la guía oficial)
export const CHAT_SCOPES = [
  "chat:message:create",
  "chat:read",
  "dms:read",
  "dms:message:manage",
  "dms:channel:manage",
  "support_chat:read",
  "support_chat:message:create",
];
