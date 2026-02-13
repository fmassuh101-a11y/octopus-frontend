import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

/**
 * POST /api/whop/setup-creator
 * Body: { userId: string }
 * Headers: Authorization: Bearer <token>
 *
 * Crea una sub-company en Whop para el creador y genera link de KYC
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Setup Creator] Starting...");

    // Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Get userId from body
    let userId: string;
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    console.log("[Setup Creator] User ID:", userId);

    // Get user data from Supabase
    const userRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,email,full_name,whop_company_id`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      }
    );

    if (!userRes.ok) {
      console.log("[Setup Creator] User query failed:", userRes.status);
      return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
    }

    const users = await userRes.json();
    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const userData = users[0];
    console.log("[Setup Creator] User data:", {
      id: userData.id,
      email: userData.email,
      whop_company_id: userData.whop_company_id
    });

    // If already has whop_company_id, just generate KYC link
    if (userData.whop_company_id) {
      console.log("[Setup Creator] Already has company, generating KYC link...");
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

    // Create new sub-company in Whop
    console.log("[Setup Creator] Creating new sub-company...");
    const company = await whopClient.companies.create({
      email: userData.email || `user_${userId}@octopus.app`,
      parent_company_id: OCTOPUS_COMPANY_ID,
      title: userData.full_name || `Creator ${userId.slice(0, 8)}`,
      metadata: {
        octopus_user_id: userId,
        type: "creator",
      },
    });

    console.log("[Setup Creator] Company created:", company.id);

    // Save whop_company_id to database
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ whop_company_id: company.id })
      }
    );

    if (!updateRes.ok) {
      console.error("[Setup Creator] Failed to save whop_company_id:", updateRes.status);
      // Continue anyway - company was created in Whop
    } else {
      console.log("[Setup Creator] Saved whop_company_id to database");
    }

    // Generate KYC link
    console.log("[Setup Creator] Generating KYC link...");
    const accountLink = await whopClient.accountLinks.create({
      company_id: company.id,
      use_case: "account_onboarding",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet`,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet/setup`,
    });

    console.log("[Setup Creator] KYC link generated");

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
