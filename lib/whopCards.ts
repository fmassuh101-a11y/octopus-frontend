import { whopClient } from "@/lib/whop";

/**
 * Medios de pago guardados de una empresa.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * La primera versión guardaba la tarjeta y después esperaba que Whop nos avisara
 * por webhook (setup_intent.succeeded) para enterarnos. Eso falló en la práctica:
 * la tarjeta quedaba bien guardada en Whop, pero la app decía "todavía no la
 * vemos confirmada" porque el aviso no llegaba.
 *
 * Depender de un aviso externo para saber algo que podemos PREGUNTAR es frágil.
 * Acá se le pregunta a Whop directo. El webhook sigue existiendo, pero ahora es
 * un atajo (nos ahorra la consulta), no la única fuente de verdad.
 *
 * Se consulta por dos caminos porque no son equivalentes:
 *   1. paymentMethods.list  — la lista oficial de medios guardados.
 *   2. setupIntents.list    — los formularios de "guardar tarjeta" completados.
 * El (2) sirve de respaldo: justo después de guardar, el intent ya aparece con
 * su payment_method aunque la lista del (1) todavía no lo refleje.
 */

// Datos de UNA tarjeta, ya listos para mostrar en pantalla.
export interface TarjetaGuardada {
  id: string;
  tipo: string; // 'card', 'paypal', 'us_bank_account', 'cashapp'...
  marca: string | null; // 'visa', 'mastercard', 'amex'...
  ultimos4: string | null;
  expMes: number | null;
  expAno: number | null;
  banco: string | null; // solo lo entrega Whop en cuentas bancarias, no en tarjetas
  creadaEn: string | null;
  /** Si vino de la lista de un miembro, cuál. Solo para depurar. */
  deMiembro?: string;
}

export interface ResultadoTarjetas {
  cards: TarjetaGuardada[];
  /** Null si todo salió bien. Si trae texto, la consulta falló de verdad
   *  (≠ "no tiene tarjetas"), y quien llame debe decirlo en vez de fingir cero. */
  problema: string | null;
  /** De dónde salieron, para depurar sin adivinar. */
  via: "lista" | "setup_intents" | "miembro" | "ninguno";
}

// Whop devuelve varias formas según el tipo de medio de pago. Esto las aplana.
function normalizar(m: any): TarjetaGuardada | null {
  if (!m?.id) return null;
  const card = m.card || null;
  const banco = m.us_bank_account || null;
  return {
    id: m.id,
    tipo: m.payment_method_type || (card ? "card" : "unknown"),
    marca: card?.brand ?? null,
    ultimos4: card?.last4 ?? banco?.last4 ?? m.sepa_debit?.last4 ?? null,
    expMes: card?.exp_month ?? null,
    expAno: card?.exp_year ?? null,
    banco: banco?.bank_name ?? null,
    creadaEn: m.created_at ?? null,
  };
}

function itemsDe(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.data || res.items || [];
}

export async function listarTarjetas(companyId: string): Promise<ResultadoTarjetas> {
  if (!companyId) return { cards: [], problema: "falta la cuenta de pagos", via: "ninguno" };

  const porId = new Map<string, TarjetaGuardada>();
  let fallo: string | null = null;
  let via: ResultadoTarjetas["via"] = "ninguno";

  // 1) la lista oficial
  try {
    const res: any = await (whopClient as any).paymentMethods.list({ company_id: companyId, first: 20 });
    for (const m of itemsDe(res)) {
      const t = normalizar(m);
      if (t) porId.set(t.id, t);
    }
    if (porId.size) via = "lista";
  } catch (e: any) {
    fallo = e?.message ? String(e.message).slice(0, 200) : "error consultando medios de pago";
    console.error("[whopCards] paymentMethods.list falló:", fallo);
  }

  // 2) respaldo por setup intents.
  //
  //    Acá está la parte importante y no obvia: cuando alguien guarda su
  //    tarjeta desde un checkout en modo "setup", Whop la deja colgando del
  //    MIEMBRO que llenó el formulario, no de la empresa. Por eso
  //    paymentMethods.list({company_id}) puede devolver CERO teniendo una
  //    tarjeta perfectamente guardada — que es justo lo que pasaba.
  //
  //    El setup intent es el único lugar donde aparecen las dos cosas juntas:
  //    la tarjeta y el miembro dueño. De ahí sacamos el miembro y volvemos a
  //    preguntar, ahora por member_id, para quedarnos con el id que Whop
  //    considera bueno para cobrar.
  const miembros = new Set<string>();
  try {
    const res: any = await (whopClient as any).setupIntents.list({ company_id: companyId, first: 20 });
    for (const si of itemsDe(res)) {
      if (String(si?.status || "").toLowerCase() !== "succeeded") continue;
      if (si?.member?.id) miembros.add(si.member.id);
      const t = normalizar(si?.payment_method);
      if (t && !porId.has(t.id)) {
        porId.set(t.id, t);
        if (via === "ninguno") via = "setup_intents";
      }
    }
    // si este camino funcionó, el fallo del otro ya no deja a nadie sin servicio
    if (porId.size) fallo = null;
  } catch (e: any) {
    const msg = e?.message ? String(e.message).slice(0, 200) : "error consultando setup intents";
    console.error("[whopCards] setupIntents.list falló:", msg);
    if (!fallo) fallo = msg;
  }

  // 3) la lista del MIEMBRO. Es la que de verdad importa para cobrar: si Whop
  //    guardó la tarjeta contra la persona, este es el id que reconoce.
  for (const memberId of Array.from(miembros)) {
    try {
      const res: any = await (whopClient as any).paymentMethods.list({ member_id: memberId, first: 20 });
      for (const m of itemsDe(res)) {
        const t = normalizar(m);
        if (!t) continue;
        // Se sobrescribe a propósito: si el mismo medio aparece por los dos
        // caminos, gana el del miembro, porque es el que Whop acepta cobrar.
        porId.set(t.id, { ...t, deMiembro: memberId });
        if (via === "ninguno" || via === "setup_intents") via = "miembro";
      }
      if (porId.size) fallo = null;
    } catch (e: any) {
      console.error("[whopCards] paymentMethods.list(member) falló:", String(e?.message).slice(0, 150));
    }
  }

  // más nuevas primero: la recién guardada es la que la empresa quiere usar
  const cards = Array.from(porId.values()).sort((a, b) =>
    String(b.creadaEn || "").localeCompare(String(a.creadaEn || ""))
  );

  // Encontramos tarjetas ⇒ no hubo problema, aunque un camino haya fallado.
  return { cards, problema: cards.length ? null : fallo, via };
}

