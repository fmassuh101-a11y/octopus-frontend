import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createKYCOnboardingLink, createPayoutsPortalLink } from "@/lib/whop";

/**
 * API para generar links de KYC y Portal de Payouts
 */

// GET: Obtener link de onboarding o payouts portal
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "onboarding" o "payouts"

    // Obtener whop_company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("whop_company_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.whop_company_id) {
      return NextResponse.json({
        error: "Primero debes crear tu cuenta de pagos",
        needsSetup: true
      }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let link;

    if (type === "onboarding") {
      // Link de KYC para verificación de identidad
      link = await createKYCOnboardingLink({
        creatorCompanyId: userData.whop_company_id,
        returnUrl: `${baseUrl}/creator/wallet?kyc=complete`,
        refreshUrl: `${baseUrl}/creator/wallet?kyc=refresh`,
      });
    } else if (type === "payouts") {
      // Link al portal de payouts (configurar métodos de retiro)
      link = await createPayoutsPortalLink({
        creatorCompanyId: userData.whop_company_id,
        returnUrl: `${baseUrl}/creator/wallet?payouts=configured`,
        refreshUrl: `${baseUrl}/creator/wallet?payouts=refresh`,
      });
    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    return NextResponse.json({
      url: link.url,
      type,
    });

  } catch (error) {
    console.error("[Whop KYC] Error:", error);
    return NextResponse.json(
      { error: "Error al generar link" },
      { status: 500 }
    );
  }
}
