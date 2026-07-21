// Envío de emails de la lista de espera vía Resend (API REST directa, sin
// SDK). Requiere RESEND_API_KEY en Vercel (cuenta gratis en resend.com).
// Archivo separado de lib/waitlist.ts a propósito: ese lo importa el
// middleware (edge runtime) y este solo lo usan rutas API (Node runtime).

// Dos cuentas posibles: la principal (RESEND_API_KEY) y una de respaldo
// (RESEND_API_KEY_2, opcional). El plan gratis de Resend tope 100
// emails/día — el email de bienvenida es automático y corre TODOS LOS DÍAS
// mientras la waitlist esté activa, así que si algún día se pasa de 100
// registros reales, la segunda cuenta entra sola sin que nadie haga nada.
// Cada cuenta necesita SU PROPIO remitente verificado — Resend no deja
// verificar el mismo dominio exacto en dos cuentas distintas, así que la
// segunda cuenta usa un subdominio propio (ej. updates.octapiapp.com) con
// su propia variable RESEND_FROM_2. Sin RESEND_API_KEY_2/RESEND_FROM_2
// configuradas, esto se comporta igual que con una sola cuenta.
const RESEND_ACCOUNTS: Array<{ key: string; from: string }> = [
  process.env.RESEND_API_KEY
    ? { key: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM || "Octapi <onboarding@resend.dev>" }
    : null,
  process.env.RESEND_API_KEY_2 && process.env.RESEND_FROM_2
    ? { key: process.env.RESEND_API_KEY_2, from: process.env.RESEND_FROM_2 }
    : null,
].filter((a): a is { key: string; from: string } => a !== null);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://octapiapp.com";

