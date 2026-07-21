import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { buildBroadcastHtml, sendResendBatch } from "@/lib/waitlistEmail";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAILS = ["fmassuh133@gmail.com"];

/**
 * POST /api/waitlist/broadcast { subject, message, role? } — envía un email a
 * toda la lista de espera (o solo creadores/empresas) vía Resend. Solo admin.
 * Requiere RESEND_API_KEY en Vercel (crear cuenta gratis en resend.com).
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 5 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || "").trim().slice(0, 150);
  const message = String(body.message || "").trim().slice(0, 5000);
  const roleFilter = body.role === "creator" || body.role === "company" ? body.role : null;
  if (!subject || !message) return NextResponse.json({ error: "Faltan asunto y mensaje" }, { status: 400 });

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
  const q = roleFilter ? `&role=eq.${roleFilter}` : "";
  const rows: any[] = await (
    await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id,email${q}&limit=2000`, { headers: H })
  ).json();
  // dedupe por email (por si acaso) manteniendo el primer id de cada uno
  const seen = new Set<string>();
  const recipients = (rows || [])
    .map((r) => ({ id: String(r.id || ""), email: String(r.email || "").toLowerCase() }))
    .filter((r) => r.id && r.email.includes("@") && !seen.has(r.email) && seen.add(r.email));
  if (!recipients.length) return NextResponse.json({ error: "No hay inscriptos para enviar" }, { status: 400 });

  // Cada persona recibe SU PROPIO link de invitación insertado en el email
  // (antes era el mismo mensaje genérico para todos, sin link personalizado).

  // Resend batch: hasta 100 por request
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const batch = chunk.map((r) => ({
      to: r.email,
      subject,
      html: buildBroadcastHtml(message, r.id),
    }));
    const result = await sendResendBatch(batch);
    if (result.ok) {
      sent += chunk.length;
      // marca a quién le llegó ESTE envío — así el panel puede mostrar
      // un check de "enviado" en vez de dejar la duda de a quién le llegó
      const ids = chunk.map((r) => r.id).join(",");
      await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=in.(${ids})`, {
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json" },
        body: JSON.stringify({ last_broadcast_sent_at: new Date().toISOString() }),
      }).catch(() => {});
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return NextResponse.json({ ok: sent > 0, sent, total: recipients.length, errors: errors.slice(0, 3) });
}
