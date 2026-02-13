import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transferToCreator, calculatePaymentBreakdown } from "@/lib/whop";

/**
 * API para transferir pagos a creadores
 * Empresa aprueba trabajo -> Sistema transfiere al creador
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, amount } = body;

    if (!jobId || !amount) {
      return NextResponse.json({
        error: "jobId y amount son requeridos"
      }, { status: 400 });
    }

    // Verificar que el usuario es la empresa del job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        creator:creator_id (
          id,
          name,
          whop_company_id
        ),
        company:company_id (
          id,
          whop_company_id
        )
      `)
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
    }

    // Verificar que el usuario es la empresa
    if (job.company_id !== user.id) {
      return NextResponse.json({
        error: "Solo la empresa puede aprobar pagos"
      }, { status: 403 });
    }

    // Verificar que el creador tiene cuenta Whop configurada
    if (!job.creator?.whop_company_id) {
      return NextResponse.json({
        error: "El creador no ha configurado su cuenta de pagos"
      }, { status: 400 });
    }

    // Verificar que el job está en estado aprobado
    if (job.status !== "approved" && job.status !== "completed") {
      return NextResponse.json({
        error: "El trabajo debe estar aprobado antes de pagar"
      }, { status: 400 });
    }

    // Verificar que no se ha pagado ya
    if (job.payment_status === "paid") {
      return NextResponse.json({
        error: "Este trabajo ya fue pagado"
      }, { status: 400 });
    }

    // Calcular desglose
    const breakdown = calculatePaymentBreakdown(amount);

    // Realizar transferencia
    const result = await transferToCreator({
      creatorCompanyId: job.creator.whop_company_id,
      amount: amount,
      jobId: jobId,
      metadata: {
        job_title: job.title || "",
        creator_name: job.creator.name || "",
      },
    });

    // Actualizar estado del job
    await supabase
      .from("jobs")
      .update({
        payment_status: "processing",
        whop_transfer_id: result.transfer.id,
        payment_initiated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Registrar el payout
    await supabase.from("payouts").insert({
      job_id: jobId,
      creator_id: job.creator_id,
      company_id: job.company_id,
      whop_transfer_id: result.transfer.id,
      amount: result.originalAmount,
      fee: result.fee,
      creator_amount: result.creatorAmount,
      currency: "usd",
      status: "processing",
    });

    return NextResponse.json({
      success: true,
      transfer_id: result.transfer.id,
      breakdown: {
        total: result.originalAmount,
        octopus_fee: result.fee,
        creator_receives: result.creatorAmount,
      },
      message: `Pago de $${result.creatorAmount} enviado al creador`,
    });

  } catch (error) {
    console.error("[Whop Transfers] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar el pago" },
      { status: 500 }
    );
  }
}

// GET: Ver desglose de un pago antes de realizarlo
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const amount = parseFloat(searchParams.get("amount") || "0");

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount inválido" }, { status: 400 });
  }

  const breakdown = calculatePaymentBreakdown(amount);

  return NextResponse.json({
    amount,
    breakdown,
    message: `El creador recibirá $${breakdown.creatorReceives} después de la comisión de 7%`,
  });
}
