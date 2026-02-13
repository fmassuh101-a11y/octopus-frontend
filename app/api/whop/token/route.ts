import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

/**
 * GET /api/whop/token?companyId=xxx
 * Genera un access token para los componentes embebidos
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId requerido" }, { status: 400 });
    }

    const tokenResponse = await whopClient.accessTokens.create({
      company_id: companyId,
    });

    return NextResponse.json({ token: tokenResponse.token });
  } catch (error) {
    console.error("[Whop Token] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar token" },
      { status: 500 }
    );
  }
}
