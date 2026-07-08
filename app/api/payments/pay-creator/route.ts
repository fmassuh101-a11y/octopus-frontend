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
        error: 'Fondos insuficientes en tu wallet. Agregá fondos y volvé a intentar.',
        needsFunds: true,
        amount,
      }, { status: 402 })
    }
    console.error('[PayCreator] rpc:', payRes.status, JSON.stringify(payment)?.slice(0, 300))
    return NextResponse.json({ error: 'No se pudo procesar el pago (¿corriste PAGO_DIRECTO_FIX.sql?)' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, amount, creator: creator.full_name })
}
