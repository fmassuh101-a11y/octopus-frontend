# PLAN DE DESARROLLO OCTOPUS 2026
## De MVP a Plataforma Líder LATAM

---

## ESTADO ACTUAL - Resumen

### Lo que YA está construido:
- ✅ 57 páginas funcionales
- ✅ Auth completo (Email + TikTok OAuth)
- ✅ Sistema de Gigs/Jobs
- ✅ Sistema de Aplicaciones
- ✅ Contratos con workflow completo
- ✅ Content Delivery con 3 revisiones
- ✅ Messaging directo + templates
- ✅ Wallet con balance y transacciones
- ✅ Withdrawals con admin approval
- ✅ 10% fee ya implementado
- ✅ Support chat para admin
- ✅ Onboarding Creator + Company

### Lo que FALTA para ser competitivos:
- ❌ Payment Gateway real (MercadoPago)
- ❌ One-Tap Apply (como Sideshift)
- ❌ UI Feed-style para gigs
- ❌ AI Script Generator
- ❌ Sistema de Ratings/Reviews
- ❌ Badges de verificación
- ❌ Invoicing/Facturación

---

## FASE 1: PAGOS REALES (Semana 1-2)
### Prioridad: 🔴 CRÍTICA

**Objetivo:** Que el dinero fluya de verdad.

### 1.1 Integrar MercadoPago SDK

```bash
npm install mercadopago @mercadopago/sdk-react
```

**Archivos a crear:**
```
/app/api/payments/
├── create-preference.ts    # Crear preferencia de pago
├── webhook.ts              # Recibir notificaciones MP
├── release.ts              # Liberar pago al creador
└── status.ts               # Verificar estado de pago

/lib/
└── mercadopago.ts          # Configuración cliente
```

### 1.2 Flujo de Pago Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO IMPLEMENTAR                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Empresa crea contrato con monto                        │
│     └── Ya existe: /company/contracts                       │
│                    │                                        │
│  2. Empresa hace click "Pagar y Enviar"                    │
│     └── NUEVO: Botón que abre MercadoPago                  │
│                    │                                        │
│  3. MercadoPago procesa pago                               │
│     └── NUEVO: create-preference.ts                         │
│                    │                                        │
│  4. Webhook confirma pago exitoso                          │
│     └── NUEVO: webhook.ts                                   │
│     └── Actualiza: contract.payment_status = 'paid'        │
│     └── Actualiza: wallet.pending_balance += amount        │
│                    │                                        │
│  5. Creador entrega contenido                              │
│     └── Ya existe: /creator/deliveries                      │
│                    │                                        │
│  6. Empresa aprueba contenido                              │
│     └── Ya existe: /company/review-content                  │
│                    │                                        │
│  7. Sistema libera pago automáticamente                    │
│     └── NUEVO: release.ts                                   │
│     └── wallet.balance += amount - fee                     │
│     └── wallet.pending_balance -= amount                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Cambios en Base de Datos

```sql
-- Agregar campos a contracts
ALTER TABLE contracts ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
-- pending, processing, paid, released, refunded

ALTER TABLE contracts ADD COLUMN mercadopago_preference_id TEXT;
ALTER TABLE contracts ADD COLUMN mercadopago_payment_id TEXT;

-- Agregar campos a transactions
ALTER TABLE transactions ADD COLUMN mercadopago_id TEXT;
ALTER TABLE transactions ADD COLUMN external_reference TEXT;
```

### 1.4 Componente de Pago

```tsx
// /components/payments/PayContractButton.tsx
import { Wallet } from "@mercadopago/sdk-react";

function PayContractButton({ contractId, amount }) {
  const [preferenceId, setPreferenceId] = useState(null);

  const handlePay = async () => {
    const res = await fetch('/api/payments/create-preference', {
      method: 'POST',
      body: JSON.stringify({ contractId, amount })
    });
    const { preferenceId } = await res.json();
    setPreferenceId(preferenceId);
  };

  if (preferenceId) {
    return <Wallet initialization={{ preferenceId }} />;
  }

  return (
    <button onClick={handlePay}>
      Pagar ${amount.toLocaleString()} CLP
    </button>
  );
}
```

### Entregables Fase 1:
- [ ] Cuenta MercadoPago Developers creada
- [ ] SDK instalado y configurado
- [ ] Endpoint create-preference
- [ ] Endpoint webhook
- [ ] Endpoint release
- [ ] Botón de pago en /company/contracts
- [ ] Actualización automática de wallets
- [ ] Tests con sandbox

---

