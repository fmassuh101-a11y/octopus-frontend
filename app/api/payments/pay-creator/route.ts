import { NextRequest, NextResponse } from 'next/server'
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
    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, { headers: H }),
    fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${creatorId}&select=user_type,full_name`, { headers: H }),
  ])
  const payer = ((payerRes.ok ? await payerRes.json() : [])[0]) || {}
  const creator = ((creatorRes.ok ? await creatorRes.json() : [])[0]) || null
  if (payer.user_type !== 'company') return NextResponse.json({ error: 'Solo las empresas pueden pagar' }, { status: 403 })
  if (!creator || creator.user_type !== 'creator') return NextResponse.json({ error: 'Creador no encontrado' }, { status: 404 })

  // CRÍTICO: asegurar que el wallet del creador EXISTA antes de pagar.
  // (process_payment hace UPDATE — si no hay fila, la plata se debita de la
  // empresa y no llega a nadie. Bug visto en pruebas del 8 jul.)
  await fetch(`${SUPABASE_URL}/rest/v1/wallets?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: creatorId, user_type: 'creator', balance: 0 }),
  }).catch(() => {})

  // saldo del creador ANTES (para verificar que el pago llegó de verdad)
  const beforeRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${creatorId}&select=balance`, { headers: H })
  const beforeBal = Number(((beforeRes.ok ? await beforeRes.json() : [])[0])?.balance) || 0

  // mover la plata (atómico, con chequeo de fondos)
  const payRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/process_payment`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      p_company_id: user.id,
      p_creator_id: creatorId,
      p_amount: amount,
      p_reference_id: null,
      p_reference_type: 'direct_payment',
      p_description: description,
    }),
  })
  const payment = payRes.ok ? await payRes.json() : null
  if (!payment?.success) {
    return NextResponse.json({
      error: 'Fondos insuficientes en tu wallet. Agregá fondos y volvé a intentar.',
      needsFunds: true,
      amount,
    }, { status: 402 })
  }

  // VERIFICAR que el saldo del creador subió de verdad (paranoia sana con plata)
  const afterRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${creatorId}&select=balance`, { headers: H })
  const afterBal = Number(((afterRes.ok ? await afterRes.json() : [])[0])?.balance) || 0
  // (tolera el fee interno de process_payment si lo hay — pero exige que llegue al menos el 90%)
  if (afterBal < beforeBal + amount * 0.9 - 0.01) {
    console.error(`[PayCreator] el saldo NO subió: antes=${beforeBal} después=${afterBal} monto=${amount}`)
    return NextResponse.json({ error: 'El pago no se aplicó correctamente. Avisá al soporte.', }, { status: 500 })
  }

  return NextResponse.json({ ok: true, amount, creator: creator.full_name, newBalance: afterBal })
}
