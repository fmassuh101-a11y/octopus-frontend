import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";

/**
 * POST /api/whop/setup-creator
 * Crea una sub-company en Whop para el creador y genera link de KYC
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, whop_company_id")
      .eq("id", user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
    }

    // 3. Si ya tiene whop_company_id, verificar si necesita KYC
    if (userData.whop_company_id) {
      // Generar link de KYC por si no lo ha completado
      const accountLink = await whopClient.accountLinks.create({
        company_id: userData.whop_company_id,
        use_case: "account_onboarding",
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet`,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet/setup`,
      });

      return NextResponse.json({
        success: true,
        alreadySetup: false,
        kycUrl: accountLink.url,
        companyId: userData.whop_company_id,
      });
    }

    // 4. Crear sub-company en Whop
    const company = await whopClient.companies.create({
      email: userData.email || user.email || `user_${user.id}@octopus.app`,
      parent_company_id: OCTOPUS_COMPANY_ID,
      title: userData.full_name || `Creator ${user.id.slice(0, 8)}`,
      metadata: {
        octopus_user_id: user.id,
        type: "creator",
      },
    });

    // 5. Guardar whop_company_id en la base de datos
    const { error: updateError } = await supabase
      .from("users")
      .update({ whop_company_id: company.id })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Setup Creator] Error guardando whop_company_id:", updateError);
      // Continuar aunque falle - el ID ya está creado en Whop
    }

    // 6. Crear link de KYC
    const accountLink = await whopClient.accountLinks.create({
      company_id: company.id,
      use_case: "account_onboarding",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet`,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet/setup`,
    });

    return NextResponse.json({
      success: true,
      companyId: company.id,
      kycUrl: accountLink.url,
    });

  } catch (error) {
    console.error("[Setup Creator] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Error al configurar cuenta",
    }, { status: 500 });
  }
}
