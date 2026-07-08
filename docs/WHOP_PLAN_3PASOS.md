# GOAL: Integrar pagos Whop en Octopus (modelo escrow) + modelo de plata

Estado base (jul 8): API key CONECTADA y verificada (/api/whop/ping → ok, company "ocotpus", biz_RP3n8m53mpKsdU, PRODUCCIÓN — no hay sandbox). Payouts de la plataforma APROBADOS. Se prueba con montos chicos ($1) y las partes sin plata, gratis.

Modelo (Transfer/escrow): la marca paga → la plata se RETIENE en la plataforma → al aprobar el trabajo, la plata queda como saldo del creador (en nuestro ledger) → el creador RETIRA desde su wallet embebido en la app, y ahí se descuenta el fee. KYC de cada creador lo maneja Whop.

---

## MODELO DE PLATA (definido jul 8) — 3 fuentes de ingreso

Concepto clave: los fees de Whop son PEAJE (procesar tarjeta ~2.9%+$0.30 al entrar, ~$2.50 al retirar). Es el costo de mover plata, lo cubre quien la mueve — NO es margen de Octopus. Nuestra ganancia es aparte.

**Fuente #1 — Fee a la MARCA (ganancia principal), tiered por suscripción:**
| Plan de la marca | Fee sobre el gasto de campaña |
|---|---|
| Sin plan | 8% |
| Crecimiento (~$49/mes) | 5% |
| Pro empresa (~$199/mes) | 2% |
- Más suscripción → menos %. El creador recibe su monto COMPLETO (feliz).

**Fuente #2 — Fee al CREADOR, al RETIRAR (no al liberar):**
- La plata del creador queda en el balance de la PLATAFORMA (la ve en la app vía ledger interno). Al RETIRAR se descuenta.
- **No-Pro: 3.7%. Pro (~$9.99/mes): 0%.** SIN cargo fijo (Whop ya tiene su fijo; sumar otro castiga retiros chicos).
- **Mínimo de retiro: $20** (para que el % tenga sentido y no se coma todo en fijos de Whop).
- El fee se muestra como UN solo "fee de retiro" al cashout (bundle Whop + nuestro %). El creador ve su saldo COMPLETO hasta que retira.

**Fuente #3 — Suscripciones fijas** (creador Pro ~$9.99/mes + empresa) = ingreso recurrente aunque bajen los %.

Ejemplo campaña $100 (marca sin plan, creador sin Pro):
- Marca paga $100 + 8% = $108 → ganancia Octopus: $8
- Creador gana $100, retira → −3.7% (~$3.70, bundled con Whop) → ganancia Octopus: ~$3.70
- Octopus ≈ $11.70 por cada $100 movidos (competitivo; Fiverr ~25%).

Código: `lib/whop.ts` → `octopusFeePercent(isPro)` y `splitPayout(amount, isPro)` (aplicar al RETIRAR). Falta: setear 3.7%, agregar el fee de marca tiered (8/5/2%) en el pay-in, y el mínimo de retiro $20.

---

## PASO 1 — Cuenta del creador + KYC (GRATIS, no mueve plata)
**Objetivo:** cada creador tiene su connected account en Whop y completa su verificación.
**Ya existe:** `app/api/whop/setup-creator` crea la connected account (`companies.create` con parent_company_id) + link de KYC y guarda `whop_company_id`.
**Falta:** botón "Activar pagos" en el perfil/wallet del creador + mostrar estado (pendiente/aprobado).
**Prueba (gratis):** entrar como creador de prueba → "Activar pagos" → verificar en el dashboard de Whop que aparece la connected account → abrir el KYC.
**Listo cuando:** se crea la cuenta y el KYC abre, sin errores, sin plata.

## PASO 2 — Wallet embebido del creador (ver saldo + retirar)
**Objetivo:** el creador ve su saldo (nuestro ledger) y retira DENTRO de la app.
**Construir:** mostrar saldo del ledger interno + botón de retiro que descuenta el fee (con mínimo $20) → transfiere a su connected account → payout Whop. (Componentes embebidos de Whop para el payout / método de cobro.)
**Prueba (gratis):** abrir el wallet → ver saldo $0.00 + UI de retiro y el fee explicado.
**Listo cuando:** el saldo se muestra y la UI de retiro con el fee aparece.

## PASO 3 — Cobro a la marca (con fee tiered) + release (prueba con $1)
**Objetivo:** la marca paga con su fee de plataforma, la plata se retiene, y al aprobar queda como saldo del creador.
**Construir:**
- Pay-in: `checkoutConfigurations.create` (plan one_time) con el fee de marca (8/5/2% según plan) → checkout embebido → webhook `payment.succeeded` → acreditar ledger de la marca.
- Release: al aprobar una entrega → acreditar el saldo del creador en el ledger (el fee del creador se aplica recién al retirar, Paso 2).
**Prueba (con $1 — "campaña de prueba"):**
1. Crear una campaña de prueba de $1.
2. Pagar como marca ($1 real) → confirmar que cae en el balance de la plataforma (dashboard Whop) + el fee de marca.
3. Aprobar → confirmar que el creador ve $1 de saldo.
4. Retirar como creador → confirmar el fee de retiro y el payout.
5. Borrar la campaña de prueba.
**Listo cuando:** marca-paga-con-fee → retiene → creador-ve-saldo → retira-con-fee, funciona con $1.

---

## Notas
- Webhooks: se agregan en el Paso 3 (confirmar pagos). Por ahora salteados.
- Multi-moneda LATAM: mxn/cop/ars/clp/pen/etc. — la moneda se elige por país.
- Seguridad: la API key vive solo en Vercel (server-side).
- Orden de build: Paso 1 → 2 → 3.
