import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { whopClient } from "@/lib/whop";

/**
 * API para crear una sesión de payouts para componentes embebidos
 * El usuario necesita tener un whop_company_id configurado
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener whop_company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("whop_company_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.whop_company_id) {
      return NextResponse.json({
        error: "Primero debes configurar tu cuenta de pagos",
        needsSetup: true
      }, { status: 400 });
    }

    // Crear access token para la sesión de payouts
    const accessToken = await whopClient.accessTokens.create({
      company_id: userData.whop_company_id,
    });

    return NextResponse.json({
      success: true,
      accessToken: accessToken.token,
      companyId: userData.whop_company_id,
    });

  } catch (error) {
    console.error("[Whop Payout Session] Error:", error);
    return NextResponse.json(
      { error: "Error al crear sesión de pagos" },
      { status: 500 }
    );
  }
}
