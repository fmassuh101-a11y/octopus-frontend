import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { shieldAsync } from "@/lib/shield";

// LISTA DE ESPERA — anotarse (público, sin sesión). Escribe con la service key
// desde el server; la tabla tiene RLS cerrado así que nadie puede leerla del cliente.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const sb = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 15 });
  if (blocked) return blocked;

  try {
    if (!SERVICE_KEY) return NextResponse.json({ error: "Config incompleta" }, { status: 500 });
    const body = await request.json().catch(() => ({}));

    const role = body.role === "company" ? "company" : body.role === "creator" ? "creator" : "";
    const email = clean(body.email).toLowerCase();
    if (!role) return NextResponse.json({ error: "Elegí creador o empresa" }, { status: 400 });
    if (!EMAIL_RX.test(email)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

    // si ya estaba anotado, devolvemos su mismo link (no duplicamos)
    const dupRes = await sb(`waitlist?email=eq.${encodeURIComponent(email)}&select=id,referral_count&limit=1`);
    const dup = dupRes.ok ? await dupRes.json() : [];
    if (Array.isArray(dup) && dup[0]?.id) {
      return NextResponse.json({ ok: true, id: dup[0].id, referrals: dup[0].referral_count || 0, already: true });
    }

    const row: Record<string, unknown> = { role, email };
    if (role === "creator") {
      row.name = clean(body.name);
      row.experience = ["si", "mas_o_menos", "empezando", "no"].includes(body.experience) ? body.experience : null;
      if (!row.name) return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });
    } else {
      row.company_name = clean(body.companyName);
      row.niche = clean(body.niche);
      row.marketing_experience = ["si", "no", "algo"].includes(body.marketingExperience) ? body.marketingExperience : null;
      if (!row.company_name) return NextResponse.json({ error: "Escribe el nombre de tu empresa" }, { status: 400 });
    }
    const country = clean(body.country, 60);
    if (country) row.country = country;
    const source = ["tiktok", "instagram", "recomendacion", "google", "otro"].includes(body.source) ? body.source : "";
    if (source) row.source = source;
    const message = clean(body.message, 500);
    if (!message) return NextResponse.json({ error: "Cuéntanos algo antes de unirte" }, { status: 400 });
    row.message = message;

    // referido: viene como ?ref=<id> en el link de invitación
    const ref = clean(body.ref, 40);
    if (UUID_RX.test(ref)) row.referred_by = ref;

    // columnas opcionales nuevas: si alguna todavía no existe en la base
    // (falta pegar el SQL correspondiente), reintentamos sin las opcionales —
    // el registro NUNCA debe fallar por esto, solo se pierde ese dato puntual.
    let ins = await sb("waitlist?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!ins.ok) {
      const errText = await ins.text();
      if (/column .* does not exist/i.test(errText) || /PGRST204/.test(errText)) {
        delete row.country; delete row.source; delete row.message;
        ins = await sb("waitlist?select=id", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(row),
        });
      } else {
        console.error("[Waitlist] insert:", ins.status, errText.slice(0, 200));
        return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
      }
    }
    if (!ins.ok) {
      console.error("[Waitlist] insert:", ins.status, (await ins.text()).slice(0, 200));
      return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
    }
    const created = (await ins.json())?.[0];

    // sumarle el referido a quien invitó (atómico, no bloquea la respuesta)
    if (row.referred_by) {
      sb("rpc/oct_waitlist_ref", { method: "POST", body: JSON.stringify({ p_ref: row.referred_by }) }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: created?.id, referrals: 0 });
  } catch (e: any) {
    console.error("[Waitlist] error:", e?.message || e);
    return NextResponse.json({ error: "No se pudo guardar. Probá de nuevo." }, { status: 500 });
  }
}

// GET ?id=<uuid> → cuántos invitados lleva (para refrescar el contador)
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!UUID_RX.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const res = await sb(`waitlist?id=eq.${id}&select=referral_count&limit=1`);
  const rows = res.ok ? await res.json() : [];
  return NextResponse.json({ ok: true, referrals: rows?.[0]?.referral_count || 0 });
}
