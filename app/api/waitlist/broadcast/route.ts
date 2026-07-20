import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const ADMIN_EMAILS = ["fmassuh133@gmail.com"];
// Sin dominio propio verificado, Resend permite enviar desde onboarding@resend.dev
const FROM = process.env.RESEND_FROM || "Octopus <onboarding@resend.dev>";

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
  if (!RESEND_KEY) {
    return NextResponse.json({ error: "Falta RESEND_API_KEY en Vercel (crea una cuenta gratis en resend.com y agrega la key)" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || "").trim().slice(0, 150);
  const message = String(body.message || "").trim().slice(0, 5000);
  const roleFilter = body.role === "creator" || body.role === "company" ? body.role : null;
  if (!subject || !message) return NextResponse.json({ error: "Faltan asunto y mensaje" }, { status: 400 });

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
  const q = roleFilter ? `&role=eq.${roleFilter}` : "";
  const rows: any[] = await (
    await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=email,name${q}&limit=2000`, { headers: H })
  ).json();
  const emails = Array.from(new Set((rows || []).map((r) => String(r.email || "").toLowerCase()).filter((e) => e.includes("@"))));
  if (!emails.length) return NextResponse.json({ error: "No hay inscriptos para enviar" }, { status: 400 });

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 20px; font-weight: 800; color: #0891B2; margin: 0 0 16px;">Octopus</p>
      <div style="font-size: 15px; line-height: 1.6; color: #1f2937; white-space: pre-line;">${message
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      <p style="margin-top: 28px; font-size: 12px; color: #9ca3af;">Estás recibiendo este email porque te anotaste en la lista de espera de Octopus.</p>
    </div>`;

  // Resend batch: hasta 100 por request
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map((to) => ({ from: FROM, to: [to], subject, html }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
      else errors.push((await res.text()).slice(0, 120));
    } catch (e: any) { errors.push(e?.message?.slice(0, 80)); }
  }

  return NextResponse.json({ ok: sent > 0, sent, total: emails.length, errors: errors.slice(0, 3) });
}
