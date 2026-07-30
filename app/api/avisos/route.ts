import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config/supabase";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { shieldAsync } from "@/lib/shield";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * POST /api/avisos — manda el correo que corresponde a algo que acaba de pasar.
 *
 * POR QUÉ EXISTE
 * Los contratos, las postulaciones y las entregas se crean desde el navegador,
 * escribiendo directo en la base. Desde ahí no se puede mandar correo: la llave
 * de Resend es del servidor y no puede viajar al cliente. Esta ruta es el
 * puente: la pantalla avisa "pasó esto", y el servidor decide a quién escribirle
 * y qué decirle.
 *
 * QUÉ NO HACE
 * No acepta destinatarios ni textos del cliente. Recibe solamente QUÉ pasó y
 * SOBRE QUÉ, y el servidor busca los correos en la base. Si aceptara un
 * destinatario, sería una máquina de mandar correos a cualquiera desde nuestro
 * dominio — y quemaría la reputación del remitente en un día.
 *
 * Siempre responde ok. Un aviso que no sale es molesto; una pantalla que se
 * traba porque el correo falló es peor.
 */

type Tipo =
  | "contrato_nuevo"
  | "contrato_aceptado"
  | "postulacion_nueva"
  | "contenido_entregado"
  | "cambios_pedidos";

export async function POST(request: NextRequest) {
  const blocked = await shieldAsync(request as unknown as Request, { limit: 30 });
  if (blocked) return blocked;

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!SERVICE_KEY) return NextResponse.json({ ok: true, enviado: false });

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };

  try {
    const body = await request.json().catch(() => ({}));
    const tipo = String(body?.tipo || "") as Tipo;
    // A quién le pasó esto. Se valida que sea un identificador de verdad antes
    // de meterlo en una consulta.
    const paraId = String(body?.paraId || "");
    if (!/^[0-9a-f-]{36}$/i.test(paraId)) {
      return NextResponse.json({ ok: true, enviado: false });
    }

    const perfilDe = async (id: string) => {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${id}&select=email,full_name,company_name`,
        { headers: H }
      );
      return ((r.ok ? await r.json() : [])[0]) || {};
    };

    const [destino, quienLoHizo] = await Promise.all([perfilDe(paraId), perfilDe(user.id)]);
    if (!destino.email) return NextResponse.json({ ok: true, enviado: false });

    const nombreEmpresa = quienLoHizo.company_name || quienLoHizo.full_name || null;
    const nombreCreador = quienLoHizo.full_name || null;
    const avisos = await import("@/lib/avisosEmail");

    switch (tipo) {
      case "contrato_nuevo":
        await avisos.avisarContratoNuevo({
          email: destino.email,
          nombreCreador: destino.full_name,
          nombreEmpresa,
          monto: Number(body?.monto) || null,
        });
        break;

      case "contrato_aceptado":
        await avisos.avisarContratoAceptado({ email: destino.email, nombreCreador });
        break;

      case "postulacion_nueva":
        await avisos.avisarPostulacionNueva({
          email: destino.email,
          nombreCreador,
          tituloGig: body?.titulo ? String(body.titulo).slice(0, 120) : null,
        });
        break;

      case "contenido_entregado":
        await avisos.avisarContenidoEntregado({
          email: destino.email,
          nombreCreador,
          titulo: body?.titulo ? String(body.titulo).slice(0, 120) : null,
        });
        break;

      case "cambios_pedidos":
        await avisos.avisarCambiosPedidos({
          email: destino.email,
          titulo: body?.titulo ? String(body.titulo).slice(0, 120) : null,
          motivo: body?.motivo ? String(body.motivo).slice(0, 300) : null,
          nombreEmpresa,
        });
        break;

      default:
        return NextResponse.json({ ok: true, enviado: false });
    }

    return NextResponse.json({ ok: true, enviado: true });
  } catch (e: any) {
    console.error("[Avisos] error:", e?.message || e);
    return NextResponse.json({ ok: true, enviado: false });
  }
}
