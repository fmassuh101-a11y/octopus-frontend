import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { buildWelcomeHtml, welcomeSubject } from "@/lib/waitlistEmail";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const ADMIN_EMAILS = ["fmassuh133@gmail.com"];
const FROM = process.env.RESEND_FROM || "Octapi <onboarding@resend.dev>";

const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };

/**
 * POST /api/waitlist/welcome-backfill — manda el email de bienvenida
 * (el mismo que reciben los nuevos registros automáticamente) a los que
 * TODAVÍA no lo recibieron, con el texto correcto según su rol (creador o
 * empresa). Se puede apretar el botón varias veces sin duplicar: cada envío
 * exitoso marca welcome_sent_at, así que la próxima vez solo se manda a
 * quien falte — necesario porque el plan gratis de Resend tope 100/día.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 3 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  if (!RESEND_KEY) {
    return NextResponse.json({ error: "Falta RESEND_API_KEY en Vercel" }, { status: 500 });
  }

  // filtra por welcome_sent_at=is.null; si la columna todavía no existe
  // (falta pegar el SQL), cae a traer todos sin filtrar en vez de romper.
  let rowsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/waitlist?welcome_sent_at=is.null&select=id,email,name,company_name,role`,
    { headers: H }
  );
  let missingColumn = false;
  if (!rowsRes.ok) {
    const errText = await rowsRes.text();
    if (/column .* does not exist/i.test(errText) || /welcome_sent_at/.test(errText)) {
      missingColumn = true;
      rowsRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id,email,name,company_name,role`, { headers: H });
    }
  }
  const rows: any[] = rowsRes.ok ? await rowsRes.json() : [];

  const seen = new Set<string>();
  const recipients = (rows || [])
    .map((r) => ({
      id: String(r.id || ""),
      email: String(r.email || "").toLowerCase(),
      role: r.role === "company" ? "company" : "creator",
      name: r.role === "company" ? String(r.company_name || "") : String(r.name || ""),
    }))
    .filter((r) => r.id && r.email.includes("@") && !seen.has(r.email) && seen.add(r.email));
  if (!recipients.length) {
    return NextResponse.json({ ok: true, sent: 0, pending: 0, message: "Ya se le mandó la bienvenida a todos." });
  }

  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const batch = chunk.map((r) => ({
      from: FROM,
      to: [r.email],
      subject: welcomeSubject(r.role as "creator" | "company"),
      html: buildWelcomeHtml(r.name, r.role as "creator" | "company", r.id),
    }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        sent += chunk.length;
        // marca a este lote como enviado para que no se repita la próxima vez
        if (!missingColumn) {
          const ids = chunk.map((r) => r.id).join(",");
          fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=in.(${ids})`, {
            method: "PATCH",
            headers: H,
            body: JSON.stringify({ welcome_sent_at: new Date().toISOString() }),
          }).catch(() => {});
        }
      } else {
        errors.push((await res.text()).slice(0, 120));
      }
    } catch (e: any) { errors.push(e?.message?.slice(0, 80)); }
  }

  const pending = recipients.length - sent;
  return NextResponse.json({
    ok: sent > 0,
    sent,
    pending,
    total: recipients.length,
    errors: errors.slice(0, 3),
    note: missingColumn
      ? "Falta pegar ADD_WELCOME_SENT_AT_2026-07-21.sql en Supabase — por ahora no se puede recordar a quién ya se le mandó, así que si volvés a apretar el botón se reenvía a todos."
      : undefined,
  });
}
