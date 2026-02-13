import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

/**
 * API para crear una sesión de payouts para componentes embebidos
 * El usuario necesita tener un whop_company_id configurado
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Whop Payout Session] Starting...");

    // Try to get token from Authorization header first (for client-side auth)
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      console.log("[Whop Payout Session] Using token from header");

      // Create a supabase client with the token
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
        console.log("[Whop Payout Session] User from header token:", userId);
      } else {
        console.log("[Whop Payout Session] Token invalid:", error?.message);
      }
    }

    // Fallback to server-side cookies
    if (!userId) {
      console.log("[Whop Payout Session] Trying server-side cookies...");
      const supabase = await createServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (user && !authError) {
        userId = user.id;
        console.log("[Whop Payout Session] User from cookies:", userId);
      } else {
        console.log("[Whop Payout Session] Cookie auth failed:", authError?.message);
      }
    }

    if (!userId) {
      console.log("[Whop Payout Session] No user found, returning 401");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener whop_company_id del usuario usando direct query
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("whop_company_id, role, email")
      .eq("id", userId)
      .single();

    console.log("[Whop Payout Session] User data:", {
      hasUser: !!userData,
      whopId: userData?.whop_company_id,
      role: userData?.role,
      userError: userError?.message
    });

    if (userError) {
      console.log("[Whop Payout Session] User query error:", userError);
      return NextResponse.json({
        error: "Error al obtener datos del usuario",
        debug: userError.message
      }, { status: 500 });
    }

    if (!userData?.whop_company_id) {
      console.log("[Whop Payout Session] No whop_company_id, needs setup");
      return NextResponse.json({
        error: "Primero debes configurar tu cuenta de pagos",
        needsSetup: true
      }, { status: 200 });
    }

    // Crear access token para la sesión de payouts
    console.log("[Whop Payout Session] Creating access token for:", userData.whop_company_id);
    const accessToken = await whopClient.accessTokens.create({
      company_id: userData.whop_company_id,
    });

    console.log("[Whop Payout Session] Success, returning companyId");
    return NextResponse.json({
      success: true,
      accessToken: accessToken.token,
      companyId: userData.whop_company_id,
    });

  } catch (error) {
    console.error("[Whop Payout Session] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear sesión de pagos" },
      { status: 500 }
    );
  }
}
