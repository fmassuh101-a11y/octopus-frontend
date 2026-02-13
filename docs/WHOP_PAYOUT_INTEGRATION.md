# Whop Payout Integration Research

## Investigacion Completa para Octopus UGC Marketplace

**Fecha:** Febrero 2026
**Objetivo:** Usar Whop SOLO para payouts a creadores en Chile/LATAM
**Contexto:** Ya cobramos a empresas con MercadoPago/Flow

---

## Resumen Ejecutivo

**VEREDICTO: Whop SI puede usarse como servicio de payouts independiente**

Whop ha evolucionado de ser un "Stripe Connect wrapper" a una infraestructura de pagos completa. En Diciembre 2025, micro1 (plataforma que procesa $100M+ anuales) adopto Whop como su "official global payouts partner", demostrando que Whop puede funcionar como servicio de payouts externo para otras plataformas.

### Puntos Clave:
- Payouts en 241+ territorios (Chile incluido)
- Multiples metodos: Bitcoin, PayPal, Bank, Venmo, Stablecoins
- API robusta con SDK para JavaScript, Python, Ruby
- KYC integrado via partners financieros
- Fees transparentes y competitivos

---

## 1. Whop como Servicio de Payouts Independiente

### Se puede usar SOLO para payouts?

**SI**, pero con consideraciones importantes:

#### Modelo "Whop for Platforms"
Whop ofrece un producto llamado "Whop for Platforms" (similar a Stripe Connect) que permite:
- Onboardear "connected accounts" (creadores)
- Transferir fondos a esas cuentas
- Los creadores retiran a su metodo preferido

#### Caso de Exito: micro1
```
"micro1 named Whop as its official global payouts partner.
The integration took under a week to implement."
```

micro1 usa Whop SOLO para payouts, no para cobros. Esto valida el caso de uso de Octopus.

#### Acceso a la API de Platforms
```
IMPORTANTE: Access to the platforms API is currently invite only.
Contact sales@whop.com to see if your use case is eligible.
```

### Como funciona el flujo?

```
[Empresa paga via MercadoPago/Flow]
            |
            v
[Octopus recibe fondos en MercadoPago]
            |
            v
[Octopus deposita en Whop Platform Balance]
            |
            v
[Whop transfiere a cuenta del creador]
            |
            v
[Creador retira via Bitcoin/Bank/PayPal/etc]
```

---

## 2. Integracion Tecnica

### SDK Disponibles

```bash
# JavaScript/TypeScript
npm install @whop/sdk

# Python
pip install whop-sdk

# Ruby
gem install whop_sdk
```

### Autenticacion

```typescript
import Whop from "@whop/sdk";

const client = new Whop({
  apiKey: process.env.WHOP_API_KEY, // Company API Key
});
```

**Base URL:** `https://api.whop.com/api/v1`

**Permisos requeridos para payouts:**
- `payout:transfer_funds`

### Crear Connected Account (Creador)

Cada creador necesita un "Company" object en Whop:

```typescript
// Crear cuenta para creador
const company = await client.companies.create({
  name: "Creator Name",
  // otros campos requeridos
});

// company.id = "biz_xxxxxxxxxxxxx"
```

### Onboarding KYC del Creador

```typescript
// Generar link de onboarding KYC
const accountLink = await client.accountLinks.create({
  company_id: "biz_xxxxxxxxxxxxx", // ID del creador
  use_case: "account_onboarding",
  return_url: "https://octopus.cl/onboarding/complete",
  refresh_url: "https://octopus.cl/onboarding/refresh",
});

// Redirigir al creador a este URL
console.log(accountLink.url);
```

### Agregar Metodo de Payout (React Component)

```tsx
"use client";
import {
  Elements,
  PayoutsSession,
  PayoutMethodElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

const elements = loadWhopElements();

export function AddPayoutMethod({ companyId }: { companyId: string }) {
  return (
    <Elements elements={elements}>
      <PayoutsSession
        token={() =>
          fetch(`/api/whop/token?companyId=${companyId}`)
            .then((res) => res.json())
            .then((data) => data.token)
        }
        companyId={companyId}
        redirectUrl="https://octopus.cl/payout-method-added"
      >
        <PayoutMethodElement fallback={<div>Cargando...</div>} />
      </PayoutsSession>
    </Elements>
  );
}
```

### Transferir Fondos a Creador

