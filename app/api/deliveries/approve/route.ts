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
  if (delivery.status === 'approved' || delivery.status === 'completed' || delivery.status === 'processing') {
    return NextResponse.json({ error: 'Esta entrega ya fue aprobada' }, { status: 409 })
  }

  // 1b. CLAIM ATÓMICO contra el doble-pago: marcamos 'processing' SOLO si sigue sin
  // aprobar/procesar. Si dos requests entran a la vez, únicamente uno cambia la fila;
  // el otro recibe 0 filas y aborta (sin pagar dos veces).
  const claimRes = await fetch(
    `${SUPABASE_URL}/rest/v1/content_deliveries?id=eq.${deliveryId}&status=not.in.("approved","completed","processing")`,
    { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'processing' }) }
  )
  const claimed = claimRes.ok ? await claimRes.json() : []
  if (!Array.isArray(claimed) || claimed.length !== 1) {
    return NextResponse.json({ error: 'Esta entrega ya está siendo procesada' }, { status: 409 })
  }
  const prevStatus = delivery.status // para revertir si el pago falla

  // 2. Determinar el monto a liberar (de la entrega o del contrato)
  let amount = Number(delivery.payment_amount) || 0
  if (!amount && delivery.contract_id) {
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/contracts?id=eq.${delivery.contract_id}&select=payment_amount`, { headers: H })
    const contracts = cRes.ok ? await cRes.json() : []
    amount = Number(contracts[0]?.payment_amount) || 0
  }

  // 3. Liberar el pago (escrow → creador) si hay monto
  let payment: any = null
  // Si la transferencia real a Whop falla, se guarda el motivo: la respuesta
  // tiene que decirlo en vez de dar el pago por hecho.
  let pagoRealFallo: string | null = null
  if (amount > 0) {
    // ── SALDO REAL DE WHOP ANTES DE MOVER NADA ────────────────────────────
    //
    // Sin este chequeo se producía un pago fantasma: la tabla `wallets` de
    // nuestra base y la cuenta de Whop pueden decir cosas distintas —un
    // depósito con tarjeta tarda 1 a 4 días hábiles en liquidar—, así que el
    // RPC descontaba el saldo, le avisaba al creador "te pagaron", y la
    // transferencia real fallaba por falta de fondos. El creador veía la
    // notificación de cobro y $0 en su billetera.
    //
    // Es la misma salvaguarda que ya tenía /api/payments/pay-creator y que en
    // este camino —que es el principal— faltaba.
    try {
      const { whopClient } = await import('@/lib/whop')
      const { whopAccountForMoney } = await import('@/lib/whopIdentity')
      const pagadorRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${delivery.company_id}&select=email`,
        { headers: H }
      )
      const pagador = ((pagadorRes.ok ? await pagadorRes.json() : [])[0]) || {}
      const cuentaPagador = await whopAccountForMoney({ id: delivery.company_id, email: pagador.email })

      if (cuentaPagador) {
        const ledger: any = await (whopClient as any).ledgerAccounts.retrieve(cuentaPagador)
        const saldos = Array.isArray(ledger?.balances)
          ? ledger.balances.find((b: any) => String(b?.currency).toLowerCase() === 'usd') || ledger.balances[0]
          : null
        const disponible = Number(saldos?.balance) || 0
        const enCamino = Number(saldos?.pending_balance) || 0

        if (disponible < amount) {
          console.error('[Approve] saldo insuficiente en Whop:', { disponible, enCamino, amount })
          return NextResponse.json({
            error: enCamino > 0
              ? `El contenido no se puede aprobar todavía: la empresa tiene $${disponible.toFixed(2)} disponibles y $${enCamino.toFixed(2)} en camino. El depósito se está confirmando con el banco.`
              : `La empresa no tiene saldo suficiente para pagar este contenido ($${disponible.toFixed(2)} disponibles de $${amount.toFixed(2)}).`,
            needsFunds: true,
            disponible,
            enCamino,
            amount,
          }, { status: 402 })
        }
      }
    } catch (e: any) {
      // Si no se puede leer el saldo real, NO se sigue a ciegas: aprobar y
      // notificar un pago que quizá no ocurra es peor que hacer esperar.
      console.error('[Approve] no se pudo leer el saldo de Whop:', e?.message)
      return NextResponse.json(
        { error: 'No pudimos verificar el saldo en este momento. Intenta de nuevo en un minuto.' },
        { status: 503 }
      )
    }

    // monto COMPLETO al creador (la comision de Octopus es solo al retirar)
    const payRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oct_pay_creator`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        p_company: delivery.company_id,
        p_creator: delivery.creator_id,
        p_amount: amount,
        p_description: `Pago por contenido aprobado: ${delivery.title || 'entrega'}`,
      }),
    })
    payment = payRes.ok ? await payRes.json() : null
    if (!payment?.success) {
      // el pago falló → devolvemos la entrega a su estado previo (soltamos el claim)
      await fetch(`${SUPABASE_URL}/rest/v1/content_deliveries?id=eq.${deliveryId}`, {
        method: 'PATCH', headers: H, body: JSON.stringify({ status: prevStatus }),
      }).catch(() => {})
      return NextResponse.json({
        error: 'Fondos insuficientes en tu wallet. Deposita fondos para liberar el pago al aprobar.',
        needsFunds: true,
        amount,
      }, { status: 402 })
    }

    // AUTO-PAYOUT: la plata del creador vuela YA a su cuenta Whop (cero
    // custodia de fondos de terceros). Si falla, queda en su saldo (fallback).
    try {
      const { autoPayoutToWhop } = await import('@/lib/autoPayout')
      const { whopAccountForMoney } = await import('@/lib/whopIdentity')
      const [cRes, pRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${delivery.creator_id}&select=email`, { headers: H }),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${delivery.company_id}&select=email`, { headers: H }),
      ])
      const cEmail = ((cRes.ok ? await cRes.json() : [])[0])?.email
      const payerProfile = ((pRes.ok ? await pRes.json() : [])[0]) || {}
      // origen = cuenta Whop de la EMPRESA que aprueba, nunca la de Octapi
      const payerCompanyId = await whopAccountForMoney({ id: delivery.company_id, email: payerProfile.email })
      if (payerCompanyId) {
        const envio = await autoPayoutToWhop({
          userId: delivery.creator_id,
          email: cEmail,
          amount,
          idempotenceKey: `dlv_${deliveryId}`,
          // El motivo lo corta a 50 igual, pero se acota acá también para que
          // llegue algo legible y no un título truncado a la mitad.
          notes: `Contenido aprobado`,
          originCompanyId: payerCompanyId,
        })
        // El resultado NO se descarta. Antes todo esto vivía dentro de un
        // catch vacío: si la transferencia fallaba, nadie se enteraba y al
        // creador igual le llegaba "te pagaron".
        if (!envio.sent) {
          console.error('[ApproveDelivery] la transferencia NO salió:', envio.error, deliveryId)
          pagoRealFallo = envio.error || 'no se pudo mover el dinero'
        }
      } else {
        console.error('[ApproveDelivery] empresa sin cuenta de pagos:', delivery.company_id)
        pagoRealFallo = 'la empresa no tiene cuenta de pagos'
      }
    } catch (e: any) {
      console.error('[ApproveDelivery] error moviendo el dinero:', e?.message)
      pagoRealFallo = 'error al mover el dinero'
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

  // 7. Notificar al creador — dentro de la app Y por correo.
  //
  // El aviso dice "te pagaron" SOLO si la plata se movió de verdad
  // (pagoRealFallo vacío). Antes decía que había cobrado aunque la
  // transferencia hubiera fallado, y el creador veía el aviso y $0 en su
  // billetera.
  const sePago = amount > 0 && !pagoRealFallo
  await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      delivery_id: deliveryId, recipient_id: delivery.creator_id, type: 'content_approved',
      title: 'Tu contenido fue aprobado',
      message: sePago
        ? `Tu contenido fue aprobado y se liberó tu pago de $${amount.toFixed(2)}.`
        : 'Tu contenido fue aprobado.',
    }),
  }).catch(() => {})

  // Correo. Sin esto, el creador solo se entera si entra a la app por
  // casualidad — y es justamente el momento en que hay que darle la buena
  // noticia. No se espera la respuesta: que un correo falle no puede afectar
  // una aprobación que ya ocurrió.
  try {
    const [{ avisarPagoRecibido, avisarContenidoAprobado }, correoRes, empresaRes] = await Promise.all([
      import('@/lib/avisosEmail'),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${delivery.creator_id}&select=email`, { headers: H }),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${delivery.company_id}&select=company_name,full_name`, { headers: H }),
    ])
    const correoCreador = ((correoRes.ok ? await correoRes.json() : [])[0])?.email
    const empresa = ((empresaRes.ok ? await empresaRes.json() : [])[0]) || {}
    const nombreEmpresa = empresa.company_name || empresa.full_name || null

    if (sePago) {
      void avisarPagoRecibido({ email: correoCreador, monto: amount, nombreEmpresa })
    } else {
      void avisarContenidoAprobado({ email: correoCreador, titulo: delivery.title, nombreEmpresa })
    }
  } catch (e: any) {
    console.error('[ApproveDelivery] no se pudo avisar por correo:', e?.message)
  }

  return NextResponse.json({
    success: true,
    // `paid` dice si el dinero SE MOVIÓ de verdad, no si el saldo bajó en
    // nuestra base. Si la transferencia falló, la empresa tiene que enterarse
    // acá y no descubrirlo cuando el creador reclame.
    paid: amount > 0 && !pagoRealFallo,
    amount,
    creatorReceives: payment?.creator_receives ?? null,
    ...(pagoRealFallo ? { avisoPago: `El contenido quedó aprobado, pero el pago no se pudo enviar: ${pagoRealFallo}. Escríbenos para resolverlo.` } : {}),
  })
}
