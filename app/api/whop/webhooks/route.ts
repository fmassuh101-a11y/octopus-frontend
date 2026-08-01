import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { shieldAsync } from '@/lib/shield'

/**
 * Webhook handler para eventos de Whop
 * Documentación: https://docs.whop.com/developer/guides/webhooks
 *
 * Eventos importantes:
 * - payment.succeeded: Pago completado
 * - payment.failed: Pago fallido
 * - withdrawal.completed: Retiro completado
 * - withdrawal.failed: Retiro fallido
 */

export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  try {
    // ── VERIFICACIÓN DE FIRMA ────────────────────────────────────────────
    //
    // ⚠️ ESTO ESTABA MAL Y DEJABA LOS WEBHOOKS MUERTOS.
    //
    // Antes se calculaba un HMAC-SHA256 en hexadecimal sobre el cuerpo, leyendo
    // una cabecera "x-webhook-signature". Whop no usa nada de eso: usa el
    // estándar `standardwebhooks`, con las cabeceras webhook-id,
    // webhook-timestamp y webhook-signature, firma en base64 con prefijo "v1,"
    // calculada sobre `id.timestamp.cuerpo`, y el secreto en base64 detrás de
    // "whsec_".
    //
    // O sea: se leía una cabecera que no existe, sobre un contenido distinto,
    // en otro formato. Fallaba cerrado —nadie podía forjar un evento, eso
    // estuvo bien— pero RECHAZABA TODOS LOS AVISOS REALES con 401.
    //
    // La consecuencia concreta: si una empresa depositaba y cerraba la pestaña,
    // la plata quedaba en Whop y $0 en la app, porque el aviso que debía
    // acreditarla nunca se procesaba.
    //
    // Ahora se usa webhooks.unwrap() del propio SDK, que hace la verificación
    // correcta —incluida la ventana de tiempo contra reenvíos— y devuelve el
    // evento ya validado.
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[Whop Webhook] WHOP_WEBHOOK_SECRET no configurado — webhook rechazado");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    let payload: any;
    try {
      const { whopClient } = await import("@/lib/whop");
      payload = (whopClient as any).webhooks.unwrap(rawBody, { headers, key: secret });
    } catch (e: any) {
      console.error("[Whop Webhook] firma inválida:", e?.message?.slice(0, 150));
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // El envelope de Whop trae `type`, no `event`. Con `event` todo caía al
    // default aunque la firma pasara.
    const evento: string = payload?.type || payload?.event || "";
    console.log("[Whop Webhook]", evento, payload?.data?.id);

    // ── IDEMPOTENCIA ─────────────────────────────────────────────────────
    // Whop reintenta por diseño. Sin esto, un reintento duplicaba filas en
    // payouts, withdrawals y company_topups. El webhook-id es único por evento.
    const eventoId = headers["webhook-id"] || payload?.id || null;
    if (eventoId) {
      const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cnsyrgurwtufbynwrxjt.supabase.co";
      if (svc) {
        const yaVisto = await fetch(
          `${SB}/rest/v1/webhook_events?event_id=eq.${encodeURIComponent(eventoId)}&select=event_id&limit=1`,
          { headers: { Authorization: `Bearer ${svc}`, apikey: svc } }
        ).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        if (Array.isArray(yaVisto) && yaVisto.length) {
          console.log("[Whop Webhook] repetido, se ignora:", eventoId);
          return NextResponse.json({ received: true, repetido: true });
        }
        // Se registra ANTES de procesar: si dos llegan a la vez, la clave
        // única de la tabla hace que solo una siga.
        await fetch(`${SB}/rest/v1/webhook_events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${svc}`,
            apikey: svc,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ event_id: eventoId, type: evento }),
        }).catch(() => {});
      }
    }

    const supabase = await createClient();

    switch (evento) {
      // ============================================
      // EVENTOS DE PAGOS
      // ============================================
      // ── UN PAGO ENTRÓ ────────────────────────────────────────────────
      //
      // Acá es donde se acredita un depósito. NO existe "topup.completed" en
      // Whop —lo comprobé contra la lista de eventos del SDK— así que un
      // depósito llega como payment.succeeded y nada más.
      //
      // Por eso hasta ahora el depósito solo se acreditaba si el navegador
      // volvía a la app: la verificación vivía únicamente en el polling del
      // cliente. Si la empresa pagaba y cerraba la pestaña, la plata quedaba en
      // Whop y $0 en la app.
      //
      // (El bloque anterior actualizaba una tabla `jobs` que no existe en este
      // proyecto —la real es `gigs`— y tenía un TODO sin implementar.)
      case "payment.succeeded": {
        const d: any = payload?.data || {};
        const userId = d?.metadata?.octopus_user_id || d?.checkout_configuration?.metadata?.octopus_user_id;
        const monto = Number(d?.total ?? d?.amount);

        if (!userId || !Number.isFinite(monto) || monto <= 0) {
          console.log("[Whop Webhook] pago sin usuario o sin monto, se ignora:", d?.id);
          break;
        }

        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cnsyrgurwtufbynwrxjt.supabase.co";
        if (!svc) break;

        // La RPC es idempotente por el id del pago: si el navegador ya lo
        // acreditó al volver, esto no lo suma dos veces.
        const r = await fetch(`${SB}/rest/v1/rpc/oct_apply_topup`, {
          method: "POST",
          headers: { Authorization: `Bearer ${svc}`, apikey: svc, "Content-Type": "application/json" },
          body: JSON.stringify({
            p_user: userId,
            p_whop_payment_id: String(d.id),
            p_base: monto,
            p_fee: 0,
            p_total: monto,
          }),
        });
        if (!r.ok) {
          console.error("[Whop Webhook] no se pudo acreditar el depósito:", d?.id, r.status);
        } else {
          console.log("[Whop Webhook] depósito acreditado:", d?.id, monto);
        }
        break;
      }

      case "payment.failed": {
        const paymentData = payload.data;

        if (paymentData.metadata?.job_id) {
          await supabase
            .from("jobs")
            .update({
              payment_status: "failed",
              payment_error: paymentData.error_message || "Payment failed",
            })
            .eq("id", paymentData.metadata.job_id);
        }
        break;
      }

      // ============================================
      // EVENTOS DE TRANSFERS (Pagos a creadores)
      // ============================================
      // "transfer.completed" y "transfer.failed" NO existen en Whop. Se dejan
      // los nombres reales para que el día que se agreguen no haya que
      // adivinar; hoy simplemente no llegan.
      case "transfer.completed": {
        const transferData = payload.data;

        // Registrar payout exitoso
        await supabase.from("payouts").insert({
          whop_transfer_id: transferData.id,
          job_id: transferData.metadata?.job_id,
          amount: transferData.amount,
          currency: transferData.currency,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
        break;
      }

      case "transfer.failed": {
        const transferData = payload.data;

        await supabase.from("payouts").insert({
          whop_transfer_id: transferData.id,
          job_id: transferData.metadata?.job_id,
          amount: transferData.amount,
          currency: transferData.currency,
          status: "failed",
          error_message: transferData.error_message,
        });
        break;
      }

      // ============================================
      // EVENTOS DE WITHDRAWALS (Creador retira)
      // ============================================
      case "withdrawal.updated": {
        const withdrawalData = payload.data;

        await supabase.from("withdrawals").insert({
          whop_withdrawal_id: withdrawalData.id,
          creator_company_id: withdrawalData.company_id,
          amount: withdrawalData.amount,
          currency: withdrawalData.currency,
          payout_method: withdrawalData.payout_method_id,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
        break;
      }

      case "withdrawal.created": {
        const withdrawalData = payload.data;

        await supabase.from("withdrawals").insert({
          whop_withdrawal_id: withdrawalData.id,
          creator_company_id: withdrawalData.company_id,
          amount: withdrawalData.amount,
          currency: withdrawalData.currency,
          status: "failed",
          error_message: withdrawalData.error_message,
        });
        break;
      }

      // ============================================
      // EVENTOS DE TOP-UPS (Empresa agrega fondos)
      // ============================================
      // Tampoco existe "topup.completed": un depósito llega como
      // payment.succeeded, que se maneja más arriba.
      case "topup.completed": {
        const topupData = payload.data;

        await supabase.from("company_topups").insert({
          whop_topup_id: topupData.id,
          company_id: topupData.company_id,
          amount: topupData.amount,
          currency: topupData.currency,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
        break;
      }

      case "topup.failed": {
        const topupData = payload.data;

        await supabase.from("company_topups").insert({
          whop_topup_id: topupData.id,
          company_id: topupData.company_id,
          amount: topupData.amount,
          status: "failed",
          error_message: topupData.error_message,
        });
        break;
      }

      // ============================================
      // TARJETA GUARDADA (checkout en modo "setup")
      // ============================================
      // Acá llega el payment_method_id (payt_xxx) que hace falta para poder
      // depositar por Topup, que no cobra comisión — a diferencia del checkout
      // normal, que cuesta 2,7% + $0,30. Se guarda contra el usuario que abrió
      // el formulario (viaja en la metadata que puso /api/whop/save-card).
      // ── LA PLATA DEL DEPÓSITO YA QUEDÓ DISPONIBLE ──────────────────────
      //
      // Un depósito con tarjeta NO queda disponible al instante: Whop lo deja
      // "pendiente" 1 a 4 días hábiles mientras liquida (confirmado por su
      // soporte; es retraso de liquidación estándar, no un problema de
      // verificación). Este aviso llega en el momento exacto en que el dinero
      // pasa a estar disponible, así la empresa se entera sola en vez de
      // entrar a mirar el saldo cada rato.
      case "ledger_account.funds_available": {
        const d: any = payload.data || {};
        const companyId = d?.company?.id || d?.company_id || d?.ledger_account?.company_id || null;
        const saldos = Array.isArray(d?.balances)
          ? d.balances.find((b: any) => String(b?.currency).toLowerCase() === "usd") || d.balances[0]
          : null;
        const disponible = Number(saldos?.balance) || 0;

        console.log("[Whop Webhook] fondos disponibles:", companyId, disponible);

        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        if (!svc || !companyId) break;
        const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cnsyrgurwtufbynwrxjt.supabase.co";
        const H = { Authorization: `Bearer ${svc}`, apikey: svc, "Content-Type": "application/json" };

        // De la cuenta de Whop al dueño. Es la única forma de saber a quién
        // avisarle: el aviso viene con la cuenta, no con el usuario.
        const perfRes = await fetch(
          `${SB}/rest/v1/profiles?whop_company_id=eq.${companyId}&select=user_id,user_type`,
          { headers: H }
        );
        const perfil = (perfRes.ok ? await perfRes.json() : [])[0];
        if (!perfil?.user_id) {
          console.error("[Whop Webhook] no se encontró de quién es la cuenta:", companyId);
          break;
        }

        await fetch(`${SB}/rest/v1/notifications`, {
          method: "POST",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({
            user_id: perfil.user_id,
            type: "funds_available",
            title: "Tu dinero ya está disponible",
            body: `Se liberaron $${disponible.toFixed(2)}. Ya puedes pagarle a tus creadores.`,
            link: "/company/wallet",
          }),
        }).catch((e) => console.error("[Whop Webhook] no se pudo avisar:", e?.message));

        break;
      }

      case "setup_intent.succeeded": {
        const d: any = payload.data || {};
        const userId = d?.metadata?.octopus_user_id || d?.checkout_configuration?.metadata?.octopus_user_id;
        const pmId =
          d?.payment_method?.id || d?.payment_method_id || d?.payment_method || null;

        if (!userId || !pmId) {
          console.error("[Whop Webhook] setup_intent sin usuario o sin tarjeta:", JSON.stringify(d)?.slice(0, 300));
          break;
        }

        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        if (!svc) {
          console.error("[Whop Webhook] sin service key, no se puede guardar la tarjeta");
          break;
        }
        const upd = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cnsyrgurwtufbynwrxjt.supabase.co"}/rest/v1/profiles?user_id=eq.${userId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${svc}`,
              apikey: svc,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ whop_payment_method_id: pmId }),
          }
        );
        if (!upd.ok) {
          console.error("[Whop Webhook] no se pudo guardar la tarjeta:", upd.status, await upd.text().catch(() => ""));
        } else {
          console.log("[Whop Webhook] tarjeta guardada para", userId);
        }
        break;
      }

      default:
        console.log("[Whop Webhook] Evento no manejado:", payload.event);
    }

    // IMPORTANTE: Siempre responder 200 para que Whop no reintente
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("[Whop Webhook] Error:", error);
    // Aún así responder 200 para evitar reintentos
    return NextResponse.json({ received: true, error: "Internal error" }, { status: 200 });
  }
}
