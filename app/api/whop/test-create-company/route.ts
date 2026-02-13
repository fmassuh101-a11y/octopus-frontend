import { NextResponse } from "next/server";
import { createCreatorAccount, WHOP_ENVIRONMENT } from "@/lib/whop";

/**
 * Test: Crear una sub-cuenta de creador de prueba
 * POST /api/whop/test-create-company
 *
 * Esto NO cuesta dinero - solo crea una sub-company en Whop
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json({
        error: "name y email son requeridos",
      }, { status: 400 });
    }

    console.log(`[Test] Creando cuenta de creador: ${name} (${email})`);

    const company = await createCreatorAccount({
      name,
      email,
      userId: `test_${Date.now()}`, // ID de prueba
    });

    return NextResponse.json({
      success: true,
      environment: WHOP_ENVIRONMENT,
      message: "Cuenta de creador creada exitosamente",
      creator: {
        whop_company_id: company.id,
        title: company.title,
        route: company.route,
      },
    });

  } catch (error) {
    console.error("[Test Create Company] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      environment: WHOP_ENVIRONMENT,
    }, { status: 500 });
  }
}
