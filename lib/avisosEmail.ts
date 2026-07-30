import { sendResendEmail } from "@/lib/waitlistEmail";

/**
 * Avisos por correo de lo que pasa en la app.
 *
 * POR QUÉ EXISTE
 * Hasta ahora el único correo que mandaba Octapi era el de la lista de espera.
 * Todo lo demás —te llegó un contrato, te pagaron, tienes una postulación,
 * recibiste contenido— solo se enteraba quien entrara a la app por casualidad.
 * En un marketplace donde las dos partes se están conociendo, eso mata el
 * primer trabajo: el creador entrega y nadie revisa, o la empresa contrata y
 * nadie responde.
 *
 * REGLAS DE ESTE ARCHIVO
 * 1. Nunca hacer que una operación falle por culpa de un correo. Todo se envía
 *    con captura de errores y sin await bloqueante donde se pueda: que no salga
 *    un aviso es molesto; que no se pague un contrato es grave.
 * 2. El asunto dice lo que pasó, no "Notificación de Octapi". Alguien que
 *    recibe diez correos al día decide si abre por el asunto.
 * 3. Cada correo lleva UN botón a la pantalla exacta. Sin menús ni paseos.
 */

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://octapiapp.com";

// Plantilla común. En correo no sirven las hojas de estilo externas ni flexbox
// en varios clientes: por eso tabla, estilos en línea y colores literales.
function plantilla(opts: {
  titulo: string;
  cuerpo: string;
  botonTexto: string;
  botonUrl: string;
  pie?: string;
}): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,31,.08);">
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0;font-size:15px;font-weight:800;color:#0f8b82;letter-spacing:-.01em;">🐙 Octapi</p>
        </td></tr>
        <tr><td style="padding:8px 32px 0;">
          <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#10181f;letter-spacing:-.02em;">${opts.titulo}</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 0;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#48565f;">${opts.cuerpo}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <a href="${opts.botonUrl}" style="display:inline-block;background:#0f8b82;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">${opts.botonTexto}</a>
        </td></tr>
        ${
          opts.pie
            ? `<tr><td style="padding:0 32px 28px;"><p style="margin:0;font-size:12.5px;line-height:1.6;color:#7c8a93;">${opts.pie}</p></td></tr>`
            : ""
        }
      </table>
      <p style="margin:20px 0 0;font-size:11.5px;color:#8b979f;">Octapi · Creadores y marcas de Latinoamérica</p>
    </td></tr>
  </table>
