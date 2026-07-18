import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";
import { SUPABASE_URL } from "@/lib/config/supabase";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_EMAILS = ["fmassuh133@gmail.com"];

// GET /api/waitlist/admin — lista completa de inscriptos (solo admin)
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
  const rows = await (
    await fetch(
      `${SUPABASE_URL}/rest/v1/waitlist?select=id,role,email,name,company_name,niche,experience,marketing_experience,referral_count,created_at&order=created_at.desc&limit=1000`,
      { headers: H }
    )
  ).json();

  return NextResponse.json({ ok: true, rows: Array.isArray(rows) ? rows : [] });
}
