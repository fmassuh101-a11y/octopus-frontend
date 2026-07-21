// Envío de emails de la lista de espera vía Resend (API REST directa, sin
// SDK). Requiere RESEND_API_KEY en Vercel (cuenta gratis en resend.com).
// Archivo separado de lib/waitlist.ts a propósito: ese lo importa el
// middleware (edge runtime) y este solo lo usan rutas API (Node runtime).

const RESEND_KEY = process.env.RESEND_API_KEY || "";
// Sin dominio propio verificado, Resend permite enviar desde onboarding@resend.dev
const FROM = process.env.RESEND_FROM || "Octapi <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://octopus-frontend-tau.vercel.app";

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

// Bienvenida automática — se manda una sola vez, apenas alguien se anota
// (no bloquea la respuesta del signup, se llama fire-and-forget).
export async function sendWelcomeEmail(opts: {
  email: string;
  name: string;
  role: "creator" | "company";
  waitlistId: string;
}): Promise<boolean> {
  const { email, name, role, waitlistId } = opts;
  const refLink = `${SITE_URL}/waitlist?ref=${waitlistId}`;
  const safeName = escapeHtml(name || (role === "creator" ? "creador" : "empresa"));

  const pitch =
    role === "creator"
      ? "Octapi conecta creadores de contenido con empresas de toda Latinoamérica que pagan por clips y contenido real. Contratos claros, pagos seguros, sin vueltas."
      : "Octapi conecta a tu empresa con creadores verificados de toda Latinoamérica, listos para producir contenido que convierte. Contratos claros y pagos seguros.";

  const inviteLine =
    role === "creator"
      ? "Si conoces a otros creadores a los que les pueda interesar, compárteles tu link — cada persona que se anote con él te sube en la fila."
      : "Si conoces a otras empresas o marcas a las que les pueda interesar, compárteles tu link — cada empresa que se anote con él te sube en la fila.";

  const html = emailShell(`
    <p style="font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 12px;">¡Hola, ${safeName}!</p>
    <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 16px;">
      Ya estás en la lista de espera de Octapi. Te avisamos por email apenas abramos las puertas.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 20px;">${pitch}</p>
    <div style="background: #f0fdff; border: 1px solid #a5f3fc; border-radius: 14px; padding: 18px 20px; margin: 0 0 20px;">
      <p style="font-size: 14px; font-weight: 700; color: #0e7490; margin: 0 0 8px;">Entra antes invitando gente</p>
      <p style="font-size: 14px; line-height: 1.5; color: #164e63; margin: 0 0 12px;">${inviteLine}</p>
      <a href="${refLink}" style="display: inline-block; font-size: 13px; font-family: monospace; color: #0891B2; word-break: break-all;">${refLink}</a>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0;">Gracias por sumarte desde el día uno.</p>
  `);

  const subject =
    role === "creator" ? "Ya estás en la lista de espera de Octapi" : "Tu empresa ya está en la lista de espera de Octapi";

  return sendResendEmail(email, subject, html);
}

// Broadcast personalizado — cada destinatario recibe su propio link de
// referidos insertado en el mensaje que escribe el admin.
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
