import { NextRequest, NextResponse } from 'next/server'
import { whopClient } from '@/lib/whop'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'
import { shieldAsync } from '@/lib/shield'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * POST /api/payments/pay-creator — pago DIRECTO de la empresa a un creador.
 * Body: { creatorId, amount, note?, views?, cpm? }
 * - amount fijo, o calculado por views (views/1000 * cpm) — el server RECALCULA el CPM,
 *   nunca confía en el monto del cliente cuando vienen views.
 * - Mueve la plata con la RPC process_payment (atómica: balance empresa → saldo creador,
 *   falla si no hay fondos).
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 10 })
  if (_blocked) return _blocked
  const limited = rateLimit(request, { limit: 10, name: 'pay-creator' })
  if (limited) return limited

  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Config del servidor incompleta' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const creatorId = String(body?.creatorId || '')

  // Clave del intento de pago que manda la app. Se limpia a caracteres seguros
  // y se acota, porque termina viajando a Whop. Si no viene (app vieja en caché,
  // llamada desde otro lado), se cae a una por tiempo: no protege contra
  // reintentos, pero no rompe el pago.
  const clientKey =
    String(body?.idempotencyKey || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) ||
    `t${Date.now()}`;
  const note = String(body?.note || '').slice(0, 200)
  const views = Number(body?.views)
  const cpm = Number(body?.cpm)

  // monto: por CPM (recalculado en el server) o fijo
  let amount: number
  let description: string
  if (Number.isFinite(views) && views > 0) {
    if (!Number.isFinite(cpm) || cpm <= 0 || cpm > 1000) {
      return NextResponse.json({ error: 'CPM inválido' }, { status: 400 })
    }
    amount = Math.round((views / 1000) * cpm * 100) / 100
    description = note || `Pago por ${Math.round(views).toLocaleString('en-US')} views a $${cpm} CPM`
  } else {
    amount = Math.round(Number(body?.amount) * 100) / 100
    description = note || 'Pago directo de la empresa'
  }

  if (!creatorId || !Number.isFinite(amount) || amount < 0.5 || amount > 50000) {
    return NextResponse.json({ error: 'Monto inválido (mínimo $0.50)' }, { status: 400 })
  }

  const H = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' }

  // el que paga debe ser empresa y el que cobra debe ser creador
  const [payerRes, creatorRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type,whop_company_id,email,company_name`, { headers: H }),
    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${creatorId}&select=user_type,full_name,email`, { headers: H }),
  ])
  const payer = ((payerRes.ok ? await payerRes.json() : [])[0]) || {}
  const creator = ((creatorRes.ok ? await creatorRes.json() : [])[0]) || null
  if (payer.user_type !== 'company') return NextResponse.json({ error: 'Solo las empresas pueden pagar' }, { status: 403 })
  if (!creator || creator.user_type !== 'creator') return NextResponse.json({ error: 'Creador no encontrado' }, { status: 404 })

  // La plata sale de la cuenta de Whop DE LA EMPRESA, no de la de Octapi.
  // Si todavía no tiene cuenta (empresa vieja, de antes de este cambio), se
  // le crea acá sin que tenga que hacer nada.
  const { whopAccountForMoney } = await import('@/lib/whopIdentity')
  const payerCompanyId = await whopAccountForMoney({ id: user.id, email: payer.email })
  if (!payerCompanyId) {
    console.error('[PayCreator] empresa sin cuenta de pagos:', user.id)
    return NextResponse.json({ error: 'No se pudo preparar tu cuenta de pagos' }, { status: 502 })
  }

  // ── SALDO REAL ANTES DE MOVER NADA ──────────────────────────────────────
  //
  // POR QUÉ ESTO EXISTE
  // Nuestra tabla `wallets` y la cuenta de Whop pueden decir cosas distintas.
  // Pasó en la primera prueba con plata real: la empresa depositó $17, nuestra
  // base los acreditó al toque, y en Whop quedaron $0 disponibles y $15,77
  // "pendientes" mientras el banco confirmaba el cobro.
  //
  // Si solo se mirara nuestra base, el pago se daría por hecho —descontando el
  // saldo y avisándole al creador "te pagaron"— y la transferencia real en Whop
  // fallaría por falta de fondos. Un pago fantasma. Por eso el saldo que manda
  // es el de Whop, que es donde está la plata de verdad.
  try {
    const ledger: any = await (whopClient as any).ledgerAccounts.retrieve(payerCompanyId)
    const saldos = Array.isArray(ledger?.balances)
      ? ledger.balances.find((b: any) => String(b?.currency).toLowerCase() === 'usd') || ledger.balances[0]
      : null
    const disponible = Number(saldos?.balance) || 0
    const enCamino = Number(saldos?.pending_balance) || 0

    if (disponible < amount) {
      console.error('[PayCreator] saldo insuficiente en Whop:', { disponible, enCamino, amount })
      return NextResponse.json({
        error: enCamino > 0
          ? `Todavía no puedes pagar: tienes $${disponible.toFixed(2)} disponibles y $${enCamino.toFixed(2)} en camino. Tu depósito se está confirmando con el banco; cuando termine, este pago va a funcionar.`
          : `No tienes saldo suficiente. Disponible: $${disponible.toFixed(2)}. Agrega fondos y vuelve a intentar.`,
        needsFunds: true,
        disponible,
        enCamino,
        amount,
      }, { status: 402 })
    }
  } catch (e: any) {
    // Si no se puede leer el saldo real, NO se sigue a ciegas: mover plata sin
    // saber si existe es peor que hacer esperar a la empresa.
    console.error('[PayCreator] no se pudo leer el saldo de Whop:', e?.message)
    return NextResponse.json(
      { error: 'No pudimos verificar tu saldo en este momento. Intenta de nuevo en un minuto.' },
      { status: 503 }
    )
  }

  // mover la plata (atómico, monto COMPLETO al creador — la comisión de Octopus
  // se cobra únicamente al RETIRAR, nunca en el pago). Registra los movimientos
  // para la notificación "te pagaron".
  const payRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_pay_creator`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      p_company: user.id,
      p_creator: creatorId,
      p_amount: amount,
      p_description: description,
    }),
  })
  const payment = payRes.ok ? await payRes.json() : null
  if (!payment?.success) {
    if (payment?.error === 'insufficient') {
      return NextResponse.json({
        error: 'Fondos insuficientes en tu wallet. Agrega fondos y vuelve a intentar.',
        needsFunds: true,
        amount,
      }, { status: 402 })
    }
    console.error('[PayCreator] rpc:', payRes.status, JSON.stringify(payment)?.slice(0, 300))
    return NextResponse.json({ error: 'No se pudo procesar el pago (¿corriste PAGO_DIRECTO_FIX.sql?)' }, { status: 500 })
  }

  // AUTO-PAYOUT: la plata del creador vuela YA a su cuenta Whop (cero custodia).
  // Si Whop fallara, queda en su saldo Octopus y la retira manual (fallback).
  const { autoPayoutToWhop } = await import('@/lib/autoPayout')
  const payout = await autoPayoutToWhop({
    userId: creatorId,
    email: (creator as any).email,
    amount,
    // La clave la manda la app: nace UNA vez por apertura del modal de pago y
    // se repite si el intento se reintenta. Antes acá iba Date.now(), o sea
    // una clave distinta en cada llamada — que es lo mismo que no tener
    // ninguna: si el pago se reintentaba, Whop mandaba la plata dos veces.
    // Va prefijada con el id de quien paga para que dos empresas no puedan
    // chocar mandando la misma clave.
    idempotenceKey: `pay_${user.id}_${clientKey}`,
    notes: description || 'Pago de campaña Octopus',
    originCompanyId: payerCompanyId,
  })

  return NextResponse.json({ ok: true, amount, creator: creator.full_name, sentToWhop: payout.sent })
}
