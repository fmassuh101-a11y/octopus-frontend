import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

/**
 * POST /api/whop/setup-creator
 * Crea una sub-company en Whop para el creador y genera link de KYC
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Setup Creator] Starting...");

    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      console.log("[Setup Creator] Using token from header");

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
        userEmail = user.email || null;
        console.log("[Setup Creator] User from header:", userId);
      }
    }

    // Fallback to server-side cookies
    if (!userId) {
      const supabase = await createServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (user && !authError) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Obtener datos del usuario
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, whop_company_id")
      .eq("id", userId)
      .single();

    if (userError) {
      console.log("[Setup Creator] User query error:", userError);
      return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
    }

    // 3. Si ya tiene whop_company_id, verificar si necesita KYC
    if (userData.whop_company_id) {
      console.log("[Setup Creator] Already has whop_company_id:", userData.whop_company_id);
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
    console.log("[Setup Creator] Creating new sub-company...");
    const company = await whopClient.companies.create({
      email: userData.email || userEmail || `user_${userId}@octopus.app`,
      parent_company_id: OCTOPUS_COMPANY_ID,
      title: userData.full_name || `Creator ${userId.slice(0, 8)}`,
      metadata: {
        octopus_user_id: userId,
        type: "creator",
      },
    });
    console.log("[Setup Creator] Company created:", company.id);

    // 5. Guardar whop_company_id en la base de datos
    const { error: updateError } = await supabase
      .from("users")
      .update({ whop_company_id: company.id })
      .eq("id", userId);

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
