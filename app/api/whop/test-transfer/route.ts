import { NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, OCTOPUS_FEE_PERCENT } from "@/lib/whop";

/**
 * Simular transferencia a un creador de prueba
 * POST /api/whop/test-transfer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount = 100, creatorCompanyId } = body;

    if (!OCTOPUS_COMPANY_ID) {
      return NextResponse.json({
        error: "WHOP_OCTOPUS_COMPANY_ID no configurada",
      }, { status: 500 });
    }

    if (!creatorCompanyId) {
      return NextResponse.json({
        error: "creatorCompanyId es requerido",
        hint: "Primero crea un creador de prueba y usa su whop_company_id",
      }, { status: 400 });
    }

    const targetCreatorId = creatorCompanyId;

    // Calcular comisión
    const fee = amount * OCTOPUS_FEE_PERCENT;
    const creatorAmount = amount - fee;

    // Intentar crear la transferencia
    const transfer = await whopClient.transfers.create({
      amount: creatorAmount,
      currency: "usd",
      origin_id: OCTOPUS_COMPANY_ID,
      destination_id: targetCreatorId,
      idempotence_key: `test_transfer_${Date.now()}`,
      metadata: {
        type: "test",
        original_amount: String(amount),
        octopus_fee: String(fee),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transferencia simulada exitosamente",
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
      },
      breakdown: {
        originalAmount: amount,
        octopusFee: fee,
        octopusFeePercent: `${OCTOPUS_FEE_PERCENT * 100}%`,
        creatorReceives: creatorAmount,
      },
    });

  } catch (error) {
    console.error("[Whop Test Transfer] Error:", error);

    // Si el error es por fondos insuficientes, dar mensaje claro
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json({
      success: false,
      error: errorMessage,
      hint: errorMessage.includes("insufficient")
        ? "No hay fondos suficientes en la cuenta de Octopus. En sandbox, necesitas agregar fondos de prueba primero."
        : "Verifica que el creador de prueba existe y la API key es correcta.",
    }, { status: 500 });
  }
}