## FASE 2: UX SIDESHIFT-STYLE (Semana 3-4)
### Prioridad: 🟡 ALTA

**Objetivo:** Experiencia tan fluida como Sideshift.

### 2.1 One-Tap Apply

**Problema actual:** El apply requiere escribir mensaje.

**Solución:** Aplicar con un tap, mensaje opcional.

```tsx
// Cambio en /gigs/[id]/page.tsx
const handleQuickApply = async () => {
  await supabase.from('applications').insert({
    gig_id: gigId,
    creator_id: userId,
    status: 'pending',
    message: null, // Opcional ahora
    applied_at: new Date()
  });
  toast.success('¡Aplicación enviada!');
};

return (
  <button
    onClick={handleQuickApply}
    className="bg-gradient-to-r from-purple-500 to-pink-500 ..."
  >
    ⚡ Aplicar Ahora
  </button>
);
```

### 2.2 Feed Visual de Gigs

**Problema actual:** Lista tipo job board tradicional.

**Solución:** Cards visuales estilo Instagram/TikTok.

```tsx
// Nuevo diseño para /gigs/page.tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {gigs.map(gig => (
    <GigCard
      key={gig.id}
      image={gig.image_url}
      title={gig.title}
      company={gig.company_name}
      budget={gig.budget}
      applicants={gig.applicant_count}
      isNew={isNewGig(gig.created_at)}
    />
  ))}
</div>
```

### 2.3 Common Application Profile

**Concepto Sideshift:** Tu perfil es tu aplicación.

**Implementar:**
- Profile completeness indicator
- "Perfil como CV" - toda info se envía automáticamente
- Preview de cómo ven las empresas tu perfil

```tsx
// /creator/profile - Agregar sección
<ProfileCompleteness
  profile={profile}
  required={['bio', 'tiktok_handle', 'portfolio_url']}
/>

<ProfilePreview
  mode="company-view"
  profile={profile}
/>
```

### 2.4 Auto-Approve Timer (Ya existe, mejorar UI)

**Actual:** 5 días para aprobar, pero no es visible.

**Mejorar:**
```tsx
// En /company/review-content
<div className="text-sm text-amber-500">
  ⏰ Auto-aprueba en {daysLeft} días si no respondes
</div>

// En /creator/deliveries
<div className="text-sm text-green-500">
  ✓ Se aprobará automáticamente el {autoApproveDate}
</div>
```

### Entregables Fase 2:
- [ ] One-Tap Apply implementado
- [ ] Feed visual de gigs (cards con imágenes)
- [ ] Profile completeness indicator
- [ ] Auto-approve timer visible
- [ ] Animaciones de transición
- [ ] Skeleton loaders mejorados

---

## FASE 3: DIFERENCIADORES (Semana 5-8)
### Prioridad: 🟡 ALTA

**Objetivo:** Features que nadie más tiene en LATAM.

### 3.1 AI Script Generator

**API:** OpenAI GPT-4 o Claude

```tsx
// /app/api/ai/generate-script.ts
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  const { productUrl, objective, platform, tone } = await req.json();

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Genera un script UGC para ${platform}.
        Producto: ${productUrl}
        Objetivo: ${objective}
        Tono: ${tone}

        Formato:
        - Hook (3 segundos)
        - Problema (5 segundos)
        - Solución/Producto (10 segundos)
        - CTA (3 segundos)

        El script debe ser natural, conversacional, y optimizado para engagement.`
    }]
  });

  return Response.json({ script: message.content });
}
```

**UI Component:**
```tsx
// /components/ai/ScriptGenerator.tsx
function ScriptGenerator({ gigId }) {
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch('/api/ai/generate-script', {
      method: 'POST',
      body: JSON.stringify({
        productUrl,
        objective: 'awareness',
        platform: 'tiktok',
        tone: 'casual'
      })
    });
    const { script } = await res.json();
    setScript(script);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={generate}>
        🤖 Generar Script con AI
      </button>
      {script && <ScriptPreview script={script} />}
    </div>
  );
}
```

### 3.2 Sistema de Ratings/Reviews

**Nuevas tablas:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id),
  reviewer_id UUID NOT NULL,
  reviewer_type VARCHAR(20) NOT NULL, -- 'company' or 'creator'
  reviewee_id UUID NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  -- Criterios específicos
  quality_rating INTEGER,      -- Calidad del contenido
  communication_rating INTEGER, -- Comunicación
  timeliness_rating INTEGER,   -- Puntualidad

  created_at TIMESTAMP DEFAULT NOW()
);

-- Vista para promedios
CREATE VIEW creator_ratings AS
SELECT
  reviewee_id as creator_id,
  AVG(rating) as avg_rating,
  COUNT(*) as total_reviews,
  AVG(quality_rating) as avg_quality,
  AVG(communication_rating) as avg_communication,
  AVG(timeliness_rating) as avg_timeliness
FROM reviews
WHERE reviewer_type = 'company'
GROUP BY reviewee_id;
```

