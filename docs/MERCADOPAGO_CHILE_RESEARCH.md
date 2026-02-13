# MercadoPago Chile - Investigacion Completa para Marketplace UGC

> **Fecha de investigacion:** Febrero 2026
> **Contexto:** Marketplace de UGC en Chile donde empresas pagan a creadores por contenido
> **Tipos de pago:** Fijo, por video, CPM, mensual

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Split de Pagos para Marketplaces](#2-split-de-pagos-para-marketplaces)
3. [Wallet de Empresa](#3-wallet-de-empresa)
4. [Facturacion e IVA](#4-facturacion-e-iva)
5. [Fees y Comisiones](#5-fees-y-comisiones)
6. [Integracion Tecnica](#6-integracion-tecnica)
7. [Limitaciones y Restricciones](#7-limitaciones-y-restricciones)
8. [Alternativas en Chile](#8-alternativas-en-chile)
9. [Recomendaciones para el Marketplace](#9-recomendaciones-para-el-marketplace)

---

## 1. Resumen Ejecutivo

### Puede MercadoPago funcionar para un marketplace UGC en Chile?

**SI, con limitaciones importantes:**

| Caracteristica | Disponible | Notas |
|----------------|------------|-------|
| Split de pagos | Si (1:1) | Solo entre 2 cuentas por transaccion |
| Comision del marketplace | Si | Via `marketplace_fee` o `application_fee` |
| Retencion de pagos | Parcial | No hay escrow personalizado, pero hay plazos de liberacion |
| Wallet de empresa | Si | Cuenta de empresa con saldo |
| Facturacion electronica | Si | Servicio adicional con costo |
| OAuth para vendedores | Si | Requerido para Split de Pagos |

### Modelo recomendado

```
[Empresa] --paga--> [MercadoPago] --split--> [Marketplace (comision)]
                                  --split--> [Creador (pago neto)]
```

---

## 2. Split de Pagos para Marketplaces

### 2.1 Como funciona el Split de Pagos

La solucion **Split de Pagos** de MercadoPago esta disenada especificamente para marketplaces. Permite dividir automaticamente un pago entre:

1. **El vendedor** (en tu caso, el creador de contenido)
2. **El marketplace** (tu plataforma, que cobra comision)

**Flujo del dinero:**
```
Pago Total = $100.000 CLP
  |
  |--> Comision MercadoPago (ej: 3,19%) = $3.190
  |
  |--> Comision Marketplace (ej: 15%) = $14.521
  |
  '--> Pago neto al Creador = $82.289
```

> **IMPORTANTE:** La comision de MercadoPago se descuenta PRIMERO del monto del vendedor, y luego la comision del marketplace se descuenta del saldo restante.

### 2.2 Modelos disponibles

| Modelo | Descripcion | Disponibilidad |
|--------|-------------|----------------|
| **1:1** | Un pago se divide entre marketplace y UN vendedor | Documentacion publica disponible |
| **1:N** | Un pago se divide entre marketplace y MULTIPLES vendedores | Requiere contactar equipo comercial |

Para tu caso de marketplace UGC, el modelo **1:1** deberia ser suficiente ya que cada pago va a un creador especifico.

### 2.3 Retencion de Pagos (Escrow)

**MercadoPago NO tiene un sistema de escrow personalizable como Stripe Connect.**

Sin embargo, existen mecanismos de retencion:

1. **Plazos de liberacion naturales:**
   - Sin reputacion: 6 dias despues de entrega confirmada
   - Usuario normal: 14 dias despues de acreditado
   - Usuario profesional: 2 dias despues de acreditado

2. **Dinero retenido automaticamente por:**
   - Reclamos de compradores
   - Contracargos bancarios
   - Verificaciones de seguridad

3. **Configuracion de plazos:**
   - Puedes configurar tasas y plazos desde "Tu Negocio" > "Costos"
   - Para configuraciones especiales de liberacion (`money_release_days`), debes contactar a tu ejecutivo comercial

**Solucion para aprobar antes de pagar:**
- Implementar logica en tu backend
- Solo crear el pago cuando el contenido sea aprobado
- Mantener un registro interno del estado del trabajo

### 2.4 APIs y parametros clave

#### Para Checkout Pro (Preferencias):
```javascript
// POST https://api.mercadopago.com/checkout/preferences
{
  "items": [
    {
      "id": "contenido-ugc-123",
      "title": "Video UGC para Campana X",
      "quantity": 1,
      "unit_price": 100000,
      "currency_id": "CLP"
    }
  ],
  "marketplace_fee": 15000, // Monto en CLP (no porcentaje)
  "notification_url": "https://tu-marketplace.cl/webhooks/mercadopago",
  "back_urls": {
    "success": "https://tu-marketplace.cl/pago/exito",
    "failure": "https://tu-marketplace.cl/pago/error",
    "pending": "https://tu-marketplace.cl/pago/pendiente"
  }
}
```

#### Para Checkout API (Pagos directos):
```javascript
// POST https://api.mercadopago.com/v1/payments
{
  "transaction_amount": 100000,
  "description": "Pago por contenido UGC",
  "payment_method_id": "master",
  "token": "{{card_token}}",
  "installments": 1,
  "payer": {
    "email": "empresa@ejemplo.cl"
  },
  "application_fee": 15000 // Comision del marketplace
}
```

> **IMPORTANTE:** Para usar `application_fee`, el Access Token DEBE ser obtenido via OAuth (no credenciales directas).

### 2.5 Requisitos previos para Split de Pagos

1. **Cuenta de MercadoPago verificada** para el marketplace
2. **Aplicacion creada** en "Tus integraciones"
3. **OAuth implementado** para vincular cuentas de vendedores (creadores)
4. **Access Token** de cada vendedor obtenido via OAuth
5. Contactar equipo comercial para configuraciones especiales de liberacion

**Documentacion oficial:**
- https://www.mercadopago.cl/developers/es/docs/split-payments/landing
- https://www.mercadopago.cl/developers/es/docs/split-payments/prerequisites

---

## 3. Wallet de Empresa

### 3.1 Tipos de cuenta disponibles

MercadoPago ofrece dos tipos de cuenta:

| Tipo | Descripcion | Para tu caso |
|------|-------------|--------------|
| **Cuenta Personal** | Para personas naturales | Creadores individuales |
| **Cuenta de Empresa** | Para negocios y empresas | Empresas que contratan creadores |

### 3.2 Como depositar fondos

Las empresas pueden cargar saldo en su cuenta MercadoPago de varias formas:

1. **Transferencia bancaria:**
   - Desde cuenta corriente o cuenta vista chilena
   - Sin costo
   - Requiere vincular cuenta bancaria previamente

2. **Deposito en efectivo:**
   - En puntos Servipag
   - En sucursales Santander
   - En tiendas asociadas

3. **QR desde banco:**
   - Escanear codigo QR de MercadoPago desde app del banco

4. **Tarjeta de credito:**
   - Hasta $100.000 CLP/mes sin costo
   - Sobre $100.000: 4,75% de comision

### 3.3 Flujo para empresas en tu marketplace

```
1. Empresa crea cuenta MercadoPago de empresa
2. Vincula su cuenta bancaria
3. Deposita fondos (transferencia gratuita)
4. Autoriza tu marketplace via OAuth
5. Cuando aprueba contenido, tu backend crea el pago
6. MercadoPago divide automaticamente:
   - Comision tuya -> tu cuenta
   - Pago neto -> cuenta del creador
```

### 3.4 Rentabilidad del saldo

El saldo en MercadoPago Chile genera rentabilidad diaria (hasta ~10% anual) a traves de fondos mutuos de BICE. Esto es un beneficio adicional para empresas que mantienen saldo.

---

## 4. Facturacion e IVA

### 4.1 Documentos tributarios en Chile

| Documento | Uso | Credito Fiscal |
|-----------|-----|----------------|
| **Boleta electronica** | Ventas a consumidor final | NO |
| **Factura electronica** | Ventas entre empresas (B2B) | SI |

### 4.2 MercadoPago genera facturas?

**Si, pero es un servicio adicional con costo:**

| Plan | Costo | Incluye |
|------|-------|---------|
| Solo Boletas | $11.000 + IVA/mes | Boletas electronicas |
| Solo Boletas (anual) | $105.600 + IVA/ano | Boletas electronicas |
| Boletas + Facturas | $38.000 + IVA/mes | Ambos documentos |

### 4.3 Requisitos para facturacion

1. **Inicio de actividades en SII**
2. **Configuracion del modelo de emision** en SII (recomendado: "Siempre emito Boleta de Ventas y Servicios electronicos")
3. **Activacion del servicio** (puede tardar 72 horas para boletas, 2 semanas para facturas)

### 4.4 Flujo de facturacion para tu marketplace

**Para tu modelo B2B (empresas pagando a creadores):**

```
Empresa paga $100.000 por contenido UGC
  |
  |--> Tu marketplace emite factura a la empresa por comision ($15.000 + IVA)
  |
  '--> Creador emite boleta/factura a empresa por su servicio ($85.000)
       (o al marketplace, segun modelo legal)
```

**Consideracion importante:** El modelo juridico exacto de quien factura a quien depende de como estructures tu marketplace:
- **Modelo 1:** Creador factura directamente a empresa, tu cobras comision
- **Modelo 2:** Tu facturas a empresa, tu pagas a creador

Consulta con un contador para determinar el modelo mas conveniente.

### 4.5 IVA en Chile

- IVA general: **19%**
- Los servicios de contenido UGC estan afectos a IVA
- Las comisiones de MercadoPago incluyen IVA (se suma al porcentaje)

---

## 5. Fees y Comisiones

### 5.1 Comisiones de MercadoPago Chile (2025-2026)

| Metodo de cobro | Comision | Notas |
|-----------------|----------|-------|
| **Checkout/Links de pago - Credito** | 3,19% + IVA | Acreditacion instantanea |
| **Checkout/Links de pago - Debito** | 2,89% + IVA | Acreditacion instantanea |
| **Point Smart - Debito** | 2,19% + IVA | Terminal fisica |
| **Point Smart - Credito** | 2,79% + IVA | Terminal fisica |
| **QR** | Variable | Segun plazo de acreditacion |
| **Transferencia a banco** | GRATIS | Sin costo para retirar |

### 5.2 Como cobrar tu comision de marketplace

Usando los parametros `marketplace_fee` o `application_fee`:

```javascript
// El monto es en CLP (moneda local), NO porcentaje
{
  "marketplace_fee": 15000  // $15.000 CLP de comision
}
```

**Calculo de comision dinamica:**
```javascript
const precioTotal = 100000; // $100.000 CLP
const porcentajeComision = 0.15; // 15%
const comisionMarketplace = Math.round(precioTotal * porcentajeComision);

const preference = {
  items: [{
    title: "Video UGC",
    unit_price: precioTotal,
    quantity: 1
  }],
  marketplace_fee: comisionMarketplace // 15000
};
```

### 5.3 Ejemplo completo de distribucion

```
Pago del cliente: $100.000 CLP

Comision MercadoPago (3,19% + IVA = 3,80%): -$3.800
Subtotal despues de MP: $96.200

Comision Marketplace (15% de subtotal): -$14.430
Pago neto al creador: $81.770
```

> **Nota:** La formula exacta puede variar. MercadoPago cobra su comision primero, luego tu comision se calcula sobre el restante.

---

## 6. Integracion Tecnica

### 6.1 SDKs disponibles

| Plataforma | Paquete | Uso |
|------------|---------|-----|
| **React** | `@mercadopago/sdk-react` | Frontend, Checkout Bricks |
| **JavaScript** | `@mercadopago/sdk-js` | Frontend vanilla |
| **Node.js** | `mercadopago` | Backend, API calls |

### 6.2 Instalacion

```bash
# Frontend (React/Next.js)
npm install @mercadopago/sdk-react

# Backend (Node.js)
npm install mercadopago
```

### 6.3 Configuracion Frontend (React/Next.js)

```typescript
// app/providers/MercadoPagoProvider.tsx
'use client';

import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect } from 'react';

export function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
      locale: 'es-CL'
    });
  }, []);

  return <>{children}</>;
}
```

### 6.4 Configuracion Backend (Node.js/Next.js API Routes)

```typescript
// lib/mercadopago.ts
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Cliente principal del marketplace
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: { timeout: 5000 }
});

// Para crear pagos en nombre de vendedores (requiere OAuth)
export function getSellerClient(sellerAccessToken: string) {
  return new MercadoPagoConfig({
    accessToken: sellerAccessToken,
    options: { timeout: 5000 }
  });
}

export { mpClient };
```

### 6.5 Crear preferencia de pago con Split

```typescript
// app/api/payments/create-preference/route.ts
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(request: Request) {
  const body = await request.json();
  const {
    creatorAccessToken, // Obtenido via OAuth
    contentId,
    title,
    amount,
    marketplaceFeePercent = 0.15
  } = body;

  // Usar el access token del creador (obtenido via OAuth)
  const client = new MercadoPagoConfig({
    accessToken: creatorAccessToken
  });

  const preference = new Preference(client);

  const marketplaceFee = Math.round(amount * marketplaceFeePercent);

  const result = await preference.create({
    body: {
      items: [
        {
          id: contentId,
          title: title,
          quantity: 1,
          unit_price: amount,
          currency_id: 'CLP'
        }
      ],
      marketplace_fee: marketplaceFee,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/payments/failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/payments/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      external_reference: contentId
    }
  });

  return NextResponse.json({
    preferenceId: result.id,
    initPoint: result.init_point
  });
}
```

### 6.6 Implementar OAuth para vincular creadores

```typescript
// app/api/auth/mercadopago/route.ts
import { NextResponse } from 'next/server';

// Paso 1: Redirigir al creador a MercadoPago para autorizar
export async function GET() {
  const authUrl = new URL('https://auth.mercadopago.cl/authorization');
  authUrl.searchParams.set('client_id', process.env.MERCADOPAGO_CLIENT_ID!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('platform_id', 'mp');
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mercadopago/callback`);

  return NextResponse.redirect(authUrl.toString());
}

// app/api/auth/mercadopago/callback/route.ts
// Paso 2: Recibir el codigo y obtener access token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // Intercambiar codigo por access token
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MERCADOPAGO_CLIENT_ID!,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mercadopago/callback`
    })
  });

  const data = await response.json();

  // Guardar en tu base de datos:
  // - data.access_token (valido por 180 dias)
  // - data.refresh_token (para renovar)
  // - data.user_id (ID del usuario en MercadoPago)

  // Redirigir al dashboard del creador
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/creator/wallet?connected=true`);
}
```

### 6.7 Webhooks

**Configuracion recomendada: Webhooks (no IPN)**

> Las notificaciones IPN seran descontinuadas. Usar Webhooks.

```typescript
// app/api/webhooks/mercadopago/route.ts
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.json();

  // Validar firma (opcional pero recomendado)
  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  // Procesar segun el tipo de evento
  if (body.type === 'payment') {
    const paymentId = body.data.id;

    // Obtener detalles del pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!
    });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    switch (paymentData.status) {
      case 'approved':
        // Pago aprobado - actualizar estado en tu DB
        // Liberar contenido, notificar al creador, etc.
        await handleApprovedPayment(paymentData);
        break;
      case 'pending':
        // Pago pendiente
        await handlePendingPayment(paymentData);
        break;
      case 'rejected':
        // Pago rechazado
        await handleRejectedPayment(paymentData);
        break;
    }
  }

  // IMPORTANTE: Responder con 200/201 para que MP no reintente
  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleApprovedPayment(payment: any) {
  const contentId = payment.external_reference;
  // Actualizar estado del contenido en DB
  // Enviar notificacion al creador
  // etc.
}
```

### 6.8 Eventos de Webhook disponibles

| Evento | Descripcion |
|--------|-------------|
| `payment.created` | Pago creado, pendiente |
| `payment.updated` | Estado del pago actualizado (aprobado/rechazado) |
| `merchant_order` | Orden del comercio actualizada |
| `chargebacks` | Contracargo recibido |

### 6.9 Variables de entorno necesarias

```env
# .env.local

# Credenciales del Marketplace
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
MERCADOPAGO_CLIENT_ID=xxx
MERCADOPAGO_CLIENT_SECRET=xxx

# Para frontend
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxx
NEXT_PUBLIC_APP_URL=https://tu-marketplace.cl
```

---

## 7. Limitaciones y Restricciones

### 7.1 Limitaciones criticas para marketplaces

| Limitacion | Impacto | Solucion alternativa |
|------------|---------|---------------------|
| **Split solo 1:1** | No puedes dividir un pago entre multiples creadores | Un pago por creador, o contactar comercial para 1:N |
| **No hay escrow personalizable** | No puedes retener pagos hasta aprobacion | Implementar logica de aprobacion antes de crear el pago |
| **Solo pesos chilenos** | No puedes cobrar en USD | N/A, usar CLP |
| **No transferencias internacionales** | No puedes pagar a creadores extranjeros | Usar otra solucion para pagos internacionales |
| **Comision se descuenta del vendedor** | El creador recibe menos, no la empresa | Ajustar precios para compensar |

### 7.2 Limites de transacciones

- **Nuevos usuarios:** Restricciones durante primeros 30 dias
- **Limites diarios de transferencia:** Configurables, pero con tope maximo
- **Tarjeta de credito para depositar:** Max $100.000 CLP/mes gratis, luego 4,75%

### 7.3 Restricciones geograficas

- Solo opera en Chile (y otros paises de LATAM por separado)
- No acepta tarjetas extranjeras para depositos
- No permite transferencias internacionales

### 7.4 Tiempos de liberacion

| Tipo de usuario | Tiempo de liberacion |
|-----------------|---------------------|
| Sin reputacion | 6 dias despues de entrega |
| Normal | 14 dias despues de acreditado |
| Profesional | 2 dias despues de acreditado |

### 7.5 Contracargos y disputas

- MercadoPago puede retener fondos ante reclamos
- El marketplace NO puede emitir reembolso total si el vendedor no tiene saldo
- Los contracargos congelan el dinero hasta resolucion

---

## 8. Alternativas en Chile

### 8.1 Comparativa de pasarelas

| Pasarela | Comision | Mejor para | Split de pagos |
|----------|----------|------------|----------------|
| **MercadoPago** | 3,19% + IVA | Integracion rapida, Shopify | Si (1:1) |
| **Flow** | 0,99% - 2,98% + IVA | Comisiones bajas | Si |
| **Transbank/Webpay** | 0,5% - 1,5% + IVA | Confianza masiva | No nativo |
| **Khipu** | 0,69% + IVA | Transferencias bancarias | No |

### 8.2 Por que NO Stripe en Chile?

Stripe no opera directamente en Chile. Las empresas chilenas no pueden crear cuentas Stripe locales. Existen workarounds con Stripe Atlas, pero complican la operacion.

### 8.3 Recomendacion hibrida

Considera usar:
- **MercadoPago** para pagos con tarjeta y split automatico
- **Khipu** para transferencias bancarias (menor comision)
- **Flow** como backup o para features especificos

---

## 9. Recomendaciones para el Marketplace UGC

### 9.1 Arquitectura recomendada

```
                    [Empresa]
                        |
                        v
            +---[Tu Marketplace]---+
            |                      |
            v                      v
    [Contenido/Jobs]        [Sistema de Pagos]
            |                      |
            v                      v
    [Aprobacion]           [MercadoPago API]
            |                      |
            +-------> [Webhook] <--+
                          |
                          v
                 [Base de Datos]
                          |
            +-------------+-------------+
            |                           |
            v                           v
    [Notificacion            [Liberar contenido
     al creador]              a empresa]
```

### 9.2 Flujo de pago recomendado

1. **Empresa crea job** con precio acordado
2. **Creador acepta** y sube contenido
3. **Empresa revisa** el contenido
4. **Si aprueba:**
   - Backend crea preferencia de pago en MercadoPago
   - Empresa completa el pago (checkout o saldo)
   - Webhook confirma pago aprobado
   - Sistema libera contenido a empresa
   - Creador recibe pago (menos comisiones)
5. **Si rechaza:**
   - Creador puede editar y reenviar
   - No se crea pago hasta aprobacion

### 9.3 Manejo de tipos de pago

| Tipo | Implementacion con MercadoPago |
|------|-------------------------------|
| **Pago fijo** | Una preferencia por monto acordado |
| **Por video** | Una preferencia por cada video aprobado |
| **CPM** | Calcular monto basado en vistas, crear preferencia mensual |
| **Mensual** | Suscripcion o pagos recurrentes manuales |

### 9.4 Para pagos recurrentes (mensual/CPM)

MercadoPago tiene suscripciones, pero para tu caso seria mejor:

1. Calcular el monto mensual basado en metricas
2. Crear un pago unico cada mes
3. Automatizar con cron job

```typescript
// Ejemplo: Cron mensual para pagos CPM
async function processMonthlyPayments() {
  const activeContracts = await getActiveMonthlyContracts();

  for (const contract of activeContracts) {
    const views = await getMonthlyViews(contract.creatorId);
    const amount = views * contract.cpmRate / 1000;

    if (amount > 0) {
      await createPaymentPreference({
        creatorAccessToken: contract.creatorMpToken,
        amount: Math.round(amount),
        title: `Pago CPM - ${new Date().toLocaleDateString('es-CL', { month: 'long' })}`
      });
    }
  }
}
```

### 9.5 Checklist de implementacion

- [ ] Crear cuenta de MercadoPago de empresa para el marketplace
- [ ] Crear aplicacion en "Tus integraciones"
- [ ] Configurar URLs de webhook (produccion y pruebas)
- [ ] Implementar OAuth para vincular creadores
- [ ] Guardar access tokens de creadores en DB (encriptados)
- [ ] Implementar endpoint para crear preferencias
- [ ] Implementar webhook handler
- [ ] Probar con credenciales de sandbox
- [ ] Migrar a produccion
- [ ] Configurar facturacion electronica (si aplica)

---

## Referencias y Documentacion Oficial

### Documentacion principal
- [Split de Pagos - Landing](https://www.mercadopago.cl/developers/es/docs/split-payments/landing)
- [Requisitos previos](https://www.mercadopago.cl/developers/es/docs/split-payments/prerequisites)
- [Integrar marketplace](https://www.mercadopago.cl/developers/es/docs/split-payments/integration-configuration/integrate-marketplace)

### APIs
- [Crear preferencia](https://mercadopago.cl/developers/es/reference/preferences/_checkout_preferences/post)
- [Crear pago](https://www.mercadopago.cl/developers/es/reference/payments/_payments/post)

### OAuth
- [OAuth introduccion](https://www.mercadopago.cl/developers/es/docs/security/oauth/introduction)
- [Obtener Access Token](https://www.mercadopago.cl/developers/es/docs/security/oauth/creation)

### Webhooks
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)

### SDKs
- [SDK React](https://www.npmjs.com/package/@mercadopago/sdk-react)
- [SDK JavaScript](https://www.npmjs.com/package/@mercadopago/sdk-js)
- [SDK Node.js](https://www.npmjs.com/package/mercadopago)
- [GitHub MercadoPago](https://github.com/mercadopago)

### Comisiones y costos
- [Comisiones MercadoPago Chile](https://www.mercadopago.cl/ayuda/costo-recibir-pagos-dinero_220)
- [Servicio de Boletas y Facturas](https://www.mercadopago.cl/ayuda/cuanto-cuesta-pagar-boletas-facturas_38827)

### Soporte
- [Foro de desarrolladores](https://groups.google.com/g/mercadopago-developers)
- [Discord oficial](https://discord.gg/mercadopago)

---

## Conclusiones

### MercadoPago ES viable para tu marketplace UGC en Chile, con estas consideraciones:

**Pros:**
- Split de pagos automatico (1:1)
- SDK moderno para React/Next.js
- Buena documentacion
- Amplia adopcion en Chile
- Transferencias bancarias gratis

**Contras:**
- No hay escrow personalizable
- Comisiones mas altas que alternativas
- Split 1:N requiere contactar comercial
- Plazos de liberacion no totalmente configurables

**Recomendacion final:**
Usar MercadoPago como solucion principal, implementando la logica de aprobacion en tu backend antes de crear los pagos. Para casos especiales (pagos internacionales, escrow avanzado), evaluar soluciones complementarias.
