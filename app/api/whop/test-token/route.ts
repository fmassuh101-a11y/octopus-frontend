import { NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";

/**
 * Endpoint para obtener un token de prueba SIN autenticación
 * Solo para testing del sandbox
 */
export async function POST() {
  try {
    if (!OCTOPUS_COMPANY_ID) {
      return NextResponse.json({
        error: "WHOP_OCTOPUS_COMPANY_ID no configurada",
      }, { status: 500 });
    }

    // Crear access token para Octopus (para pruebas)
    const accessToken = await whopClient.accessTokens.create({
      company_id: OCTOPUS_COMPANY_ID,
    });

    return NextResponse.json({
      success: true,
      accessToken: accessToken.token,
      companyId: OCTOPUS_COMPANY_ID,
    });

  } catch (error) {
    console.error("[Whop Test Token] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 });
  }
}