**Trigger post-contrato:**
```sql
-- Después de completar contrato, permitir review
CREATE OR REPLACE FUNCTION enable_reviews()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Notificar a ambas partes que pueden dejar review
    INSERT INTO notifications (user_id, type, message)
    VALUES
      (NEW.company_id, 'review_available', 'Puedes dejar una reseña del creador'),
      (NEW.creator_id, 'review_available', 'Puedes dejar una reseña de la empresa');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Badges de Verificación

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria JSONB -- {"min_contracts": 5, "min_rating": 4.5}
);

CREATE TABLE user_badges (
  user_id UUID NOT NULL,
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Badges iniciales
INSERT INTO badges (name, description, criteria) VALUES
('Verificado', 'Completó verificación de identidad', '{"verified": true}'),
('Top Creator', '5+ contratos con 4.5+ rating', '{"min_contracts": 5, "min_rating": 4.5}'),
('Fast Responder', 'Responde en menos de 2 horas', '{"avg_response_hours": 2}'),
('Rising Star', 'Nuevo con gran potencial', '{"contracts": 3, "rating": 5}');
```

### Entregables Fase 3:
- [ ] AI Script Generator funcional
- [ ] Sistema de reviews completo
- [ ] Badges automáticos
- [ ] Profile con badges visibles
- [ ] Filtro por rating en búsqueda

---

## FASE 4: ESCALA (Mes 3+)
### Prioridad: 🟢 MEDIA

### 4.1 Notificaciones Push
- Service Worker para PWA
- Push notifications para:
  - Nueva aplicación
  - Mensaje nuevo
  - Contenido aprobado
  - Pago recibido

### 4.2 Real-time Messaging
- Migrar de polling a Supabase Realtime
- Indicador "escribiendo..."
- Mensajes instantáneos

### 4.3 Invoicing/Facturación
- Generar facturas automáticas
- PDF descargable
- Integración con SII Chile

### 4.4 Mobile App (React Native)
- Convertir a app nativa
- Push notifications nativas
- Cámara para subir contenido

### 4.5 Stripe Atlas (Expansión Global)
- Crear LLC Delaware
- Integrar Stripe Connect
- Pagos en USD para mercado internacional

---

## CRONOGRAMA RESUMEN

| Semana | Fase | Entregable Principal |
|--------|------|---------------------|
| 1-2 | Fase 1 | MercadoPago funcionando |
| 3-4 | Fase 2 | UX Sideshift-style |
| 5-6 | Fase 3a | AI Script Generator |
| 7-8 | Fase 3b | Ratings + Badges |
| 9+ | Fase 4 | Escala y optimización |

---

## MÉTRICAS DE ÉXITO

### Fase 1 (Pagos):
- [ ] Primera transacción real completada
- [ ] 0 errores en webhook
- [ ] Tiempo de pago < 5 segundos

### Fase 2 (UX):
- [ ] Time to apply < 3 segundos
- [ ] Conversion rate aplicaciones +30%
- [ ] Bounce rate gigs -20%

### Fase 3 (Diferenciadores):
- [ ] 50% de usuarios usan AI generator
- [ ] Rating promedio > 4.5
- [ ] 30% de creadores tienen badges

### Fase 4 (Escala):
- [ ] 1000+ creadores registrados
- [ ] 100+ empresas activas
- [ ] $10M+ CLP procesados

---

---

## 🚨 ACTUALIZACIÓN IMPORTANTE: WHOP PARA PAYOUTS

### Descubrimiento Clave

**CONFIRMADO: Sideshift usa WHOP para su sistema de payouts.**

Whop no es solo una plataforma de cursos - es una **infraestructura de pagos B2B** que otras plataformas pueden integrar.

### Qué ofrece Whop para Octopus

| Feature | Detalle |
|---------|---------|
| **Métodos de payout** | Bitcoin, PayPal, Solana, Bank, Venmo, CashApp, Stablecoins |
| **Cobertura** | 241+ territorios |
| **KYC/Verificación** | Incluido y manejado por ellos |
| **White-label** | Sí - tu branding completo |
| **Fee mensual** | $0 (gratis) |
| **Fee por transacción** | 2.7% + $0.30 |
| **API** | REST + SDKs (JavaScript, Python, Ruby) |