// SEGURIDAD: el celular de Felipe SOLO va en el email a empresas, y SOLO
// se lee desde una variable de entorno de Vercel — nunca hardcodeado acá,
// porque este repo es público en GitHub (mismo motivo que la contraseña
// de la waitlist). Sin la variable configurada, el bloque de "agenda una
// llamada" simplemente no aparece en el email (no rompe nada).
const COMPANY_CONTACT_PHONE = process.env.COMPANY_CONTACT_PHONE || "";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A propósito con muy poco estilo (sin cajas de fondo de color, sin botones
// grandes): a Gmail/Outlook les alcanzan esas señales para clasificar un
// email como "Promociones" en vez de bandeja principal. Un email que se ve
// como un mensaje personal (texto simple, un par de links de línea) tiene
// mucha más chance de caer en la bandeja de verdad.
function emailShell(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937; font-size: 16px; line-height: 1.65; letter-spacing: 0.1px;">
      ${bodyHtml}
      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        Síguenos en <a href="https://www.tiktok.com/@app_desde_zero" style="color: #0891B2;">TikTok</a> e <a href="https://instagram.com/octapi.app" style="color: #0891B2;">Instagram</a>.
      </p>
      <p style="margin-top: 8px; font-size: 12px; color: #9ca3af;">Estás recibiendo este email porque te anotaste en la lista de espera de Octapi.</p>
    </div>`;
}

// Timeout duro en cada llamada a Resend — sin esto, si Resend se cuelga sin
// responder, el join del usuario (que espera a este await, ver route.ts)
// se queda pegado indefinidamente y el botón de "Unirme a la lista" nunca
// se libera. 8s es de sobra para una API que normalmente responde en <1s.
async function fetchWithTimeout(url: string, init: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Intenta cada key en orden — si la primera se quedó sin cuota diaria (o
// cualquier otro error), reintenta automáticamente con la siguiente. Un
// 429 (rate limit) es la señal típica de "se acabó el límite del día".
// Devuelve el error real de Resend (no solo true/false) para poder mostrarlo
// en el panel admin — antes quedaba solo en los logs de Vercel, que Felipe
// no puede revisar.
async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_ACCOUNTS.length) return { ok: false, error: "Falta RESEND_API_KEY en Vercel" };
  let lastError = "";
  for (const account of RESEND_ACCOUNTS) {
    try {
      const res = await fetchWithTimeout("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${account.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: account.from, to: [to], subject, html }),
      });
      if (res.ok) return { ok: true };
      lastError = (await res.text()).slice(0, 300);
      console.error("[ResendEmail] fallo:", res.status, lastError);
    } catch (e: any) {
      lastError = e?.name === "AbortError" ? "Resend no respondió a tiempo (timeout)" : e?.message?.slice(0, 200) || "error desconocido";
      console.error("[ResendEmail] excepción:", lastError);
    }
  }
  return { ok: false, error: lastError };
}

// Igual que sendResendEmail pero para el endpoint de batch (hasta 100 por
// request) que usan el broadcast y la bienvenida retroactiva. Si la
// primera cuenta falla, reintenta el batch completo con la siguiente.
export async function sendResendBatch(emails: Array<{ to: string; subject: string; html: string }>): Promise<{ ok: boolean; error?: string }> {
  if (!emails.length) return { ok: true };
  let lastError = "Falta RESEND_API_KEY en Vercel";
  for (const account of RESEND_ACCOUNTS) {
    const payload = emails.map((e) => ({ from: account.from, to: [e.to], subject: e.subject, html: e.html }));
    try {
      const res = await fetchWithTimeout("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${account.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { ok: true };
      lastError = (await res.text()).slice(0, 120);
    } catch (e: any) {
      lastError = e?.message?.slice(0, 80) || "error desconocido";
    }
  }
  return { ok: false, error: lastError };
}

// El texto que se VE es corto (solo el dominio) aunque el link de verdad
// (href) lleve el código de referido — así no se ve un link larguísimo con
// un UUID colgando, pero el clic sigue yendo al lugar correcto y sigue
// sumando el referido.
function referralLine(refLink: string, label: string): string {
  const displayText = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `
    <p style="margin: 0 0 8px;">${label}</p>
    <p style="font-size: 14px; margin: 0 0 20px;"><a href="${refLink}" style="color: #0891B2;">${displayText}</a></p>`;
}

// ---------- Bienvenida a CREADOR ----------
function creatorWelcomeHtml(name: string, refLink: string): string {
  const safeName = escapeHtml(name || "creador");
  return emailShell(`
    <p style="margin: 0 0 16px;">¡Hola, ${safeName}!</p>
    <p style="margin: 0 0 16px;">
      Ya estás en la lista de espera de Octapi. Te avisamos por email apenas abramos las puertas.
    </p>
    <p style="margin: 0 0 20px;">
      Cuando abramos, vas a poder aplicar a campañas reales de empresas de toda Latinoamérica que sí pagan por contenido — con contrato claro y pago seguro, sin tener que perseguir a nadie para que te pague.
    </p>
    ${referralLine(refLink, "Si conoces a otros creadores, o a alguien con una empresa a la que le pueda interesar sumarse, comparte tu link con ellos — cada persona que se anote te sube en la fila:")}
    <p style="margin: 0;">Gracias por sumarte desde el día uno.</p>
    <p style="margin: 8px 0 0;">— El equipo de Octapi</p>
  `);
}

// ---------- Bienvenida a EMPRESA ----------
function companyWelcomeHtml(name: string, refLink: string): string {
  const safeName = escapeHtml(name || "tu empresa");
  const callBlock = COMPANY_CONTACT_PHONE
    ? `
    <p style="margin: 0 0 6px;">¿Quieres conversar antes de que abramos? Podemos agendar una llamada breve para contarte cómo funciona y responder tus dudas — escribime por WhatsApp:</p>
    <p style="font-size: 14px; margin: 0 0 20px;"><a href="https://wa.me/${COMPANY_CONTACT_PHONE.replace(/\D/g, "")}" style="color: #0891B2;">wa.me/${COMPANY_CONTACT_PHONE.replace(/\D/g, "")}</a></p>`
    : "";

  return emailShell(`
    <p style="margin: 0 0 16px;">Hola, equipo de ${safeName}</p>
    <p style="margin: 0 0 16px;">
      Gracias por sumar a ${safeName} a la lista de espera de Octapi. Les avisamos apenas abramos las puertas.
    </p>
    <p style="margin: 0 0 20px;">
      Octapi conecta a su empresa con creadores verificados de toda Latinoamérica, listos para producir contenido que realmente convierte — sin agencias de por medio, con contrato claro y pago seguro de punta a punta.
    </p>
    ${callBlock}
    ${referralLine(refLink, "Si conocen a otras empresas o marcas, o a algún creador con el que ya hayan trabajado antes, compártanle su link — cada persona o empresa que se anote las sube en la fila:")}
    <p style="margin: 0;">Gracias por confiar en Octapi desde esta etapa temprana.</p>
    <p style="margin: 8px 0 0;">— Felipe, fundador de Octapi</p>
  `);
}

export function buildWelcomeHtml(name: string, role: "creator" | "company", waitlistId: string): string {
  const refLink = `${SITE_URL}/waitlist?ref=${waitlistId}`;
  return role === "creator" ? creatorWelcomeHtml(name, refLink) : companyWelcomeHtml(name, refLink);
}

export function welcomeSubject(role: "creator" | "company"): string {
  return role === "creator" ? "Ya estás en la lista de espera de Octapi" : "Tu empresa ya está en la lista de espera de Octapi";
}

// Bienvenida automática — se manda una sola vez, apenas alguien se anota.
// Quien llama a esto DEBE esperar (await) el resultado: en Vercel
// serverless, si no se espera, la función puede cortarse antes de que el
// envío termine (ver join/route.ts para el caso real que pasó).
export async function sendWelcomeEmail(opts: {
  email: string;
  name: string;
  role: "creator" | "company";
  waitlistId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { email, name, role, waitlistId } = opts;
  return sendResendEmail(email, welcomeSubject(role), buildWelcomeHtml(name, role, waitlistId));
}

// ---------- Broadcast libre (mensaje que escribe el admin) ----------
// Cada destinatario recibe su propio link de referidos insertado en el email.
export function buildBroadcastHtml(message: string, waitlistId: string): string {
  const refLink = `${SITE_URL}/waitlist?ref=${waitlistId}`;
  return emailShell(`
    <div style="font-size: 15px; line-height: 1.6; white-space: pre-line; margin: 0 0 20px;">${escapeHtml(message)}</div>
    ${referralLine(refLink, "Tu link para invitar gente:")}
  `);
}
