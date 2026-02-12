# Content Approval Workflow - Octopus UGC Platform

## Resumen del Sistema

Sistema completo para gestionar el flujo de entregas de contenido UGC entre creadores y empresas en la plataforma Octopus.

## Flujo de Estados

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐
│  draft  │───>│ submitted │───>│ in_review │───>│ approved │───>│ completed │
└─────────┘    └───────────┘    └───────────┘    └──────────┘    └───────────┘
     ^                │                │               │
     │                │                │               │
     │                v                v               v
     │         ┌─────────────────┐     │         (Pago liberado)
     └─────────│ revision_needed │<────┘
               └─────────────────┘
                   (max 3 veces)
```

### Estados:

1. **draft** - Creador esta trabajando en el contenido
2. **submitted** - Creador entrego el contenido para revision
3. **in_review** - Empresa esta revisando el contenido
4. **approved** - Contenido aprobado, listo para liberar pago
5. **revision_needed** - Empresa solicito cambios (max 3 revisiones)
6. **completed** - Pago liberado y entrega finalizada

## Base de Datos

### Tabla Principal: `content_deliveries`

```sql
CREATE TABLE content_deliveries (
    id UUID PRIMARY KEY,

    -- Relaciones
    application_id UUID NOT NULL,
    contract_id UUID,
    creator_id UUID NOT NULL,
    company_id UUID NOT NULL,
    gig_id UUID NOT NULL,

    -- Contenido
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    additional_files JSONB DEFAULT '[]',

    -- Estado
    status VARCHAR(20) DEFAULT 'draft',
    revision_count INTEGER DEFAULT 0,
    max_revisions INTEGER DEFAULT 3,

    -- Feedback
    feedback TEXT,
    feedback_history JSONB DEFAULT '[]',

    -- Timestamps
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Pago
    payment_amount DECIMAL(10, 2),
    payment_released_at TIMESTAMP,
    payment_transaction_id UUID,

    -- Metadata
    platform VARCHAR(50),
    content_type VARCHAR(50),
    duration_seconds INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla de Notificaciones: `delivery_notifications`

```sql
CREATE TABLE delivery_notifications (
    id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Tipos de Notificacion:
- `content_submitted` - Creador subio contenido
- `content_approved` - Empresa aprobo contenido
- `revision_requested` - Empresa pidio cambios
- `payment_released` - Pago liberado al creador
- `delivery_completed` - Entrega completada

## Estructura de Archivos

```
frontend/
├── app/
│   ├── creator/
│   │   └── deliveries/
│   │       └── page.tsx          # Lista de entregas del creador
│   └── company/
│       └── review-content/
│           └── page.tsx          # Panel de revision para empresas
├── components/
│   └── deliveries/
│       ├── DeliveryNotificationBadge.tsx  # Badge de notificaciones
│       └── CreateDeliveryModal.tsx        # Modal para crear entrega
└── CONTENT_APPROVAL_SYSTEM.sql           # Script SQL completo
```

## UI para Creador (`/creator/deliveries`)

### Funcionalidades:
- Ver lista de todas las entregas
- Filtrar por estado (Todas, Requieren Accion, En Revision)
- Ver detalles de cada entrega
- Subir contenido (URL de video)
- Ver feedback de la empresa
- Resubir contenido si piden revision
- Ver historial de feedback

### Estados visuales:
- **Borrador** (gris) - Necesita subir contenido
- **Enviado** (amarillo) - Esperando revision
- **En Revision** (azul) - Empresa revisando
- **Aprobado** (verde) - Listo, pago pendiente
- **Cambios Pedidos** (naranja) - Necesita resubir
- **Completado** (esmeralda) - Pago recibido

## UI para Empresa (`/company/review-content`)

### Funcionalidades:
- Ver todos los contenidos pendientes de revision
- Filtrar por estado (Pendientes, Revisados, Todos)
- Ver video del creador (link externo)
- Aprobar contenido
- Pedir revision con feedback obligatorio
- Liberar pago despues de aprobar
- Ver historial de revisiones

### Acciones principales:
1. **Aprobar** - Marca como aprobado, notifica al creador
2. **Pedir Cambios** - Requiere feedback, incrementa contador de revision
3. **Liberar Pago** - Solo disponible despues de aprobar

## Integracion con Pagos

### Flujo de Pago:
1. Empresa aprueba contenido -> status = 'approved'
2. Empresa hace click en "Liberar Pago"
3. Sistema llama a `process_payment()` existente
4. Si exitoso: status = 'completed', payment_released_at = NOW()
5. Creador recibe notificacion de pago

### Condiciones para liberar pago:
- Status debe ser 'approved'
- payment_released_at debe ser NULL
- Empresa debe tener balance suficiente en wallet

## Notificaciones

### Eventos que generan notificacion:

| Evento | Receptor | Tipo |
|--------|----------|------|
| Creador sube contenido | Empresa | content_submitted |
| Empresa aprueba | Creador | content_approved |
| Empresa pide cambios | Creador | revision_requested |
| Pago liberado | Creador | payment_released |

### Componente de Notificaciones:
- Badge con contador de no leidas
- Dropdown con lista de notificaciones
- Click redirige a la pagina correspondiente
- Auto-refresh cada 30 segundos

## Limites y Restricciones

- **Max Revisiones:** 3 por defecto (configurable por delivery)
- **Revision Count:** Se incrementa cada vez que empresa pide cambios
- **URLs soportadas:** Google Drive, Dropbox, WeTransfer, etc.

## Funciones SQL Principales

```sql
-- Creador sube contenido
submit_content_delivery(delivery_id, video_url, thumbnail_url, description)

-- Empresa aprueba
approve_content_delivery(delivery_id, feedback)

-- Empresa pide revision
request_content_revision(delivery_id, feedback)

-- Liberar pago
release_payment_on_approval(delivery_id)

-- Crear notificacion
create_delivery_notification(delivery_id, recipient_id, type, title, message, metadata)
```

## Politicas RLS

- Creadores solo ven sus propias entregas
- Empresas solo ven entregas de sus gigs
- Creadores pueden crear y actualizar sus entregas
- Empresas pueden actualizar entregas (aprobar/rechazar)
- Notificaciones solo visibles para el recipient

## Proximos Pasos (Sugerencias)

1. **Email notifications** - Enviar emails ademas de notificaciones in-app
2. **Preview de video** - Embeber videos directamente en la UI
3. **Metricas de entrega** - Tiempo promedio de revision, tasa de aprobacion
4. **Bulk actions** - Aprobar multiples entregas a la vez
5. **Templates de feedback** - Feedback predefinido para empresas
6. **Deadline tracking** - Alertas si se acerca fecha limite
