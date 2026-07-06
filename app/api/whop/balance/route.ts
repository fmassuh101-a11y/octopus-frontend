import { NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { shield } from '@/lib/shield'

/**
 * Ver balance de Octopus
 * GET /api/whop/balance
 */
export async function GET(_req: Request) {
  const _blocked = shield(_req as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  try {
    if (!OCTOPUS_COMPANY_ID) {
      return NextResponse.json({
        error: "WHOP_OCTOPUS_COMPANY_ID no configurada",
      }, { status: 500 });
    }

    // Obtener información de la compañía incluyendo balance
    const company = await whopClient.companies.retrieve(OCTOPUS_COMPANY_ID);

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        title: company.title,
        route: company.route,
      },
      // El balance se obtiene de otra forma - por ahora mostramos la info
      message: "Conexión exitosa. Para ver balance real, usar dashboard de Whop.",
    });

  } catch (error) {
    console.error("[Whop Balance] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 });
  }
}
