# GOAL: Integrar pagos Whop en Octopus (modelo escrow, corte 3%)

Estado base (jul 8): API key CONECTADA y verificada (/api/whop/ping → ok, company "ocotpus", biz_RP3n8m53mpKsdU, producción). Payouts de la plataforma APROBADOS. No hay sandbox → todo es producción, se prueba con montos chicos ($1) y las partes sin plata gratis.

Modelo (Transfer/escrow): la marca paga → la plata cae y se RETIENE en la plataforma → al aprobar el trabajo, transferimos al creador (menos el corte de Octopus) → el creador retira desde su wallet embebido en la app. KYC de cada creador lo maneja Whop.

## MODELO DE PLATA (revisado jul 8) — 3 fuentes de ingreso
Concepto: los fees de Whop son PEAJE (procesar tarjeta ~2.9%+$0.30 al entrar, ~$2.50 al retirar) — costo de mover plata, lo cubre quien mueve la plata (marca al entrar, creador al salir), NO es margen de Octopus.

**Fuente #1 — Fee a la MARCA (ganancia principal), tiered por suscripción:**
- Sin plan: 10% sobre el gasto de campaña
- Plan Crecimiento (~$49/mes): 6%
- Plan Pro empresa (~$199/mes): 3%
- (más suscripción → menos %). El creador recibe su monto COMPLETO.

**Fuente #2 — Fee al CREADOR al RETIRAR (no al liberar):**
- La plata del creador queda en el balance de la PLATAFORMA (se ve en la app vía ledger interno). Al RETIRAR se descuenta el fee, mostrado como UN solo "fee de retiro" (bundle Whop + nuestro %).
- No-Pro: 3%. Pro (~$9.99/mes): 0%.
- El creador ve su saldo COMPLETO; el fee solo aparece al cashout (mejor UX).

**Fuente #3 — Suscripciones fijas** (creador Pro + empresa) = ingreso recurrente aunque bajen los %.

Implementado en `lib/whop.ts`: `octopusFeePercent(isPro)` y `splitPayout(amount, isPro)` (aplicar al RETIRAR). Falta agregar el fee de marca (tiered) en el pay-in. Números a confirmar con Felipe.

---

## PASO 1 — Cuenta del creador + KYC (GRATIS, no mueve plata)
**Objetivo:** cada creador tiene su connected account en Whop y completa su verificación de identidad.
**Qué ya existe:** `app/api/whop/setup-creator` ya hace `companies.create({parent_company_id})` + link de KYC y guarda `whop_company_id` en profiles.
**Qué falta/ajustar:**
- Un botón claro en el perfil/wallet del creador: "Activar pagos" → llama a setup-creator → abre el KYC.
- Guardar y reflejar el estado del KYC (pendiente/aprobado).
**Cómo se prueba (gratis):**
1. Entrar como un creador de prueba → apretar "Activar pagos".
2. Verificar en el dashboard de Whop (Users/sub-companies) que aparece la connected account.
3. Abrir el link de KYC y ver que carga.
**Listo cuando:** se crea la connected account y el KYC abre, sin errores, sin plata.

## PASO 2 — Wallet embebido del creador (ver saldo + retirar)
**Objetivo:** el creador ve su saldo y retira DENTRO de la app (sin ir a whop.com).
**Qué construir:**
- Ruta server que emite un token scoped a la connected account del creador (`accessTokens.create` con scopes de payouts).
- Componentes embebidos `@whop/embedded-components-react-js` (PayoutsSession + BalanceElement + WithdrawButton + Withdrawals) en `/creator/wallet`.
**Cómo se prueba (gratis):**
1. Abrir el wallet de un creador con connected account → ver saldo $0.00 traído de Whop.
2. Ver que el botón de retiro y el historial renderizan.
**Listo cuando:** el saldo real de Whop se muestra embebido y la UI de retiro aparece.

## PASO 3 — Cobro a la marca + release con 3% (prueba con $1)
**Objetivo:** la marca paga, la plata se retiene, y al aprobar se transfiere al creador menos el 3%.
**Qué construir:**
- Pay-in: `checkoutConfigurations.create` (plan one_time, currency, initial_price) → checkout embebido → webhook/confirmación `payment.succeeded` → acreditar el ledger interno de la marca.
- Release: al aprobar una entrega → `transfers.create({amount: monto*0.97, destination_id: creatorWhopCompanyId})` → el 3% queda en la plataforma.
**Cómo se prueba (con $1 — la "variable de prueba"):**
1. Crear una **campaña de prueba de $1** (o top-up de $1).
2. Pagar como marca ($1 real) → confirmar que cae en el balance de la plataforma (dashboard Whop).
3. Aprobar la entrega → confirmar transfer de $0.97 al creador y $0.03 de corte.
4. Retirar como creador desde el wallet.
5. **Borrar la campaña de prueba** al terminar.
**Listo cuando:** el ciclo marca-paga → retiene → transfiere-97% → creador-retira funciona de punta a punta con $1.

---

## Notas
- Webhooks: se agregan en el Paso 3 (para confirmar pagos automáticamente). Por ahora salteados.
- Multi-moneda LATAM: mxn/cop/ars/clp/pen/etc. soportadas; la moneda se elige según el país.
- Seguridad: la API key vive solo en Vercel (server-side), nunca en el cliente.
