import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * POST /api/whop/setup-creator
 * Body: { userId, email, fullName, existingCompanyId? }
 *
 * Creates a Whop sub-company for the creator and returns KYC link
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Setup Creator] Starting...");

    // Get data from body
    const body = await request.json();
    const { userId, email, fullName, existingCompanyId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    console.log("[Setup Creator] Processing:", { userId, email, hasExisting: !!existingCompanyId });

    // If already has whop_company_id, just generate KYC link
    if (existingCompanyId) {
      console.log("[Setup Creator] Already has company, generating payouts portal link...");
      try {
        const accountLink = await whopClient.accountLinks.create({
          company_id: existingCompanyId,
          use_case: "payouts_portal",
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet`,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/creator/wallet/setup`,
        });

        return NextResponse.json({
          success: true,
          alreadySetup: false,
          kycUrl: accountLink.url,
          companyId: existingCompanyId,
        });
      } catch (err) {
        console.error("[Setup Creator] Error generating KYC for existing:", err);
        // Company might not exist in Whop, create a new one
      }
    }

    // Create new sub-company in Whop with minimal required fields
    console.log("[Setup Creator] Creating new sub-company...");
    const uniqueTitle = fullName || `Creator_${userId.slice(0, 8)}`;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app';

    let company;
    try {
      company = await whopClient.companies.create({
        email: email || `user_${userId}@octopus.app`,
        parent_company_id: OCTOPUS_COMPANY_ID,
        title: uniqueTitle,
        metadata: {
          octopus_user_id: userId,
          type: "creator",
        },
      });
    } catch (createError: any) {
      // If company already exists, try to find it by listing child companies
      if (createError?.message?.includes('same name') || createError?.error?.message?.includes('same name')) {
        console.log("[Setup Creator] Company name conflict, trying with timestamp...");
        company = await whopClient.companies.create({
          email: email || `user_${userId}@octopus.app`,
          parent_company_id: OCTOPUS_COMPANY_ID,
          title: `${uniqueTitle}_${Date.now()}`,
          metadata: {
            octopus_user_id: userId,
            type: "creator",
          },
        });
      } else {
        throw createError;
      }
    }

    console.log("[Setup Creator] Company created:", company.id);

    // Save whop_company_id to profiles table using service role (bypasses RLS)
    if (SUPABASE_SERVICE_KEY) {
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ whop_company_id: company.id })
        }
      );

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error("[Setup Creator] Failed to save whop_company_id:", updateRes.status, errorText);
      } else {
        console.log("[Setup Creator] Saved whop_company_id to profiles table");
      }
    } else {
      console.warn("[Setup Creator] No service key, cannot update database");
    }

    // Generate payouts portal link (includes KYC but simpler flow)
    console.log("[Setup Creator] Generating payouts portal link...");
    const accountLink = await whopClient.accountLinks.create({
      company_id: company.id,
      use_case: "payouts_portal",
      return_url: `${APP_URL}/creator/wallet`,
      refresh_url: `${APP_URL}/creator/wallet/setup`,
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
