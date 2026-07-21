// Envío de emails de la lista de espera vía Resend (API REST directa, sin
// SDK). Requiere RESEND_API_KEY en Vercel (cuenta gratis en resend.com).
// Archivo separado de lib/waitlist.ts a propósito: ese lo importa el
// middleware (edge runtime) y este solo lo usan rutas API (Node runtime).

const RESEND_KEY = process.env.RESEND_API_KEY || "";
// Sin dominio propio verificado, Resend permite enviar desde onboarding@resend.dev
const FROM = process.env.RESEND_FROM || "Octapi <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://octopus-frontend-tau.vercel.app";

// SEGURIDAD: el celular de Felipe SOLO va en el email a empresas, y SOLO
// se lee desde una variable de entorno de Vercel — nunca hardcodeado acá,
// porque este repo es público en GitHub (mismo motivo que la contraseña
// de la waitlist). Sin la variable configurada, el bloque de "agenda una
// llamada" simplemente no aparece en el email (no rompe nada).
const COMPANY_CONTACT_PHONE = process.env.COMPANY_CONTACT_PHONE || "";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function emailShell(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 20px; font-weight: 800; color: #0891B2; margin: 0 0 20px;">Octapi</p>
      ${bodyHtml}
      <p style="margin-top: 28px; font-size: 12px; color: #9ca3af;">Estás recibiendo este email porque te anotaste en la lista de espera de Octapi.</p>
    </div>`;
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function referralBox(refLink: string, label: string): string {
  return `
    <div style="background: #f0fdff; border: 1px solid #a5f3fc; border-radius: 14px; padding: 18px 20px; margin: 0 0 20px;">
      <p style="font-size: 14px; font-weight: 700; color: #0e7490; margin: 0 0 8px;">Entra antes invitando gente</p>
      <p style="font-size: 14px; line-height: 1.5; color: #164e63; margin: 0 0 12px;">${label}</p>
      <a href="${refLink}" style="display: inline-block; font-size: 13px; font-family: monospace; color: #0891B2; word-break: break-all;">${refLink}</a>
    </div>`;
}

// ---------- Bienvenida a CREADOR ----------
function creatorWelcomeHtml(name: string, refLink: string): string {
  const safeName = escapeHtml(name || "creador");
  return emailShell(`
    <p style="font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 12px;">¡Hola, ${safeName}!</p>
    <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 16px;">
      Ya estás en la lista de espera de Octapi. Te avisamos por email apenas abramos las puertas.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 20px;">
      Octapi conecta creadores de contenido con empresas reales de toda Latinoamérica que pagan por clips y contenido. Contratos claros, pagos seguros, sin vueltas.
    </p>
    ${referralBox(refLink, "Si conoces a otros creadores a los que les pueda interesar, compárteles tu link — cada persona que se anote con él te sube en la fila.")}
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">Gracias por sumarte desde el día uno.</p>
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 8px 0 0;">— El equipo de Octapi</p>
  `);
}

// ---------- Bienvenida a EMPRESA ----------
function companyWelcomeHtml(name: string, refLink: string): string {
  const safeName = escapeHtml(name || "tu empresa");
  const callBlock = COMPANY_CONTACT_PHONE
    ? `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin: 0 0 20px;">
      <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 8px;">¿Quieres conversar antes de que abramos?</p>
      <p style="font-size: 14px; line-height: 1.5; color: #334155; margin: 0 0 14px;">
        Podemos agendar una llamada breve para contarte cómo funciona y responder tus dudas.
      </p>
      <a href="https://wa.me/${COMPANY_CONTACT_PHONE.replace(/\D/g, "")}" style="display: inline-block; background: #0891B2; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 22px; border-radius: 10px;">
        Agendar por WhatsApp
      </a>
    </div>`
    : "";

  return emailShell(`
    <p style="font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 12px;">Hola, equipo de ${safeName}</p>
    <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 16px;">
      Gracias por sumar a <strong>${safeName}</strong> a la lista de espera de Octapi. Les avisamos apenas abramos las puertas.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 20px;">
      Octapi conecta a su empresa con creadores verificados de toda Latinoamérica, listos para producir contenido auténtico que convierte. Contratos claros y pagos seguros, sin intermediarios innecesarios.
    </p>
    ${callBlock}
    ${referralBox(refLink, "Si conocen a otras empresas o marcas a las que les pueda interesar, compártanles su link — cada empresa que se anote con él las sube en la fila.")}
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">Gracias por confiar en Octapi desde esta etapa temprana.</p>
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 8px 0 0;">— Felipe, fundador de Octapi</p>
  `);
}

export function buildWelcomeHtml(name: string, role: "creator" | "company", waitlistId: string): string {
  const refLink = `${SITE_URL}/waitlist?ref=${waitlistId}`;
  return role === "creator" ? creatorWelcomeHtml(name, refLink) : companyWelcomeHtml(name, refLink);
}

export function welcomeSubject(role: "creator" | "company"): string {
  return role === "creator" ? "Ya estás en la lista de espera de Octapi" : "Tu empresa ya está en la lista de espera de Octapi";
}

// Bienvenida automática — se manda una sola vez, apenas alguien se anota
// (no bloquea la respuesta del signup, se llama fire-and-forget).
export async function sendWelcomeEmail(opts: {
  email: string;
  name: string;
  role: "creator" | "company";
  waitlistId: string;
}): Promise<boolean> {
  const { email, name, role, waitlistId } = opts;
  return sendResendEmail(email, welcomeSubject(role), buildWelcomeHtml(name, role, waitlistId));
}

// ---------- Broadcast libre (mensaje que escribe el admin) ----------
// Cada destinatario recibe su propio link de referidos insertado en el email.
export function buildBroadcastHtml(message: string, waitlistId: string): string {
  const refLink = `${SITE_URL}/waitlist?ref=${waitlistId}`;
  return emailShell(`
    <div style="font-size: 15px; line-height: 1.6; color: #1f2937; white-space: pre-line; margin: 0 0 20px;">${escapeHtml(message)}</div>
    <div style="background: #f0fdff; border: 1px solid #a5f3fc; border-radius: 14px; padding: 16px 20px;">
      <p style="font-size: 13px; font-weight: 700; color: #0e7490; margin: 0 0 6px;">Tu link para invitar gente</p>
      <a href="${refLink}" style="display: inline-block; font-size: 13px; font-family: monospace; color: #0891B2; word-break: break-all;">${refLink}</a>
    </div>
  `);
}

export async function sendBroadcastEmail(to: string, subject: string, message: string, waitlistId: string): Promise<boolean> {
  return sendResendEmail(to, subject, buildBroadcastHtml(message, waitlistId));
}
