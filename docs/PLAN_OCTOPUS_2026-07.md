# Plan Octopus — Investigación pagos, monetización, anti-bot e ideas (jul 2026)

## 1. PAGAR A LOS CREADORES (money-out)
| Proveedor | Fee | Chile/LATAM | Integración | Nota |
|---|---|---|---|---|
| **Whop** (ya integrado) | embebido, KYC incluido | dijo que sí soporta Chile | media (credenciales) | 1ª opción si destrabamos la key |
| **Dots** | por rail | 190+ países, rails instantáneos | <1 semana, sandbox en horas | el MÁS rápido de integrar |
| **Wise** | <1% (tasa real) | soporta Chile (CLP a banco) | media | el más barato en FX |
| **Payoneer** | 1% recibir + $1.50 retiro | LATAM fuerte | media | tarjeta + cuenta para el creador |
| **Trolley** | ~2% FX | 210 países | 4-6 semanas | lento de onboarding |

**Recomendación:** Whop como primario (ya integrado, KYC embebido); **backup Dots** (rápido) o **Wise** (barato). Confirmar soporte real de payout a Chile con cada uno antes de casarse.

## 2. COBRAR A LAS EMPRESAS (money-in Chile)
| Proveedor | Fee | Recurrencia | Nota |
|---|---|---|---|
| **Flow.cl** | 2,89%-3,44% | Cargo Automático | agregador: 1 integración = Webpay + transfer + MACH + Khipu |
| **MercadoPago** | 2,89%-3,19% | Suscripciones (preapproval) | recurrencia lista, dinero inmediato |
| **Webpay/Transbank** | ~2,35% | OneClick | el estándar en Chile, más barato en tarjeta |
| **Fintoc** | ~1,35% | Débito directo/PAC | transferencia, ideal tickets altos |
| **Khipu** | ~0,7-1,5% | semi | el más barato, más fricción |

**Recomendación:** **Flow.cl** para suscripciones (un solo integrador cubre todo) + **Fintoc/Khipu** para fondear campañas grandes (ahorra ~2% vs tarjeta en tickets altos).

## 3. MONETIZACIÓN — cómo hace plata SideShift (a copiar/mejorar)
- Marcas: plan Free con **10% de comisión por proyecto**; Pro **$299/mes**; Premium **$399/mes con comisión reducida 5%**.
- Clientes de SideShift: Replit, GPTZero, Brex. UGC cuesta $50-300/video (típico $100-200).
- **Content rewards (clipping):** Whop cobra ~7% del presupuesto; CPM típico $1-3. Competidores: ClipAffiliates (9%+9%), ClipReward (8%).

**Recomendación Octopus (híbrido):**
1. **Comisión 10%** (baja a 5% en plan pago) — igual que SideShift, probado.
2. **Suscripción de marca** ~$199-399/mes (campañas ilimitadas + comisión reducida).
3. **Campañas de clipping/content-rewards** con ~7% sobre presupuesto (CPM).
4. **Octopus Pro para creadores** (más postulaciones, prioridad) — ya está el paywall.

## 4. ANTI-BOT / AUDIENCIAS REALES
- Escala del fraude: **~45% de cuentas IG** con señales de fraude; **TikTok 24,2% de tráfico inválido** (1 de cada 4). Es el problema #1 a resolver.
- **Capa 1 (confiable): OAuth a la analítica nativa del creador.**
  - YouTube Analytics API → país de la audiencia (viewerPercentage por país). ✓
  - Instagram Graph API → país **y ciudad** (lo mejor, sirve para "Santiago real"). ✓
  - **TikTok = el hueco:** la API oficial NO da demografía de audiencia a terceros. Hay que usar 3ros (Modash/HypeAuditor) o pedir screenshot de su analytics.
- **Capa 2 (estimación de terceros):** Modash (US$199/mes, "Audience Credibility Score" % reales vs bots; geo a ciudad solo IG), HypeAuditor (~US$299/mes). Umbral recomendado: >85% audiencia real.
- **Reglas simples propias:** engagement rate anómalo (real: IG 1-3%, TikTok 3-5%), crecimiento en spikes de bots, geografía inconsistente (bots suelen venir de Nigeria/África Occidental).
- **KYC de identidad:** Whop lo trae incluido; alternativas Veriff/Incode (Incode fuerte en LATAM).

## 5. IDEAS NUEVAS (diferenciar, no copiar)
1. **Boleta/factura automática SII (Chile)** — genera el documento tributario del creador solo. Dolor gigante en Chile; SideShift NO lo hace. Diferenciador enorme. (esfuerzo medio)
2. **Badge "Audiencia Chile real"** — creadores con audiencia verificada como chilena/LATAM real; las marcas filtran por eso. Resuelve el "pago por audiencia local de verdad". (medio)
3. **Pago en CLP a cuenta bancaria chilena (RUT)** — no USD/PayPal. Saca la fricción que SideShift (US) tiene. (alto, depende del provider)
4. **Clipping con views verificadas** — content rewards con anti-fraude incorporado (solo views reales cuentan). (medio)
5. **Octo, mascota IA de ayuda** — pulpo que guía al creador (ya está la idea). (medio)
6. **Escrow de confianza** — plata retenida hasta aprobar el contenido; seguridad para ambos lados. (medio)
7. **Matching por nicho + audiencia local** — la marca describe la campaña y Octopus sugiere creadores con audiencia local real en ese nicho. (alto)
8. **Sorteos entre top creadores** — retención estilo gamificación con premios reales. (bajo)
9. **Reviews bidireccionales** marca↔creador. (bajo)
10. **Adelanto/pago express** — el creador cobra más rápido (hook de retención). (medio)

## 6. AGREGAR YA vs NO
**Agregar ya (para lanzar):**
- Cerrar UN proveedor de pago-a-creador (Whop o Dots/Wise) + UN pago-a-empresa (Flow o MercadoPago)
- OAuth de TikTok/YouTube para verificar creador real (aunque sea básico)
- Comisión 10% + plan de marca

**NO agregar ahora (postergar):**
- No construir tu propio sistema de payout (usá un proveedor)
- No construir tu propio anti-fraude ML (usá Modash/reglas simples)
- No pelear con TikTok audience API (no existe para 3ros) — usá 3ros o screenshots
- No sobre-diseñar content-rewards antes de validar el marketplace básico

## 7. ROADMAP
1. Destrabar credenciales de pago (Whop key o alternativa) → probar en sandbox
2. Integrar cobro a empresas (Flow/MercadoPago) para suscripciones
3. OAuth TikTok/YouTube básico + badge de verificado
4. Boleta SII automática (diferenciador clave Chile)
5. Lanzar beta cerrado en Chile → generar historial → volver a Whop por la llamada
