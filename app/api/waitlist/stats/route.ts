import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Contador público de la lista de espera (para la barra de meta en vivo).
// 100% real desde el 20 jul 2026 — antes tenía un "piso" sembrado para no
// verse vacío al promocionar; Felipe pidió sacarlo ahora que hay tráfico real.

export const revalidate = 0;

export async function GET() {
  try {
    const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, Prefer: "count=exact" };
    const count = async (role: string) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?role=eq.${role}&select=id&limit=1`, { headers: H });
      const range = r.headers.get("content-range") || "0/0";
      return parseInt(range.split("/")[1] || "0") || 0;
    };
    const [creators, companies] = await Promise.all([count("creator"), count("company")]);
    return NextResponse.json({ ok: true, creators, companies, goalCreators: 250, goalCompanies: 50 });
  } catch {
    return NextResponse.json({ ok: true, creators: 0, companies: 0, goalCreators: 250, goalCompanies: 50 });
  }
}
