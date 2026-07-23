import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { sendWelcomeEmail } from "@/lib/waitlistEmail";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAILS = ["fmassuh133@gmail.com"];

const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };

// Vercel corta las funciones a los 10s por default — con hasta 100
// destinatarios por tanda esto se pasa de sobra, así que se pide el máximo.
export const maxDuration = 60;

/**
 * POST /api/waitlist/welcome-backfill — manda el email de bienvenida
 * (el mismo que reciben los nuevos registros automáticamente) a los que
 * TODAVÍA no lo recibieron, con el texto correcto según su rol (creador o
 * empresa). Se puede apretar el botón varias veces sin duplicar: cada envío
 * exitoso marca welcome_sent_at, así que la próxima vez solo se manda a
 * quien falte — necesario porque el plan gratis de Resend tope 100/día.
 *
 * Uno por uno con /emails (NO con /emails/batch): se probó en vivo que el
 * endpoint de batch devuelve "API key is invalid" con la MISMA key que sí
 * manda bien uno por uno (confirmado: los emails automáticos de bienvenida
 * llegan perfecto, todos con status "Delivered" en Resend) — así que se usa
 * el camino que ya se demostró que funciona en vez de perder tiempo
 * averiguando por qué el batch de Resend rechaza esta cuenta.
 */
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 3 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  // limit opcional — para probar con un lote chico (ej. 50) antes de
  // mandarle a todos los pendientes de una.
  const body = await request.json().catch(() => ({}));
  const limit = Number(body?.limit) > 0 ? Math.floor(Number(body.limit)) : null;

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

  const totalPending = recipients.length;
  const toSend = limit ? recipients.slice(0, limit) : recipients;

  let sent = 0;
  let consecutiveFails = 0;
  const errors: string[] = [];
  for (const r of toSend) {
    const result = await sendWelcomeEmail({
      email: r.email,
      name: r.name,
      role: r.role as "creator" | "company",
      waitlistId: r.id,
    });
    if (result.ok) {
      consecutiveFails = 0;
      sent += 1;
      // marca a ESTA persona como enviada de una — si la función se corta a
      // mitad de camino (timeout, tope diario) el progreso ya hecho queda
      // guardado igual, no hay que repetir desde cero.
      if (!missingColumn) {
        await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${r.id}`, {
          method: "PATCH",
          headers: H,
          body: JSON.stringify({ welcome_sent_at: new Date().toISOString() }),
        }).catch(() => {});
      }
    } else if (result.error) {
      consecutiveFails += 1;
      errors.push(result.error);
      // "rate limit"/"tope diario" = se acabó la cuota del día — cortar acá
      // evita seguir gastando tiempo en pedidos que van a fallar todos
      // igual hasta que se reinicie el tope mañana. 5 fallos seguidos por
      // CUALQUIER otro motivo (ej. una key mal puesta) corta igual — no
      // tiene sentido intentar los 100+ restantes si los primeros 5 ya
      // fallaron todos por lo mismo.
      if (/rate.?limit|limit.*reach|too many/i.test(result.error) || consecutiveFails >= 5) break;
    }
  }

  const pending = totalPending - sent;
  return NextResponse.json({
    ok: sent > 0,
    sent,
    pending,
    total: totalPending,
    errors: errors.slice(0, 3),
    note: missingColumn
      ? "Falta pegar ADD_WELCOME_SENT_AT_2026-07-21.sql en Supabase — por ahora no se puede recordar a quién ya se le mandó, así que si volvés a apretar el botón se reenvía a todos."
      : undefined,
  });
}
