# Investigacion Profunda: Flow.cl como Procesador de Pagos para Chile

## Contexto del Analisis
- **Proyecto:** Marketplace de UGC en Chile
- **Objetivo:** Evaluar Flow.cl como alternativa a MercadoPago
- **Restriccion:** Stripe no esta disponible en Chile
- **Fecha de investigacion:** Febrero 2025

---

## 1. Que es Flow.cl

### Informacion General

**Flow** es una plataforma de pagos online chilena fundada en 2013 como spin-off de Tuxpan Ingenieria. Es considerada la plataforma de pagos de referencia en Chile.

**Datos clave:**
- **Fundacion:** 2013 en Chile
- **Clientes:** Mas de 75,000 clientes
- **Transacciones:** Mas de 1 millon de transacciones mensuales
- **Volumen:** Procesa mas de 40 millones de dolares al ano
- **Presencia regional:** Chile, Peru y Mexico
- **Certificacion:** PCI DSS (maximo nivel de seguridad)
- **Premio:** Reconocimiento de la Camara de Comercio de Santiago y eCommerce Institute

### Metodos de Pago Soportados

Flow integra **mas de 30 medios de pago** en una sola plataforma:

| Metodo | Descripcion |
|--------|-------------|
| **WebPay Plus** | Tarjetas de credito, debito y prepago (Visa, MasterCard, American Express) |
| **Khipu** | Transferencias bancarias instantaneas |
| **MACH** | Tarjeta prepago virtual (popular entre jovenes) |
| **Servipag** | Pagos presenciales y online |
| **Multicaja** | Pagos electronicos |
| **CryptoCompra** | Criptomonedas |
| **OnePay** | Billetera digital |
| **Chek** | Pagos digitales |

### Productos y Servicios

1. **Pago Flow (Pasarela de Pagos):** Servicio principal para recibir pagos online
2. **Cobro por Link:** Enlace de pago compartible via email, redes sociales o mensajeria
3. **Boton de Pago:** Widget integrable en sitios web
4. **Cobro Masivo:** Para alto volumen de pagos recurrentes (colegios, academias)
5. **Pagos Recurrentes/Suscripciones:** Cargos automaticos periodicos
6. **Terminal Virtual:** POS virtual para ventas remotas
7. **Reportes y Panel de Control:** Dashboard completo de transacciones

---

## 2. Flow para Marketplaces

### Funcionalidad de Comercios Asociados (Merchants)

Flow **SI tiene funcionalidad para marketplaces** a traves de su sistema de "Comercios Asociados" (Merchants).

#### API de Merchants

La API REST de Flow incluye el modulo `Merchants` para gestion de comercios asociados:

**Endpoints disponibles:**

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/merchant/create` | Crear comercio asociado |
| POST | `/merchant/edit` | Editar comercio asociado |
| POST | `/merchant/delete` | Eliminar comercio asociado |
| GET | `/merchant/get` | Obtener datos de comercio |
| GET | `/merchant/list` | Listar comercios asociados |

#### Division de Pagos (Split Payments)

Segun la documentacion, Flow ofrece:

> "La funcion de eventos o marketplace que permite dividir los pagos entre varias cuentas, incluso en distintos porcentajes."

**Caracteristicas:**
- Division de pagos entre multiples cuentas
- Porcentajes configurables por transaccion
- Liquidacion automatica a comercios asociados

### Retencion de Fondos

Flow tiene la capacidad de retener fondos bajo ciertas condiciones:

> "Con el fin de garantizar la calidad y seguridad del servicio, antes de realizar las transferencias de fondos, Flow se reserva el derecho de solicitar informacion adicional al comercio y/o a los pagadores."

**Sistema de liquidacion:**
- Deposito al **primer dia habil**: 3.19% + IVA
- Deposito al **tercer dia habil**: 2.89% + IVA

**Nota importante:** La informacion sobre escrow o retencion programatica de fondos (como la que ofrece Stripe Connect) no esta explicitamente documentada. Se recomienda **contactar directamente a Flow** para confirmar capacidades de escrow para marketplaces.

---

## 3. Comparacion con MercadoPago

### Tabla Comparativa de Fees

| Caracteristica | Flow Chile | MercadoPago |
|----------------|------------|-------------|
| **Comision base** | 2.89% + IVA (3.44% total) | 2.69% - 2.99% + IVA |
| **Acreditacion rapida** | 3.19% + IVA (1 dia) | 3.19% + IVA (instantaneo) |
| **Tiempo de abono estandar** | 3 dias habiles | 2 dias habiles |
| **Costos fijos** | No | No |
| **Costo de reembolso** | $202 + IVA por transaccion | Incluido |
| **Costo de inscripcion** | No | No |
| **Monto minimo** | 350 CLP | Variable |

### Comparativa de Funcionalidades

| Funcionalidad | Flow | MercadoPago |
|---------------|------|-------------|
| **Split Payments Marketplace** | Si (Merchants API) | Si (Split Payments API) |
| **API REST** | Si | Si (Checkout API) |
| **Webhooks** | Si (callbacks) | Si |
| **SDKs oficiales** | PHP solamente | Multiples lenguajes |
| **Plugins e-commerce** | WooCommerce, Shopify, Prestashop, Jumpseller, etc. | WooCommerce, Shopify, Magento, etc. |
| **Pagos recurrentes** | Si | Si |
| **Reembolsos** | Si | Si |
| **Personalizacion checkout** | Alta | Media (entorno MP) |
| **Pagos con criptomonedas** | Si (CryptoCompra) | No |
| **Proteccion al comprador** | Basica | Avanzada |

### Comparativa de Facilidad de Integracion

| Aspecto | Flow | MercadoPago |
|---------|------|-------------|
| **Documentacion** | Buena, en espanol | Excelente, multiidioma |
| **SDK oficiales** | Solo PHP | PHP, Node, Python, Java, Ruby, .NET |
| **Librerias comunidad** | Algunas (Node, Meteor) | Muchas |
| **Sandbox/Testing** | Si (sandbox.flow.cl) | Si |
| **Soporte tecnico** | Email y telefono | Email, chat, foros |
| **Postman Collection** | Si | Si |

### Cual es Mejor para Marketplace UGC?

#### Flow es mejor si:
- Necesitas **comisiones mas bajas** (2.89% vs ~3%)
- Requieres **mayor flexibilidad** en personalizacion de checkout
- Quieres **aceptar criptomonedas**
- Buscas una solucion **100% chilena** con soporte local
- No necesitas empresa formalizada para empezar
- Prefieres **control total** sobre la experiencia de pago

#### MercadoPago es mejor si:
- Vendes tambien en **Mercado Libre**
- Necesitas **proteccion al comprador** avanzada
- Requieres **SDKs en multiples lenguajes** (especialmente Node.js)
- Prefieres una marca **mas reconocida** por consumidores
- Necesitas **Split Payments documentado exhaustivamente**
- Quieres **acreditacion instantanea** de fondos

#### Recomendacion para Marketplace UGC:

Para un marketplace de UGC en Chile, **MercadoPago tiene ventaja** por:

1. **Documentacion superior de Split Payments:** La solucion esta mejor documentada y diseñada especificamente para marketplaces
2. **Proteccion integrada:** El sistema de disputas protege tanto a creadores como a marcas
3. **SDKs multiples:** Facilita integracion con stack tecnologico variado
4. **Menor riesgo de retencion:** Proceso de pagos mas establecido

**Sin embargo, Flow es viable** si:
- Prefieres fees mas bajos
- Tienes capacidad de desarrollar integraciones custom con PHP
- Necesitas flexibilidad adicional en el flujo de pagos

---

## 4. Integracion Tecnica

### API de Flow

**Protocolo:** REST API con JSON

**Ambientes:**
- **Produccion:** `https://www.flow.cl/api`
- **Sandbox:** `https://sandbox.flow.cl/api`

**Autenticacion:**
- **ApiKey:** Identificador de comercio
- **SecretKey:** Para firmar todas las peticiones (seguridad)

**Caracteristica importante:** Todos los parametros deben ser **firmados con el SecretKey** antes de enviarse.

### Modulos de la API

| Modulo | Descripcion |
|--------|-------------|
| **Payments** | Crear y gestionar pagos |
| **Customer** | Gestion de clientes, cobros, cargos automaticos |
| **Refunds** | Reembolsos |
| **Subscriptions** | Suscripciones y cobros recurrentes |
| **Subscriptions Items** | Items adicionales de suscripciones |
| **Coupons** | Cupones de descuento |
| **Settlement** | Liquidaciones de pagos y comisiones |
| **Merchants** | Gestion de comercios asociados (MARKETPLACE) |

### SDKs Disponibles