</body></html>`;
}

/** Envía sin dejar caer nunca la operación que lo llamó. */
async function enviar(to: string | null | undefined, asunto: string, html: string, etiqueta: string) {
  if (!to || !to.includes("@")) return;
  try {
    const r = await sendResendEmail(to, asunto, html);
    if (!r.ok) console.error(`[aviso:${etiqueta}] no se envió:`, r.error);
  } catch (e: any) {
    console.error(`[aviso:${etiqueta}] error:`, e?.message);
  }
}

// ── CREADOR ───────────────────────────────────────────────────────────────

/** Le llegó un contrato para firmar. */
export async function avisarContratoNuevo(opts: {
  email?: string | null;
  nombreCreador?: string | null;
  nombreEmpresa?: string | null;
  monto?: number | null;
}) {
  const empresa = opts.nombreEmpresa || "Una marca";
  const monto = opts.monto && opts.monto > 0 ? ` por <strong>$${opts.monto.toFixed(2)} USD</strong>` : "";
  await enviar(
    opts.email,
    `${empresa} te mandó un contrato`,
    plantilla({
      titulo: `Tienes un contrato para revisar`,
      cuerpo: `${empresa} quiere trabajar contigo${monto}. Revisa las condiciones y, si te acomodan, acéptalo para empezar.`,
      botonTexto: "Ver el contrato",
      botonUrl: `${APP}/creator/contracts`,
      pie: "Si no lo aceptas, no pasa nada: el contrato queda pendiente y la marca puede escribirte.",
    }),
    "contrato-nuevo"
  );
}

/** Le pagaron. Solo se manda cuando la plata SE MOVIÓ de verdad. */
export async function avisarPagoRecibido(opts: {
  email?: string | null;
  monto: number;
  nombreEmpresa?: string | null;
}) {
  const empresa = opts.nombreEmpresa || "La marca";
  await enviar(
    opts.email,
    `Te pagaron $${opts.monto.toFixed(2)}`,
    plantilla({
      titulo: `Recibiste $${opts.monto.toFixed(2)} USD`,
      cuerpo: `${empresa} aprobó tu contenido y el pago ya está en tu cuenta. Puedes retirarlo cuando quieras.`,
      botonTexto: "Ver mi billetera",
      botonUrl: `${APP}/creator/wallet`,
    }),
    "pago-recibido"
  );
}

/** Le aprobaron el contenido pero el contrato no tenía monto. */
export async function avisarContenidoAprobado(opts: {
  email?: string | null;
  titulo?: string | null;
  nombreEmpresa?: string | null;
}) {
  const empresa = opts.nombreEmpresa || "La marca";
  await enviar(
    opts.email,
    `${empresa} aprobó tu contenido`,
    plantilla({
      titulo: "Tu contenido fue aprobado",
      cuerpo: `${empresa} revisó ${opts.titulo ? `<strong>${opts.titulo}</strong>` : "tu entrega"} y quedó conforme.`,
      botonTexto: "Ver mis entregas",
      botonUrl: `${APP}/creator/deliveries`,
    }),
    "contenido-aprobado"
  );
}

/** La empresa pidió cambios. */
export async function avisarCambiosPedidos(opts: {
  email?: string | null;
  titulo?: string | null;
  motivo?: string | null;
  nombreEmpresa?: string | null;
}) {
  const empresa = opts.nombreEmpresa || "La marca";
  await enviar(
    opts.email,
    `${empresa} pidió cambios en tu contenido`,
    plantilla({
      titulo: "Te pidieron algunos cambios",
      cuerpo: `${empresa} revisó ${opts.titulo ? `<strong>${opts.titulo}</strong>` : "tu entrega"} y pidió ajustes.${
        opts.motivo ? `<br><br><em>"${opts.motivo}"</em>` : ""
      }`,
      botonTexto: "Ver qué piden",
      botonUrl: `${APP}/creator/deliveries`,
    }),
    "cambios-pedidos"
  );
}

// ── EMPRESA ───────────────────────────────────────────────────────────────

/** Alguien postuló a su trabajo. */
export async function avisarPostulacionNueva(opts: {
  email?: string | null;
  nombreCreador?: string | null;
  tituloGig?: string | null;
}) {
  const creador = opts.nombreCreador || "Un creador";
  await enviar(
    opts.email,
    `${creador} postuló a tu trabajo`,
    plantilla({
      titulo: "Tienes una postulación nueva",
      cuerpo: `${creador} quiere trabajar en ${
        opts.tituloGig ? `<strong>${opts.tituloGig}</strong>` : "tu publicación"
      }. Revisa su perfil y sus redes antes de decidir.`,
      botonTexto: "Ver postulantes",
      botonUrl: `${APP}/company/applicants`,
    }),
    "postulacion-nueva"
  );
}

/** El creador entregó contenido y hay que revisarlo. */
export async function avisarContenidoEntregado(opts: {
  email?: string | null;
  nombreCreador?: string | null;
  titulo?: string | null;
}) {
  const creador = opts.nombreCreador || "Un creador";
  await enviar(
    opts.email,
    `${creador} te entregó contenido`,
    plantilla({
      titulo: "Tienes contenido para revisar",
      cuerpo: `${creador} subió ${opts.titulo ? `<strong>${opts.titulo}</strong>` : "su entrega"}. Revísalo y apruébalo o pide cambios.`,
      botonTexto: "Revisar contenido",
      botonUrl: `${APP}/company/review-content`,
      pie: "Si no lo revisas en 7 días, se aprueba solo y el pago se libera al creador.",
    }),
    "contenido-entregado"
  );
}

/** El creador aceptó el contrato. */
export async function avisarContratoAceptado(opts: {
  email?: string | null;
  nombreCreador?: string | null;
}) {
  const creador = opts.nombreCreador || "El creador";
  await enviar(
    opts.email,
    `${creador} aceptó tu contrato`,
    plantilla({
      titulo: "Tu contrato fue aceptado",
      cuerpo: `${creador} aceptó las condiciones y ya puede empezar a trabajar.`,
      botonTexto: "Ver el contrato",
      botonUrl: `${APP}/company/contracts`,
    }),
    "contrato-aceptado"
  );
}
