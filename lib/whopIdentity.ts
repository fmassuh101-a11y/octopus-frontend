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
    // ya tiene connected account (creadores) → buscar su owner_user.
    // Si la cuenta está rota en Whop (hay cuentas viejas que dan 404
    // "This Bot was not found"), la tratamos como inexistente y creamos una nueva.
    try {
      const co: any = await whopClient.companies.retrieve(companyId);
      whopUserId = co?.owner_user?.id || "";
    } catch {
      companyId = "";
    }
  }

  // Email: el que venga → el del perfil → el de AUTH (admin). Sin esto, las
  // cuentas cuyo perfil no guardó email caían al fallback del dueño y las
  // conversaciones salían como "Octopus"/chanchito y se duplicaban.
  let resolvedEmail = (user.email || "").trim();
  if (!resolvedEmail.includes("@") && SERVICE_KEY) {
    try {
      const aRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      });
      if (aRes.ok) resolvedEmail = ((await aRes.json())?.email || "").trim();
    } catch {}
  }
  const emailForTwin = resolvedEmail;
  if (!companyId && emailForTwin.includes("@")) {
    const email = emailForTwin;

    // ¿Otro perfil de la MISMA casilla ya tiene identidad Whop? → adoptarla en
    // vez de crear otra cuenta. Normalizamos alias de Gmail: para Whop,
    // "pepe+algo@gmail.com" y "pepe@gmail.com" son la MISMA casilla.
    const [local, domain] = email.split("@");
    const base = `${local.split("+")[0]}@${domain}`;
    const pattern = `${local.split("+")[0]}+%@${domain}`; // pepe+cualquiercosa@dominio
    const twinRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?or=(email.eq.${encodeURIComponent(email)},email.eq.${encodeURIComponent(base)},email.like.${encodeURIComponent(pattern)})&whop_user_id=not.is.null&select=whop_user_id,whop_company_id&limit=1`,
      { headers: sbHeaders() }
    );
    const twin = ((twinRes.ok ? await twinRes.json() : [])[0]) || null;
    if (twin?.whop_user_id) {
      companyId = twin.whop_company_id || OCTOPUS_COMPANY_ID;
      whopUserId = twin.whop_user_id;
    }
  }

  if (!companyId) {
    // enrolar al usuario como connected account (crea su cuenta Whop mapeada)
    const email = emailForTwin;
    const title = (profile.full_name || (email.includes("@") ? email.split("@")[0] : "Usuario Octopus")).slice(0, 60);
    const create = (mail: string) =>
      (whopClient as any).companies.create({ parent_company_id: OCTOPUS_COMPANY_ID, email: mail, title });
    try {
      if (!email.includes("@")) throw new Error("sin email");
      const created: any = await create(email);
      companyId = created?.id || "";
      whopUserId = created?.owner_user?.id || "";
    } catch (e: any) {
      // "mailbox is full" = email con demasiadas cuentas de prueba en Whop →
      // reintento con alias determinístico (llega a la misma casilla real)
      if (/mailbox is full|already/i.test(e?.message || "") && email.includes("@")) {
        const [local, domain] = email.split("@");
        const aliased = `${local.split("+")[0]}+oct${user.id.replace(/-/g, "").slice(0, 10)}@${domain}`;
        try {
          const created: any = await create(aliased);
          companyId = created?.id || "";
          whopUserId = created?.owner_user?.id || "";
        } catch {}
      }
    }
  }

  // ÚLTIMO RECURSO: identidad del dueño de la plataforma. La mensajería NUNCA
  // debe fallar por identidad (esto solo pasa con cuentas de prueba con email
  // quemado o vacío; los usuarios reales crean su cuenta sin problema).
  if (!companyId || !whopUserId) {
    try {
      const main: any = await whopClient.companies.retrieve(OCTOPUS_COMPANY_ID);
      companyId = OCTOPUS_COMPANY_ID;
      whopUserId = main?.owner_user?.id || "";
    } catch {}
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