```typescript
// Transferir desde balance de plataforma a creador
const transfer = await client.transfers.create({
  amount: 90.0, // Monto en USD
  currency: "usd",
  origin_id: "biz_OCTOPUS_PLATFORM", // Tu company ID
  destination_id: "biz_CREATOR_ID", // Company ID del creador
  idempotence_key: `payout_job_${jobId}_${Date.now()}`, // Evita pagos duplicados
  metadata: {
    job_id: "job_12345",
    campaign: "Nike UGC Campaign",
  },
});

console.log(transfer.id); // "txfr_xxxxxxxxxxxxx"
```

**IMPORTANTE:** El `idempotence_key` previene transferencias duplicadas si hay retry de API.

### Crear Withdrawal (Payout al Creador)

```typescript
// Crear withdrawal para que el creador reciba su dinero
const withdrawal = await client.withdrawals.create({
  company_id: "biz_CREATOR_ID",
  amount: 90.0,
  currency: "usd",
  payout_method_id: "pm_xxxxxxxxxxxxx", // Metodo configurado por creador
  platform_covers_fees: true, // Opcional: Octopus paga los fees
});

console.log(withdrawal.id);
```

### Listar Metodos de Payout del Creador

```typescript
const payoutMethods = await client.payoutMethods.list({
  company_id: "biz_CREATOR_ID",
});

// Encontrar metodo por defecto
const defaultMethod = payoutMethods.data.find((method) => method.is_default);
```

### Objeto Payout Method

```json
{
  "id": "potk_xxxxxxxxxxxxx",
  "created_at": "2026-02-01T05:00:00.401Z",
  "company": { "id": "biz_CREATOR_ID" },
  "nickname": "Mi Cuenta BancoEstado",
  "currency": "CLP",
  "is_default": true,
  "account_reference": "****1234",
  "institution_name": "BancoEstado",
  "destination": {
    "country_code": "CL",
    "category": "bank",
    "name": "BancoEstado"
  }
}
```

---

## 3. KYC de Creadores

### Como funciona?

1. **Verificacion Obligatoria:** Creadores DEBEN completar KYC antes de recibir payouts
2. **Partners Externos:** Whop usa servicios de terceros para KYC
3. **Proceso Automatico:** El creador completa el flujo via link de onboarding

### Flujo de KYC

```
1. Creador se registra en Octopus
2. Octopus crea "Company" en Whop
3. Octopus genera link de onboarding
4. Creador completa verificacion:
   - Datos personales
   - Documento de identidad
   - Selfie (en algunos casos)
5. Partner financiero aprueba/rechaza
6. Si aprobado: Creador puede agregar metodo de payout
```

### Que pasa si no pasan KYC?

```
- NO pueden recibir payouts
- Fondos quedan en su balance de Whop
- Pueden reintentar verificacion
- Whop/Financial Partner puede bloquear retiros
- Whop puede emitir reembolsos a pagadores originales
```

**Importante del TOS de Whop:**
> "If you fail to complete KYC or if you do not meet Financial Partners' requirements,
> a Financial Partner and/or Whop may block withdrawals, issue refunds to the original
> payers, or otherwise deny you access to the funds."

### Documentos Aceptados (Tipicamente)

- Pasaporte
- Cedula de identidad nacional
- Licencia de conducir
- Prueba de direccion (algunos casos)

---

## 4. Metodos de Payout Disponibles

### Lista Completa

| Metodo | Disponibilidad | Velocidad | Notas |
|--------|---------------|-----------|-------|
| **ACH** | USA | Next business day | Mas economico |
| **ACH Instant** | USA | Minutos | Fee adicional |
| **Wire Transfer** | Global | 1-2 dias | Para montos grandes |
| **Local Bank Rails** | 170+ paises | 1-4 dias | Incluye Chile |
| **PayPal** | Global | Instant | Requiere cuenta PayPal |
| **Venmo** | USA only | Instant | Solo USA |
| **CashApp** | USA only | Instant | Solo USA |
| **Bitcoin** | Global | Variable | Via Coinbase Commerce |
| **Stablecoins** | Global | Rapido | USDC, etc. |

### Funcionan en Chile/LATAM?

**SI, con estas opciones:**

1. **Local Bank Transfer (Recomendado)**
   - Chile soportado en 241+ territorios
   - Payout en CLP (pesos chilenos)
   - 1-4 dias para disponibilidad
   - 2-5 dias adicionales para llegar al banco

2. **Bitcoin/Stablecoins**
   - Excelente para LATAM
   - Sin restricciones geograficas
   - Ideal para creadores sin cuenta bancaria tradicional

