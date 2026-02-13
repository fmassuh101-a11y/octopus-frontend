import { NextRequest, NextResponse } from "next/server";
import { whopClient } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

/**
 * POST /api/whop/payout-session
 * Body: { userId: string }
 * Headers: Authorization: Bearer <token>
 *
 * Returns: { companyId, needsSetup } or error
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Whop Payout Session] Starting...");

    // Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("[Whop Payout Session] No auth header");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Get userId from body
    let userId: string;
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      console.log("[Whop Payout Session] Invalid body");
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    console.log("[Whop Payout Session] Checking user:", userId);

    // Query user data using Supabase REST API (same pattern as dashboard)
    const userRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,email,whop_company_id,role`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      }
    );

    console.log("[Whop Payout Session] User query status:", userRes.status);

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      }
      return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
    }

    const users = await userRes.json();
    console.log("[Whop Payout Session] Users found:", users.length);

    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const userData = users[0];
    console.log("[Whop Payout Session] User data:", {
      id: userData.id,
      whop_company_id: userData.whop_company_id,
      role: userData.role
    });

    // Check if user needs setup
    if (!userData.whop_company_id) {
      console.log("[Whop Payout Session] No whop_company_id, needs setup");
      return NextResponse.json({
        needsSetup: true,
        message: "Necesitas configurar tu cuenta de pagos"
      });
    }

    // Return the companyId - Whop components will handle the rest
    console.log("[Whop Payout Session] Success, companyId:", userData.whop_company_id);
    return NextResponse.json({
      success: true,
      companyId: userData.whop_company_id
    });

  } catch (error) {
    console.error("[Whop Payout Session] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}
