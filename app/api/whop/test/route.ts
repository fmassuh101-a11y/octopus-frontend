import { NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID, WHOP_ENVIRONMENT } from "@/lib/whop";

/**
 * Test endpoint para verificar conexión con Whop
 * GET /api/whop/test
 */
export async function GET() {
  try {
    // Verificar que tenemos las credenciales
    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "WHOP_API_KEY no configurada",
      }, { status: 500 });
    }

    if (!OCTOPUS_COMPANY_ID) {
      return NextResponse.json({
        success: false,
        error: "WHOP_OCTOPUS_COMPANY_ID no configurada",
      }, { status: 500 });
    }

    // Intentar obtener información de la compañía
    const company = await whopClient.companies.retrieve(OCTOPUS_COMPANY_ID);

    return NextResponse.json({
      success: true,
      message: "Conexión con Whop exitosa",
      environment: WHOP_ENVIRONMENT,
      company: {
        id: company.id,
        title: company.title,
        route: company.route,
      },
    });

  } catch (error) {
    console.error("[Whop Test] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      environment: WHOP_ENVIRONMENT,
    }, { status: 500 });
  }
}