3. **PayPal**
   - Funciona en Chile
   - El cliente debe haber pagado con PayPal (limitacion)

### Limitacion PayPal y Crypto

```
IMPORTANTE:
- PayPal: El pago original debe ser via PayPal
- Crypto: El pago original debe ser via crypto

No se puede convertir post-pago de tarjeta a PayPal/Crypto directamente.
```

### Conversion de Moneda

- Todos los fondos se almacenan en USD
- Whop cobra solo 1% FX fee (ellos absorben el segundo fee de conversion)
- Conversion automatica al momento del payout

---

## 5. Fees de Whop para Payouts

### Estructura de Fees

| Concepto | Fee | Notas |
|----------|-----|-------|
| **Uso de Plataforma** | GRATIS | Sin mensualidad |
| **Transaccion con Automations** | 3% | Discord/Telegram/TradingView |
| **Sin Automations** | 0% | Solo fees de procesamiento |
| **Processing (Domestic)** | 2.7% + $0.30 | Tarjetas USA |
| **Processing (International)** | +1.5% | Tarjetas no-USA |
| **Currency Conversion** | +1% | Si aplica |
| **Withdrawal Fee** | 0.25% | Del monto retirado |
| **FX Fee (Payout)** | 1% | Conversion USD a moneda local |

### Fees por Metodo de Payout (Estimados)

| Metodo | Fee Aproximado | Tiempo |
|--------|---------------|--------|
| ACH Next Day | ~$2.50 | 1 dia |
| ACH Instant | 4% + $1 | Minutos |
| Crypto | 5% + $1 | Variable |
| Venmo/CashApp | 5% + $1 | Instant |
| Wire Transfer | Variable | 1-2 dias |
| Local Bank (LATAM) | ~1% FX + fees locales | 2-5 dias |

### Quien paga el fee?

**Opciones:**

```typescript
// Opcion 1: Creador paga el fee (default)
const withdrawal = await client.withdrawals.create({
  company_id: "biz_CREATOR_ID",
  amount: 100.0, // Creador recibe menos el fee
  currency: "usd",
  payout_method_id: "pm_xxxxx",
});

// Opcion 2: Plataforma (Octopus) paga el fee
const withdrawal = await client.withdrawals.create({
  company_id: "biz_CREATOR_ID",
  amount: 100.0, // Creador recibe exactamente esto
  currency: "usd",
  payout_method_id: "pm_xxxxx",
  platform_covers_fees: true, // Fee se deduce del balance de Octopus
});
```

---

## 6. Flujo del Dinero

### El Gran Desafio: Fondear Whop desde MercadoPago

```
PROBLEMA CRITICO:
- Tenemos dinero en MercadoPago (CLP)
- Necesitamos ese dinero en Whop (USD)
- Como lo transferimos?
```

### Opciones para Fondear Whop

#### Opcion A: Deposito Manual via Wire/ACH

```
1. Retirar de MercadoPago a cuenta bancaria en Chile
2. Convertir CLP a USD (via banco o servicio FX)
3. Wire transfer a cuenta de Whop
4. Fondos disponibles en ledger de Whop
```

**Tiempo:** 5-10 dias habiles
**Fees:** Conversion FX + Wire fees (~2-3%)

#### Opcion B: Usar API de "Add Funds"

Whop permite "top up your platform balance" via API:

```typescript
// Esta funcionalidad existe segun docs.whop.com
// Detalles exactos requieren acceso a Platforms API
const deposit = await client.ledger.deposit({
  amount: 10000.0,
  currency: "usd",
  source: "wire", // o "ach", "card"
});
```

#### Opcion C: Card/Amazon Pay/Cash App

Whop acepta deposits via:
- Tarjeta de credito
- Amazon Pay
- Cash App

```
Esto podria funcionar para depositos mas pequenos,
pero los fees de tarjeta (2.7%+) lo hacen ineficiente.
```

### Flujo Completo Propuesto

```
[Empresa paga $100 USD via MercadoPago]
           |
           v
[Octopus recibe $100 - MercadoPago fee]
[Balance: ~$96.40 USD equivalente]
           |
           v (semanal/mensual)
[Octopus retira de MercadoPago a banco]
           |
           v
[Conversion CLP -> USD via banco/wise/etc]
           |
           v
[Wire a Whop Platform Account]
[Whop Platform Balance: +$X USD]
           |
           v (cuando creador completa trabajo)
[Octopus ejecuta Transfer via API]
           |
           v
[Creador tiene balance en Whop]
           |
           v
[Creador retira via Bitcoin/Bank/etc]
```

