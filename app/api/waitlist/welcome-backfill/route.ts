import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { buildWelcomeHtml, welcomeSubject } from "@/lib/waitlistEmail";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const ADMIN_EMAILS = ["fmassuh133@gmail.com"];
const FROM = process.env.RESEND_FROM || "Octapi <onboarding@resend.dev>";

/**
 * POST /api/waitlist/welcome-backfill — manda el email de bienvenida
 * (el mismo que reciben los nuevos registros automáticamente) a TODOS los
 * que ya estaban anotados de antes, con el texto correcto según su rol
 * (creador o empresa). Pensado para usarse UNA vez, a mano, desde el panel
 * de admin — no hay protección contra mandarlo dos veces a la misma
 * persona, así que el botón lo dispara Felipe cuando esté seguro.
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

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
  const rows: any[] = await (
    await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id,email,name,company_name,role&limit=2000`, { headers: H })
  ).json();

  const seen = new Set<string>();
  const recipients = (rows || [])
    .map((r) => ({
      id: String(r.id || ""),
      email: String(r.email || "").toLowerCase(),
      role: r.role === "company" ? "company" : "creator",
      name: r.role === "company" ? String(r.company_name || "") : String(r.name || ""),
    }))
    .filter((r) => r.id && r.email.includes("@") && !seen.has(r.email) && seen.add(r.email));
  if (!recipients.length) return NextResponse.json({ error: "No hay inscriptos para enviar" }, { status: 400 });

  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100).map((r) => ({
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
      if (res.ok) sent += batch.length;
      else errors.push((await res.text()).slice(0, 120));
    } catch (e: any) { errors.push(e?.message?.slice(0, 80)); }
  }

  return NextResponse.json({ ok: sent > 0, sent, total: recipients.length, errors: errors.slice(0, 3) });
}
