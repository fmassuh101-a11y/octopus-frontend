# Octopus — Reporte legal/tributario + seguridad (jul 2026)

Investigación de 22 agentes (12 legal + auditoría de código). Fuentes: SII, CMF, LeyChile, estudios chilenos. **No reemplaza a un abogado** — varios puntos exigen opinión formal antes de mover plata real.

## LA PREGUNTA DE LAS BOLETAS (respuesta directa)
Cuando una empresa deposita $1.000 para pagar creadores y quiere respaldar el GASTO ante el SII:
- **El contrato/recibo interno NO sirve** como respaldo tributario. En fiscalización el gasto se rechaza (art. 31 LIR) → riesgo de impuesto único 40% (art. 21 LIR).
- **El SII ya tiene un modelo exacto para plataformas** (Res. Ex. 132/2023, Ley 21.431): la PLATAFORMA emite al creador una **Boleta de Prestación de Servicios de Terceros (BTE)**, retiene **15,25%** (tasa 2026) y lo entera en el F29; su **comisión** la documenta con **factura electrónica + IVA 19%**. Con esto el creador queda liberado de emitir su propia boleta.
- **Dos estructuras válidas** (elegir con abogado tributario):
  - **(A) Agencia**: Octopus factura a la empresa el TOTAL con IVA 19% (la empresa recupera crédito fiscal con UNA factura). Simple para el cliente.
  - **(B) Mandato** (Res. 6080/1999): el creador emite boleta de honorarios (BHE) directo a la empresa, Octopus factura SOLO su comisión + IVA. Más eficiente, más complejo.
- **NADA de esto funciona sin constituir la empresa (SpA) e iniciar actividades en el SII.** Sin RUT no se puede emitir factura ni BTE ni retener.
- **El flujo actual (empresa chilena paga con tarjeta a Whop EE.UU.) es el punto más débil**: el comprobante es un invoice extranjero (respaldo rechazable) y puede gatillar IVA a servicios digitales + impuesto adicional. **Whop debe quedar SOLO para payouts, no para cobrar a empresas chilenas.**

## RIESGOS CRÍTICOS (ordenados)
1. **Operar sin SpA ni inicio de actividades** = responsabilidad patrimonial ILIMITADA del fundador + no se puede emitir ningún documento tributario + infracciones art. 97 CT. **Bloqueante para lanzar en serio.**
2. **Ley de Bancos / Ley 20.950 (medios de pago)** — riesgo PENAL: si el dinero de empresas/creadores pasa por cuentas bancarias de Octopus con saldos retirables, puede calificar como "emisión de medios de pago con provisión de fondos" (requiere licencia CMF, sociedad anónima). **Regla de oro: NINGÚN fondo debe pasar jamás por cuentas de Octopus SpA — Whop custodia, Octopus solo instruye y devenga su comisión.**
3. **UAF (lavado)**: no hay umbral por tamaño; si el ledger se califica como medio de pago, hay que registrarse. Multas hasta UF 5.000 (~USD 207k).
4. **Datos personales Ley 21.719** (vigencia 1-dic-2026): KYC + datos bancarios = datos sensibles; TODO el stack (Supabase/Vercel/Whop en EE.UU.) es transferencia internacional. Multas hasta 20.000 UTM (~USD 1,4M) o 4% de ingresos.
5. **Laboralización** (Ley 21.431 + jurisprudencia Corte Suprema): si Octopus fija tarifas/asigna/sanciona, un creador puede alegar relación laboral. Blindar: el CREADOR fija su precio, libertad total, contrato de prestación de servicios independiente.
6. **Impuesto Adicional por pagar a creadores extranjeros** (art. 59 LIR): 15-35% de retención si Octopus Chile es el pagador. Solución: que Whop sea el pagador (merchant of record).
7. **Ley del Consumidor / SERNAC**: precios SOLO en USD = infracción art. 32 (hay que mostrar CLP en Chile). Suscripciones necesitan derecho de retracto / cancelación clara.

## PLAN LEGAL
**Hacer YA (gratis o casi):**
- Constituir **Octopus SpA** en registrodeempresasysociedades.cl con ClaveÚnica (~$0, RUT el mismo día, 1 solo accionista de 18 permitido). Objeto social AMPLIO (software, intermediación por medios digitales, publicidad/marketing).
- Fijar **18+ como edad mínima** de creadores en los T&C (alineado con Whop/Sumsub).
- **Mostrar precios en CLP** para usuarios en Chile (USD como referencia).
- Redactar T&C con arquitectura: Octopus = intermediario tecnológico y de pagos, NO empleador ni parte del contrato; Whop custodia fondos; cesión de derechos de uso del contenido; política de retracto.
- Onboarding con **consentimiento granular** (checkboxes NO premarcadas).
**Al constituir / con abogado (pagar):**
- Opinión de estudio fintech chileno sobre el modelo de ledger (¿medio de pago? ¿UAF?) — Carey, Prieto, FerradaNehme, etc.
- Abogado tributario: elegir modelo (A) agencia vs (B) mandato; retención honorarios; impuesto adicional a extranjeros.
- Abogado laboral: blindaje anti-laboralización.
- Contador para F29/BTE/IVA.

## SEGURIDAD — HALLAZGOS (auditoría del código)
**CRÍTICO (acción inmediata):**
- 🔴 **API key real de Google Gemini filtrada en el historial de git** (repo). → ROTARLA YA en Google Cloud + purgar.
**ALTO (puedo arreglar en el código):**
- Rutas legacy de dinero desplegadas y PÚBLICAS (`whop/transfers`, `whop/withdraw`) que mueven monto arbitrario desde el balance de la PLATAFORMA, evaden el ledger y la comisión.
- Endpoint `whop/debug-payments` (clave hardcodeada `octo-debug-2026`) que vuelca wallets/transacciones. → borrar.
- Race condition / doble pago al aprobar entregas (falta lock+idempotencia en approve).
- Rate limit en MEMORIA en Vercel serverless (no sirve entre instancias) — Upstash no configurado.
**MEDIO:** CSP con `unsafe-inline` sin nonces; optimizador de imágenes abierto a cualquier host; rate limit por IP sobre el webhook de Whop puede tirar pagos legítimos; `amountMatches` acepta dólares y centavos.
**BIEN HECHO:** service role key aislada server-side; RLS como última muralla; validación de identidad delegada en Whop.
