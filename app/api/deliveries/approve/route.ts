import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL } from '@/lib/config/supabase'
import { getAuthenticatedUser } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/rateLimit'
import { shieldAsync } from '@/lib/shield'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * POST /api/deliveries/approve — el corazón del flujo SideShift:
 * la empresa aprueba el contenido → el pago se libera al creador
 * (con la comisión de la plataforma) → el trabajo cuenta para su nivel.
 * Body: { deliveryId, feedback?, rating? }
 */
export async function POST(request: NextRequest) {
  const _blocked = await shieldAsync(request as unknown as Request, { limit: 20 })
  if (_blocked) return _blocked

  const limited = rateLimit(request, { limit: 20, name: 'delivery-approve' })
  if (limited) return limited

  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!SERVICE_KEY) return NextResponse.json({ error: 'Config del servidor incompleta' }, { status: 500 })

  const { deliveryId, feedback, rating } = await request.json()
  if (!deliveryId) return NextResponse.json({ error: 'Falta la entrega' }, { status: 400 })

  const H = { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY, 'Content-Type': 'application/json' }

  // 1. Cargar la entrega y verificar que la empresa sea la dueña
  const dRes = await fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?id=eq.${deliveryId}&select=*`, { headers: H })
  const deliveries = dRes.ok ? await dRes.json() : []
  const delivery = deliveries[0]
  if (!delivery) return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 })
  if (delivery.company_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (delivery.status === 'approved' || delivery.status === 'completed') {
    return NextResponse.json({ error: 'Esta entrega ya fue aprobada' }, { status: 409 })
  }

  // 2. Determinar el monto a liberar (de la entrega o del contrato)
  let amount = Number(delivery.payment_amount) || 0
  if (!amount && delivery.contract_id) {
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${delivery.contract_id}&select=payment_amount`, { headers: H })
    const contracts = cRes.ok ? await cRes.json() : []
    amount = Number(contracts[0]?.payment_amount) || 0
  }

  // 3. Liberar el pago (escrow → creador) si hay monto
  let payment: any = null
  if (amount > 0) {
    const payRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/process_payment`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        p_company_id: delivery.company_id,
        p_creator_id: delivery.creator_id,
        p_amount: amount,
        p_reference_id: delivery.id,
        p_reference_type: 'delivery',
        p_description: `Pago por contenido aprobado: ${delivery.title || 'entrega'}`,
      }),
    })
    payment = payRes.ok ? await payRes.json() : null
    if (!payment?.success) {
      return NextResponse.json({
        error: 'Fondos insuficientes en tu wallet. Deposita fondos para liberar el pago al aprobar.',
        needsFunds: true,
        amount,
      }, { status: 402 })
    }
  }

  const now = new Date().toISOString()

  // 4. Marcar la entrega como aprobada (+ pago liberado)
  await fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?id=eq.${deliveryId}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({
      status: 'approved',
      feedback: feedback || null,
      feedback_history: [
        ...(Array.isArray(delivery.feedback_history) ? delivery.feedback_history : []),
        { action: 'approved', feedback: feedback || null, created_at: now, by: 'company' },
      ],
      reviewed_at: now,
      approved_at: now,
      payment_amount: amount || null,
      payment_released_at: amount > 0 ? now : null,
      updated_at: now,
    }),
  })

  // 5. Marcar la aplicación como completada (alimenta el nivel del creador)
  if (delivery.application_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${delivery.application_id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ status: 'completed' }),
    })
  }

  // 6. Guardar la calificación de la empresa al creador
  if (rating >= 1 && rating <= 5) {
    await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        delivery_id: deliveryId, reviewer_id: user.id, reviewee_id: delivery.creator_id,
        rating, comment: feedback || null,
      }),
    }).catch(() => {})
  }

  // 7. Notificar al creador
  await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      delivery_id: deliveryId, recipient_id: delivery.creator_id, type: 'content_approved',
      title: 'Tu contenido fue aprobado',
      message: amount > 0
        ? `Tu contenido fue aprobado y se liberó tu pago de $${(payment?.creator_receives ?? amount).toFixed ? (payment?.creator_receives ?? amount) : amount}.`
        : 'Tu contenido fue aprobado.',
    }),
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    paid: amount > 0,
    amount,
    creatorReceives: payment?.creator_receives ?? null,
  })
}
