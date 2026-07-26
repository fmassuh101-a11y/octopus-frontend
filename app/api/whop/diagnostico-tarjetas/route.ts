import { NextRequest, NextResponse } from "next/server";
import { whopClient, OCTOPUS_COMPANY_ID } from "@/lib/whop";
import { whopAccountForMoney } from "@/lib/whopIdentity";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const ADMIN_EMAILS = ["fmassuh133@gmail.com"];

/**
 * GET /api/whop/diagnostico-tarjetas — SOLO ADMIN.
 *
 * Sirve para responder una pregunta concreta: cuando alguien guarda su tarjeta
 * y la app no la encuentra, ¿dónde quedó? Busca el medio de pago por todos los
 * caminos que ofrece Whop (por empresa, por miembro, por setup intent) y
 * reporta cuál funcionó y cuál falló, con el error de verdad.
 *
 * No expone ningún dato sensible: de la tarjeta solo salen marca y últimos 4,
 * que es exactamente lo que ya se muestra en pantalla.
 */
export async function GET(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 10 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const w = whopClient as any;
  const out: any = { miCuenta: null, octapi: OCTOPUS_COMPANY_ID, pasos: [] };

  const paso = async (nombre: string, fn: () => Promise<any>) => {
    try {
      const r = await fn();
      out.pasos.push({ paso: nombre, ok: true, resultado: r });
      return r;
    } catch (e: any) {
      out.pasos.push({ paso: nombre, ok: false, error: String(e?.message || e).slice(0, 250) });
      return null;
    }
  };

  const resumirMedio = (m: any) => ({
    id: m?.id,
    tipo: m?.payment_method_type,
    marca: m?.card?.brand ?? null,
    ultimos4: m?.card?.last4 ?? m?.us_bank_account?.last4 ?? null,
    creada: m?.created_at,
  });
  const items = (r: any) => (Array.isArray(r) ? r : r?.data || r?.items || []);

  const mia = await whopAccountForMoney({ id: user.id, email: user.email });
  out.miCuenta = mia;

  // 1. medios de pago de MI cuenta de empresa
  if (mia) {
    await paso(`paymentMethods.list(company_id=${mia})`, async () =>
      items(await w.paymentMethods.list({ company_id: mia, first: 20 })).map(resumirMedio)
    );
    await paso(`setupIntents.list(company_id=${mia})`, async () =>
      items(await w.setupIntents.list({ company_id: mia, first: 20 })).map((s: any) => ({
        id: s?.id,
        estado: s?.status,
        error: s?.error_message,
        empresa: s?.company?.id,
        miembro: s?.member?.id,
        metadata: s?.metadata,
        medio: s?.payment_method ? resumirMedio(s.payment_method) : null,
      }))
    );
  }

  // 2. lo mismo en la cuenta de Octapi — para ver si la tarjeta se fue a la
  //    cuenta madre en vez de a la de la empresa (sería un problema serio).
  await paso(`paymentMethods.list(company_id=${OCTOPUS_COMPANY_ID}) [Octapi]`, async () =>
    items(await w.paymentMethods.list({ company_id: OCTOPUS_COMPANY_ID, first: 20 })).map(resumirMedio)
  );
  await paso(`setupIntents.list(company_id=${OCTOPUS_COMPANY_ID}) [Octapi]`, async () =>
    items(await w.setupIntents.list({ company_id: OCTOPUS_COMPANY_ID, first: 20 })).map((s: any) => ({
      id: s?.id,
      estado: s?.status,
      error: s?.error_message,
      empresa: s?.company?.id,
      miembro: s?.member?.id,
      metadata: s?.metadata,
      medio: s?.payment_method ? resumirMedio(s.payment_method) : null,
    }))
  );

  // 3. por MIEMBRO. Whop permite guardar un medio de pago contra un miembro y
  //    no contra la empresa; si es ese el caso, buscar por empresa nunca lo
  //    va a encontrar, por más que la tarjeta exista.
  const miembros = await paso(`members.list(company_id=${mia || OCTOPUS_COMPANY_ID})`, async () =>
    items(await w.members.list({ company_id: mia || OCTOPUS_COMPANY_ID, first: 10 })).map((m: any) => ({
      id: m?.id,
      email: m?.user?.email || m?.email || null,
    }))
  );
  for (const m of (miembros || []).slice(0, 5)) {
    await paso(`paymentMethods.list(member_id=${m.id})`, async () =>
      items(await w.paymentMethods.list({ member_id: m.id, first: 10 })).map(resumirMedio)
    );
  }

  return NextResponse.json(out);
}