### Timeline Completo

| Etapa | Tiempo |
|-------|--------|
| Empresa paga | Instant |
| MercadoPago disponible | 2-14 dias |
| Retiro a banco local | 1-2 dias |
| Conversion FX | 1-2 dias |
| Wire a Whop | 2-3 dias |
| Transfer a creador | Instant |
| Creador retira | 1-5 dias |
| **TOTAL** | 7-26 dias |

---

## 7. Dashboard y Reportes

### Que ven los creadores?

Los creadores tienen acceso a:

1. **Balance Dashboard** (`/dashboard/payouts`)
   - Balance disponible
   - Balance pendiente (fondos en clearing)
   - Fecha de disponibilidad

2. **Historial de Transacciones**
   - Todas las transferencias recibidas
   - Todos los withdrawals realizados
   - Status de cada transaccion

3. **Metodos de Payout**
   - Ver metodos configurados
   - Agregar nuevos metodos
   - Establecer metodo por defecto

### Como funciona el Withdraw?

```
1. Creador va a Dashboard > Payouts
2. Ve su balance disponible
3. Click "Withdraw"
4. Selecciona monto (minimo $10)
5. Confirma metodo de payout
6. Whop procesa el withdrawal
7. Fondos llegan segun metodo (1-5 dias)
```

### Status de Payouts

Los creadores ven el status en tiempo real:
- **Processing** - En proceso
- **In Transit** - En camino
- **Completed** - Completado
- **Failed** - Fallido (con opcion de retry)

### Trace ID

Para pagos bancarios, Whop proporciona un Trace ID que permite rastrear el pago con el banco receptor.

---

## 8. Implementacion Recomendada para Octopus

### Fase 1: Setup Inicial

```typescript
// 1. Obtener acceso a Platforms API
// Contactar: sales@whop.com

// 2. Crear cuenta de plataforma
// https://whop.com/dashboard

// 3. Generar Company API Key
// Dashboard > Developer Settings

// 4. Instalar SDK
// npm install @whop/sdk @whop/embedded-components-react-js
```

### Fase 2: Onboarding de Creadores

```typescript
// services/whop.ts
import Whop from "@whop/sdk";

const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY!,
});

export async function createCreatorAccount(creator: Creator) {
  // Crear Company en Whop
  const company = await whop.companies.create({
    name: creator.name,
    // metadata adicional
  });

  // Guardar mapping en nuestra DB
  await db.creators.update({
    where: { id: creator.id },
    data: { whopCompanyId: company.id },
  });

  // Generar link de onboarding
  const accountLink = await whop.accountLinks.create({
    company_id: company.id,
    use_case: "account_onboarding",
    return_url: `${process.env.APP_URL}/creator/onboarding/complete`,
    refresh_url: `${process.env.APP_URL}/creator/onboarding/refresh`,
  });

  return accountLink.url;
}
```

### Fase 3: Proceso de Payout

```typescript
// services/payouts.ts
export async function payCreator(job: Job, amount: number) {
  const creator = await db.creators.findUnique({
    where: { id: job.creatorId },
  });

  if (!creator.whopCompanyId) {
    throw new Error("Creador no tiene cuenta Whop");
  }

  // Verificar que tenga metodo de payout
  const payoutMethods = await whop.payoutMethods.list({
    company_id: creator.whopCompanyId,
  });

  if (payoutMethods.data.length === 0) {
    throw new Error("Creador no tiene metodo de payout configurado");
  }

  // Crear transfer
  const transfer = await whop.transfers.create({
    amount: amount,
    currency: "usd",
    origin_id: process.env.OCTOPUS_WHOP_COMPANY_ID!,
    destination_id: creator.whopCompanyId,
    idempotence_key: `payout_${job.id}_${Date.now()}`,
    metadata: {
      job_id: job.id,
      campaign_name: job.campaign.name,
    },
  });

  // Registrar en nuestra DB
  await db.payouts.create({
    data: {
      jobId: job.id,
      creatorId: creator.id,
      amount: amount,
      whopTransferId: transfer.id,
      status: "transferred",
    },
  });

  return transfer;
}
```

### Fase 4: Webhook para Status Updates

