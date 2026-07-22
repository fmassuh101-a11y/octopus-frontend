import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" };

// El tipo de cuenta (nueva/dedicada vs. personal) se elige al firmar, pero el
// creador puede haber firmado antes de que existiera esta opción, o haberse
// equivocado — se puede cambiar después sin tener que rehacer todo el
// contrato. Cambia el acceso de la empresa al toque: "nueva" muestra toda la
// cuenta conectada, "personal" la limita a solo los videos compartidos
// puntualmente (ver contract_video_shares).
export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 20 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ error: "Config del servidor incompleta" }, { status: 500 });

  const { contractId, accountType } = await request.json().catch(() => ({}));
  if (!contractId || (accountType !== "new" && accountType !== "personal")) {
    return NextResponse.json({ error: "Falta el contrato o el tipo de cuenta" }, { status: 400 });
  }

  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${contractId}&select=id,creator_id`, { headers: H });
  const [contract] = cRes.ok ? await cRes.json() : [];
  if (!contract || contract.creator_id !== user.id) {
    return NextResponse.json({ error: "No autorizado para este contrato" }, { status: 403 });
  }

  const hrRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?contract_id=eq.${contractId}&select=*`, { headers: H });
  const [hr] = hrRes.ok ? await hrRes.json() : [];
  if (!hr) return NextResponse.json({ error: "No hay handles enviados para este contrato" }, { status: 404 });

  const updatedHandles = (Array.isArray(hr.handles) ? hr.handles : []).map((h: any) => ({ ...h, accountType }));

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/handle_requests?id=eq.${hr.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ handles: updatedHandles }),
  });
  if (!patchRes.ok) {
    return NextResponse.json({ error: "No se pudo actualizar el tipo de cuenta" }, { status: 500 });
  }

  const [saved] = await patchRes.json();
  return NextResponse.json({ ok: true, handleRequest: saved });
}