### Cómo lo usa Sideshift

```
Sideshift → Whop API → Creador elige método → Payout
                         │
                         ├── Bitcoin
                         ├── PayPal
                         ├── Solana
                         ├── Bank Transfer
                         └── Venmo/CashApp
```

### Código de Integración

```bash
npm install @whop/sdk
```

```typescript
import { WhopClient } from '@whop/sdk';

const whop = new WhopClient({ apiKey: 'tu_api_key' });

// Enviar payout a creador
await whop.payouts.create({
  recipient: 'creator_whop_id',
  amount: 450, // USD después de tu 10% fee
  currency: 'USD',
  method: 'user_choice' // El creador elige
});
```

### Alternativas Investigadas

| Plataforma | Fee Mensual | Crypto | Mejor Para |
|------------|-------------|--------|------------|
| **Whop** | $0 | ✅ Nativo | Sideshift lo usa, probado |
| **Dots** | Custom | ✅ Stablecoins | Integración en 2 horas |
| **Trolley** | $49 | Limitado | Tax compliance USA |
| **Tipalti** | $99+ | Limitado | Enterprise |
| **Rise** | $50/user | ✅ Web3 nativo | Crypto-first |

### Recomendación Final: WHOP

**Por qué Whop:**
1. ✅ Sideshift ya lo usa (caso de uso idéntico)
2. ✅ Multi-método (crypto + fiat) listo
3. ✅ KYC incluido
4. ✅ $0 mensual
5. ✅ White-label
6. ✅ API moderna

### Nuevo Flujo de Pagos Propuesto

```
COBRAR (Empresas)              PAGAR (Creadores)
─────────────────────────────────────────────────
MercadoPago (Chile)     →      Whop Payouts
Stripe (Global)         →      241+ territorios
                               Crypto + Fiat + PayPal
```

---

## ACTUALIZACIÓN: HALLAZGOS LEGALES

### Limitación Importante de MercadoPago

El agente legal descubrió una **limitación crítica**:

> MercadoPago Split Payments solo permite **2 cuentas** (marketplace + vendedor)
> Solo funciona entre cuentas MercadoPago (no bancos externos directos)

**Implicación:** MercadoPago funciona para MVP pero es menos flexible que Stripe Connect.

### Recomendación Legal: Estructura Híbrida

```
FASE MVP (0-6 meses):
└── Solo MercadoPago (más simple, sin LLC)
    └── SpA Chile gratis via tuempresaenundia.cl

FASE ESCALA (6+ meses):
└── LLC USA (Stripe Atlas $500)
    └── Stripe Connect para pagos globales
    └── SpA Chile para operaciones locales
```

### Nuevas Obligaciones Tributarias Chile 2025

Los **creadores** ahora deben:
1. Iniciar actividades en SII
2. Emitir boleta de honorarios electrónica
3. PPM mensual: 14.5% (sube a 17% en 2028)

**Para pagos internacionales:**
- Nombre: "Usuarios de Plataformas Digitales"
- RUT genérico: **44.444.447-9**

### Comparativa Final Actualizada

| Aspecto | MercadoPago | Stripe Connect |
|---------|-------------|----------------|
| Setup | Gratis | $500 (Atlas) |
| Anual | $0 | ~$400/año |
| Split accounts | Solo 2 | Ilimitadas |
| Escrow | Limitado | Hasta 90 días |
| Payouts LATAM | Solo MP users | 118+ países |
| Ideal para | MVP Chile | Escala global |

---

## DECISIÓN: ¿MercadoPago o Stripe?

### Opción A: MercadoPago (Recomendada para empezar)
- ✅ Sin costo inicial
- ✅ Funciona en Chile nativo
- ✅ Más rápido de implementar
- ❌ Limitado a 2 cuentas en split
- ❌ Solo usuarios MercadoPago

### Opción B: Stripe Atlas (Para escalar)
- ✅ Split ilimitado
- ✅ Escrow real 90 días
- ✅ Payouts globales
- ❌ Requiere LLC USA ($500)
- ❌ Más complejo de mantener

**Mi recomendación:** Empezar con MercadoPago, migrar a Stripe cuando tengas tracción.

---

## PRÓXIMO PASO INMEDIATO

**AHORA:** Crear cuenta MercadoPago Developers
**URL:** https://www.mercadopago.cl/developers

**Credenciales necesarias:**
1. Public Key (para frontend)
2. Access Token (para backend)
3. Webhook URL configurada

¿Empezamos con la Fase 1?