```typescript
// app/api/webhooks/whop/route.ts
export async function POST(req: Request) {
  const payload = await req.json();

  switch (payload.event) {
    case "withdrawal.completed":
      await handleWithdrawalCompleted(payload.data);
      break;
    case "withdrawal.failed":
      await handleWithdrawalFailed(payload.data);
      break;
    case "payout_method.created":
      await handlePayoutMethodCreated(payload.data);
      break;
  }

  return Response.json({ received: true });
}
```

---

## 9. Pros y Contras

### PROS

1. **Cobertura Global** - 241+ territorios, incluye Chile
2. **Multiples Metodos** - Bitcoin, bank, PayPal, etc.
3. **API Moderna** - SDK bien documentado
4. **KYC Integrado** - No necesitas implementar verificacion
5. **Caso de Exito** - micro1 valida el modelo
6. **Fees Competitivos** - Especialmente vs Stripe Connect
7. **Dashboard para Creadores** - No necesitas construir UI de payouts

### CONTRAS

1. **Platforms API Invite-Only** - Necesitas aprobacion
2. **Fondeo Complejo** - Mover dinero de MercadoPago a Whop es manual
3. **Tiempo Total** - 7-26 dias del pago a creador
4. **Fees Acumulados** - MercadoPago + FX + Whop fees
5. **Dependencia** - Tercero controla payouts
6. **PayPal/Crypto Limitacion** - Requiere pago original en ese metodo

---

## 10. Alternativas Consideradas

| Solucion | Payout Chile | Crypto | KYC | API |
|----------|-------------|--------|-----|-----|
| **Whop** | Si | Si | Integrado | Excelente |
| **Stripe Connect** | Si | No | Integrado | Excelente |
| **PayPal Payouts** | Si | No | Requerido | Buena |
| **Wise Business** | Si | No | Manual | Limitada |
| **SideShift** | No | Solo Crypto | Ninguno | Buena |
| **Manual** | Si | No | Manual | N/A |

---

## 11. Recomendacion Final

### Para Octopus UGC Marketplace:

**RECOMENDACION: Implementar Whop for Platforms**

#### Justificacion:

1. **Caso Validado:** micro1 demuestra que funciona para marketplaces
2. **Chile Soportado:** Local bank rails disponibles
3. **Crypto Opcional:** Creadores pueden elegir Bitcoin si prefieren
4. **KYC Delegado:** No necesitas implementar verificacion de identidad
5. **Escalable:** API permite automatizar completamente

#### Pasos Inmediatos:

1. **Contactar Whop** - Solicitar acceso a Platforms API
   - Email: sales@whop.com
   - Explicar caso de uso: UGC marketplace, pago a creadores

2. **Resolver Fondeo** - Definir proceso para mover CLP a USD a Whop
   - Evaluar: Wise Business, banco tradicional, o crypto bridge

3. **Prototipo** - Implementar flujo basico una vez tengas acceso

4. **Piloto** - Probar con 5-10 creadores antes de lanzar

---

## 12. Enlaces y Recursos

### Documentacion Oficial
- [Whop Developer Docs](https://docs.whop.com)
- [Send Payouts Guide](https://docs.whop.com/developer/guides/payouts)
- [Manual Payouts to Connected Accounts](https://docs.whop.com/developer/platforms/manual-payouts)
- [Add Funds to Balance](https://docs.whop.com/developer/platforms/add-funds-to-your-balance)
- [Fees Documentation](https://docs.whop.com/fees)
- [Setup Payouts](https://docs.whop.com/payments/set-up-payouts)

### SDK y API
- [NPM @whop/sdk](https://www.npmjs.com/package/@whop/sdk)
- [GitHub Whop TypeScript SDK](https://github.com/whopio/whopsdk-typescript)
- [API Reference](https://docs.whop.com/api-reference)

### Help Center
- [Whop Payouts & Withdrawals](https://help.whop.com/en/articles/11430647-whop-payouts-withdrawals)
- [How To Setup Payouts](https://help.whop.com/en/articles/10336709-setup-payouts)
- [Getting Paid on Whop](https://whop.com/blog/getting-paid-on-whop/)

### Caso de Estudio
- [Whop x micro1 Partnership](https://whop.com/blog/whop-x-micro1/)
- [Whop Payments Infrastructure Announcement](https://www.barchart.com/story/news/34627628)

### Contacto
- **Sales/Partnerships:** sales@whop.com
- **Platform Access:** Formulario en whop.com/sell/platform/

---

*Documento generado el 12 de Febrero 2026*
*Investigacion realizada por Claude AI para Octopus UGC Marketplace*