/**
 * Tarjetas que la EMPRESA guardó a su propio nombre.
 *
 * Es una lista distinta de listarTarjetas() y la diferencia importa mucho:
 *
 *   listarTarjetas()          → todo lo que exista, incluyendo lo que guardó
 *                               una PERSONA. Sirve para mostrar en pantalla.
 *   listarTarjetasDeEmpresa() → SOLO lo que la empresa guardó a su nombre.
 *                               Es lo único que topups.create acepta cobrar.
 *
 * Whop devuelve las dos con el mismo formato de id (`payt_`), así que no se
 * pueden distinguir mirando el id: hay que preguntar por el camino correcto.
 * Cobrar con la lista equivocada da 404 "This PaymentToken was not found", que
 * fue exactamente lo que nos pasó.
 *
 * Hoy esta lista solo se llena si alguien guardó la tarjeta desde el panel de
 * Whop de esa cuenta (Cards → Add). Whop no expone una API para crearla.
 */
export async function listarTarjetasDeEmpresa(companyId: string): Promise<ResultadoTarjetas> {
  if (!companyId) return { cards: [], problema: "falta la cuenta de pagos", via: "ninguno" };
  try {
    const res: any = await (whopClient as any).paymentMethods.list({ company_id: companyId, first: 20 });
    const cards = itemsDe(res)
      .map(normalizar)
      .filter((t): t is TarjetaGuardada => !!t)
      .sort((a, b) => String(b.creadaEn || "").localeCompare(String(a.creadaEn || "")));
    return { cards, problema: null, via: cards.length ? "lista" : "ninguno" };
  } catch (e: any) {
    const msg = e?.message ? String(e.message).slice(0, 200) : "error consultando medios de pago";
    console.error("[whopCards] lista de empresa falló:", msg);
    return { cards: [], problema: msg, via: "ninguno" };
  }
}

// ---- Presentación --------------------------------------------------------
// El nombre lindo de cada marca. Whop entrega el identificador en minúscula.
const NOMBRE_MARCA: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  maestro: "Maestro",
  elo: "Elo",
  jcb: "JCB",
  unionpay: "UnionPay",
  china_union_pay: "UnionPay",
  cirrus: "Cirrus",
  carnet: "Carnet",
  tarjeta_naranja: "Tarjeta Naranja",
  link: "Link",
  rupay: "RuPay",
  dankort: "Dankort",
  girocard: "Girocard",
};

// Medios que no son tarjeta y tienen su propio nombre.
const NOMBRE_TIPO: Record<string, string> = {
  paypal: "PayPal",
  cashapp: "Cash App",
  venmo: "Venmo",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  us_bank_account: "Cuenta bancaria",
  sepa_debit: "Débito SEPA",
  crypto: "Cripto",
  klarna: "Klarna",
  afterpay_clearpay: "Afterpay",
  affirm: "Affirm",
};

export function nombreDeTarjeta(t: TarjetaGuardada): string {
  if (t.banco) return t.banco;
  if (t.marca && NOMBRE_MARCA[t.marca]) return NOMBRE_MARCA[t.marca];
  if (NOMBRE_TIPO[t.tipo]) return NOMBRE_TIPO[t.tipo];
  if (t.tipo === "card") return "Tarjeta";
  return t.tipo.replace(/_/g, " ");
}
