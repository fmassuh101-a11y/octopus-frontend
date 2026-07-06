# Guion para la llamada con Whop

Estado: Whop reenvió el caso a su equipo interno para ver si pueden avanzar. Esperando respuesta.

## Objetivo de la llamada
Confirmar que Whop soporta **payouts embebidos a los usuarios de la plataforma** (cada creador hace su KYC y retira dentro de Octopus, nosotros fondeamos). Y agendar la activación en producción.

## Cómo mostrar el producto (clave: NO parecer copia de SideShift)
1. **Mostrar el lado EMPRESA** (dashboard propio, distinto a SideShift):
   - Crear campaña (elegir tipo: UGC / Clipping / Faceless / etc.)
   - Ver aplicantes, mandar contrato
   - Revisar y aprobar contenido → se libera el pago
2. **Explicar el lado CREADOR verbalmente** ("en desarrollo activo"), sin mostrarlo:
   - Se registra → conecta TikTok (analytics de views/performance)
   - Ve campañas, postula en un tap, firma contrato, entrega
   - **Retira su plata DENTRO de Octopus vía Whop** ← acá engancha Whop

## El pitch de una frase
"Octopus es el marketplace de creadores para LATAM: las marcas lanzan campañas (UGC, clipping pay-per-view, faceless) y los creadores postulan, entregan y cobran. Lo único que nos falta para lanzar es el payout a creadores — por eso queremos a Whop."

## Lo que necesitamos de Whop (preguntas concretas)
1. ¿Soportan payout embebido a terceros (nuestros creadores), cada uno con su KYC, mientras la plataforma fondea?
2. ¿API + docs de ese modelo marketplace? ¿Funciona para creadores en Chile/LATAM?
3. Pasos para activar producción.

## Datos honestos
- Pre-revenue, entrando a beta. MRR $0 (no mentir).
- Founder con experiencia como creador (Discord) y usuario de Whop.
- Ya tenemos el andamiaje técnico (rutas payout-session, creator-balance, kyc).

## Plan B si Whop no encaja
Stripe Connect Express (mismo modelo embebido) / Payoneer / Trolley / Wise. Cobro a empresas: MercadoPago/Fintoc/Khipu (Chile).