| Lenguaje | Tipo | Repositorio |
|----------|------|-------------|
| **PHP** | Oficial | [flowcl-api-client-php](https://github.com/CriptoPagos/flowcl-api-client-php) |
| **Node.js** | Comunidad | [node-flow-cl](https://github.com/EstebanFuentealba/node-flow-cl) |
| **Meteor** | Comunidad | [flow (nicolaslopezj)](https://github.com/nicolaslopezj/flow) |

### Webhooks (Callbacks)

Flow utiliza un sistema de callbacks para notificaciones asincronas:

1. Al crear un pago, se envia `urlConfirmation` como parametro
2. Flow hace POST a esa URL con el `token` de la transaccion
3. El comercio invoca `payment/getStatus` para obtener el resultado

### Ejemplo de Codigo - Crear Pago (PHP)

```php
<?php
require_once 'FlowApi.php';

$flowApi = new FlowApi();

$params = [
    'commerceOrder' => 'orden-123',
    'subject' => 'Pago por servicio UGC',
    'currency' => 'CLP',
    'amount' => 50000,
    'email' => 'cliente@email.com',
    'urlConfirmation' => 'https://tudominio.com/flow/confirmar',
    'urlReturn' => 'https://tudominio.com/flow/retorno'
];

try {
    $response = $flowApi->send('payment/create', $params, 'POST');

    // Redirigir al usuario a Flow
    $redirectUrl = $response['url'] . '?token=' . $response['token'];
    header('Location: ' . $redirectUrl);

} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
```

### Ejemplo de Codigo - Crear Comercio Asociado (PHP)

```php
<?php
$params = [
    'name' => 'Creador UGC Juan',
    'email' => 'juan@creator.com',
    'url' => 'https://creador.octopus.cl/juan',
    'commerceOrder' => 'merchant-456'
];

$response = $flowApi->send('merchant/create', $params, 'POST');
$merchantId = $response['id'];
```

### Ejemplo de Codigo - Node.js (Libreria Comunidad)

```javascript
const Flow = require('flowcl-node-api-client');

const flow = new Flow({
  apiKey: process.env.FLOW_API_KEY,
  secretKey: process.env.FLOW_SECRET_KEY,
  sandbox: true // false para produccion
});

// Crear pago
const payment = await flow.payment.create({
  commerceOrder: 'orden-123',
  subject: 'Servicio UGC',
  currency: 'CLP',
  amount: 50000,
  email: 'cliente@email.com',
  urlConfirmation: 'https://app.com/confirm',
  urlReturn: 'https://app.com/return'
});

// Redirigir usuario
console.log(payment.url + '?token=' + payment.token);
```

### Plugins Disponibles

| Plataforma | Estado |
|------------|--------|
| WooCommerce | Oficial |
| Shopify | Oficial |
| PrestaShop | Oficial |
| Magento | Oficial |
| Jumpseller | Oficial |
| VirtueMart | Oficial |
| OpenCart | Oficial |
| Tienda Nube | Oficial |
| Wix | Oficial |
| WHMCS | Oficial |
| VTEX | Oficial |

---

## 5. Casos de Uso

### Empresas que Usan Flow

Flow ha trabajado con clientes en diversas industrias:

- **Gubernamental**
- **Bancaria**
- **Seguros**
- **Telecomunicaciones**
- **E-commerce general**
- **Educacion (colegios, academias)**
- **Servicios de suscripcion**

**Nota:** Flow no publica casos de exito con nombres especificos de empresas en su sitio publico.

### Tipos de Negocios Ideales para Flow

1. **Emprendimientos:** Sin requisitos de empresa formalizada
2. **Pymes:** Comisiones competitivas sin costos fijos
3. **E-commerce:** Multiples plugins listos para usar
4. **Servicios recurrentes:** Gimnasios, SaaS, academias
5. **Ventas por redes sociales:** Links de pago compartibles
6. **Marketplaces:** Sistema de comercios asociados

### Experiencias Documentadas

**Positivas:**
- Facil configuracion inicial
- Sin costos de activacion
- Soporte en español
- Multiples medios de pago integrados
- Buena estabilidad de plataforma

**Desafios reportados:**
- SDK oficial solo para PHP
- Documentacion menos completa que competidores internacionales
- Tasa de exito de pagos internacionales ~30%

---

## 6. Limitaciones de Flow

### Lo que Flow NO puede hacer (o tiene limitaciones)

| Limitacion | Detalle |
|------------|---------|
| **SDKs limitados** | Solo PHP oficial; Node.js/Python requieren librerias de comunidad |
| **Escrow/Custodia** | No hay documentacion publica de escrow programatico como Stripe Connect |
| **Pagos internacionales** | Tasa de exito ~30% para tarjetas extranjeras |
| **Monto minimo** | 350 CLP minimo por transaccion |
| **Multi-sitio** | Una cuenta para multiples sitios puede causar conflictos |
| **Split automatico** | Menos documentado que MercadoPago |
| **Proteccion al comprador** | Menos robusta que MercadoPago |

### Comparativa Final: Flow vs MercadoPago para Marketplace UGC

| Criterio | Flow | MercadoPago | Mejor para UGC |
|----------|------|-------------|----------------|
| **Fees** | 2.89% + IVA | 2.69-2.99% + IVA | Empate |
| **Split Payments docs** | Basica | Completa | MercadoPago |
| **SDK Node.js** | Comunidad | Oficial | MercadoPago |
| **Escrow/Custodia** | No documentado | Parcial | MercadoPago |
| **Proteccion disputas** | Basica | Avanzada | MercadoPago |
| **Personalizacion** | Alta | Media | Flow |
| **Soporte local Chile** | Excelente | Bueno | Flow |
| **Criptomonedas** | Si | No | Flow |
| **Tiempo acreditacion** | 3 dias | 2 dias | MercadoPago |

---

## 7. Recomendaciones para Octopus UGC Marketplace

### Opcion Recomendada: MercadoPago

Para el marketplace de UGC, **MercadoPago es la mejor opcion** por:

1. **Split Payments bien documentado** para dividir pagos entre marketplace y creadores
2. **Proteccion integrada** para disputas entre marcas y creadores
3. **SDK oficial de Node.js** compatible con el stack del proyecto
4. **Mayor confianza del consumidor** en Chile

### Opcion Alternativa: Flow

Flow seria viable como **segunda opcion o complemento** si:
- Se necesita aceptar criptomonedas
- Se requiere mayor personalizacion del checkout
- Se prefiere tener un proveedor alternativo como backup

### Modelo Hibrido Sugerido

```
1. MercadoPago como procesador principal
   - Manejar pagos de marcas
   - Split payments a creadores
   - Proteccion de transacciones

2. Flow como alternativo (futuro)
   - Ofrecer mas opciones de pago
   - Aceptar criptomonedas
   - Reducir dependencia de un solo proveedor
```

### Proximos Pasos

1. **Contactar a MercadoPago Chile** para confirmar disponibilidad de Split Payments para tu tipo de negocio
2. **Solicitar acceso a Sandbox** de MercadoPago
3. **Contactar a Flow** para confirmar capacidades de escrow/custodia si se considera como alternativa
4. **Evaluar fees negociados** - Ambos proveedores pueden ofrecer mejores tasas por volumen

---

## Fuentes y Referencias

### Documentacion Oficial
- [Flow Chile - Sitio Principal](https://web.flow.cl/)
- [Flow Developers - API](https://developers.flow.cl/en/api)
- [Flow - Comercios Asociados](https://developers.flow.cl/en/docs/merchant)
- [Flow - Tarifas](https://www.flow.cl/tarifas.php)
- [MercadoPago - Split Payments](https://www.mercadopago.cl/developers/es/docs/split-payments/landing)

### Comparativas
- [Pasarelas de Pago en Chile 2025 - Digitalizame](https://digitalizame.cl/pasarelas-de-pago-en-chile/)
- [Webpay vs Flow vs MercadoPago - Foja Cero](https://fojaceroestudio.cl/webpay-vs-flow-vs-mercado-pago-cual-elegir/)
- [Alternativas a Mercado Pago - Wise](https://wise.com/cl/blog/alternativas-mercado-pago-chile)
- [Best Payment Gateways Chile - Rebill](https://www.rebill.com/blog/pasarelas-pago-chile)
- [Comparacion Pasarelas - Jumpseller](https://jumpseller.com/support/price-comparison-payment-gateways/)

### Recursos Tecnicos
- [Flow API Client PHP - GitHub](https://github.com/CriptoPagos/flowcl-api-client-php)
- [Flow Node.js Client - GitHub](https://github.com/EstebanFuentealba/node-flow-cl)
- [Integracion Flow CodeIgniter - Medium](https://medium.com/@javierlarroulet/integrando-flow-como-pasarela-de-pagos-en-codeigniter-79226f07adb4)

### Informacion Corporativa
- [Flow - TUXPAN Cases](https://www.tuxpan.com/blog/casos-de-exito/flow-plataforma-de-pagos-online/)
- [Flow LinkedIn](https://www.linkedin.com/company/flow-sa/)
- [Flow - CorfoConecta](https://corfoconecta.cl/comunidad/partners/flow)

---

*Documento generado: Febrero 2025*
*Proyecto: Octopus UGC Marketplace*
