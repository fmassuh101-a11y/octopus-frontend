import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  try {
    const payload = await request.json();
    const signature = request.headers.get("x-webhook-signature");

    // TODO: Validar firma del webhook
    // https://docs.whop.com/developer/guides/webhooks#validating-webhooks

    console.log("[Whop Webhook]", payload.event, payload.data?.id);

    const supabase = await createClient();

    switch (payload.event) {
      // ============================================
      // EVENTOS DE PAGOS
      // ============================================
      case "payment.succeeded": {
        const paymentData = payload.data;

        // Actualizar estado del job/contrato en nuestra DB
        if (paymentData.metadata?.job_id) {
          await supabase
            .from("jobs")
            .update({
              payment_status: "paid",
              whop_payment_id: paymentData.id,
              paid_at: new Date().toISOString(),
            })
            .eq("id", paymentData.metadata.job_id);

          // Notificar al creador
          // TODO: Implementar notificaciones
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
      case "withdrawal.completed": {
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

      case "withdrawal.failed": {
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
