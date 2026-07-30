import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://octapiapp.com";

// Días que tiene la empresa para revisar antes de que la entrega se apruebe
// sola. Siete es lo que se le promete al creador en el correo de entrega.
const DIAS = 7;

/**
 * Aprobación automática por vencimiento.
 *
 * POR QUÉ EXISTE
 * Sin esto, un creador que entrega su contenido y se topa con una empresa que
 * no vuelve a entrar a la app NO COBRA NUNCA. No hay reclamo, no hay plazo, no
 * hay salida: el trabajo queda hecho y el pago colgado para siempre.
 *
 * Es lo único que hace que alguien se atreva a entregarle a una marca que no
 * conoce. Sin plazo, el creador asume todo el riesgo.
 *
 * CÓMO SE DISPARA
 * Se llama sola cuando el creador entra a ver sus entregas (así no depende de
 * que exista un cron), y además queda lista para que Vercel la llame por
 * horario cuando se configure. Es idempotente: si una entrega ya se aprobó, el
 * PATCH condicionado por estado no la vuelve a tocar.
 *
 * QUÉ NO HACE
 * No aprueba si la empresa no tiene saldo. Aprobar sin fondos generaría el
 * mismo pago fantasma que ya arreglamos en otro lado: entrega aprobada, aviso
 * de cobro, y plata que nunca se movió. En ese caso se deja pendiente y se le
 * avisa a la empresa que tiene que fondear.
 */
export async function POST(request: NextRequest) {
  if (!SERVICE_KEY) return NextResponse.json({ ok: false, error: "sin configurar" }, { status: 500 });

  // Si Vercel la llama por horario manda su propio secreto; si la llama la app
  // del creador, basta con que exista sesión. Cualquiera de las dos sirve: esta
  // ruta no expone datos, solo destraba pagos vencidos.
  const cronSecret = process.env.CRON_SECRET;
  const esCron = !!cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!esCron) {
    const { getAuthenticatedUser } = await import("@/lib/auth/apiAuth");
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };
  const limite = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Entregas que la empresa nunca revisó y ya cumplieron el plazo.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/content_deliveries` +
        `?status=eq.submitted&created_at=lt.${limite}` +
        `&select=id,title,creator_id,company_id,payment_amount&limit=50`,
      { headers: H }
    );
    const vencidas: any[] = res.ok ? await res.json() : [];
    if (!vencidas.length) return NextResponse.json({ ok: true, aprobadas: 0, revisadas: 0 });

    let aprobadas = 0;
    const sinFondos: string[] = [];

    for (const d of vencidas) {
      // Se reutiliza la ruta de aprobación en vez de repetir su lógica: ahí
      // vive la verificación de saldo real, el pago, los avisos y el claim
      // atómico contra el doble pago. Duplicar eso sería garantizar que las dos
      // copias se separen con el tiempo.
      const r = await fetch(`${APP}/api/deliveries/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": cronSecret || "" },
        body: JSON.stringify({ deliveryId: d.id, automatica: true }),
      }).catch(() => null);

      if (r?.ok) {
        aprobadas++;
      } else if (r?.status === 402) {
        // La empresa no tiene saldo. NO se aprueba: quedaría un pago fantasma.
        sinFondos.push(d.company_id);
      }
    }

    // A las empresas sin saldo se les avisa dentro de la app, una sola vez por
    // corrida, para que fondeen antes de que el creador se canse de esperar.
    for (const companyId of Array.from(new Set(sinFondos))) {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: companyId,
          type: "sin_fondos",
          title: "Tienes contenido por pagar",
          body: "Un creador entregó su contenido hace más de una semana y no tienes saldo para pagarle. Agrega fondos para liberarlo.",
          link: "/company/fondear",
        }),
      }).catch(() => {});
    }

    console.log("[AutoAprobar]", { revisadas: vencidas.length, aprobadas, sinFondos: sinFondos.length });
    return NextResponse.json({ ok: true, revisadas: vencidas.length, aprobadas, sinFondos: sinFondos.length });
  } catch (e: any) {
    console.error("[AutoAprobar] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "falló la revisión" }, { status: 500 });
  }
}
