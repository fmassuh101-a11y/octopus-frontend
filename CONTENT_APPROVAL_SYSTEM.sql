-- =====================================================
-- SISTEMA DE CONTENT APPROVAL WORKFLOW - OCTOPUS
-- Version: 1.0
-- Descripcion: Sistema completo para gestion de entregas
-- de contenido UGC con flujo de aprobacion
-- =====================================================

-- =====================================================
-- 1. CREAR TIPO ENUM PARA ESTADOS (si no existe)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE content_delivery_status AS ENUM (
        'draft',           -- Creador trabajando en el contenido
        'submitted',       -- Creador entrego el contenido
        'in_review',       -- Empresa esta revisando
        'approved',        -- Contenido aprobado, listo para pago
        'revision_needed', -- Empresa pidio cambios
        'completed'        -- Pagado y finalizado
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. TABLA PRINCIPAL: content_deliveries
-- =====================================================

CREATE TABLE IF NOT EXISTS content_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Relaciones principales
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,

    -- Informacion del contenido
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- URLs del contenido
    video_url TEXT NOT NULL,              -- URL de Google Drive, Dropbox, etc.
    thumbnail_url TEXT,                   -- URL de thumbnail (opcional)
    additional_files JSONB DEFAULT '[]',  -- Array de URLs adicionales
    -- Ejemplo: [{"url": "...", "type": "script", "name": "guion.pdf"}]

    -- Estado del flujo
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft',           -- Creador trabajando
        'submitted',       -- Creador entrego
        'in_review',       -- Empresa revisando
        'approved',        -- Aprobado
        'revision_needed', -- Pide cambios
        'completed'        -- Pagado
    )),

    -- Contador de revisiones (max 3)
    revision_count INTEGER DEFAULT 0,
    max_revisions INTEGER DEFAULT 3,

    -- Feedback de la empresa
    feedback TEXT,                        -- Comentarios actuales
    feedback_history JSONB DEFAULT '[]',  -- Historial de feedback
    -- Ejemplo: [{"feedback": "...", "created_at": "...", "by": "company"}]

    -- Timestamps del flujo
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Informacion de pago (cuando se aprueba)
    payment_amount DECIMAL(10, 2),
    payment_released_at TIMESTAMP WITH TIME ZONE,
    payment_transaction_id UUID REFERENCES transactions(id),

    -- Metadata
    platform VARCHAR(50),  -- tiktok, instagram, youtube, etc.
    content_type VARCHAR(50),  -- video, reel, story, etc.
    duration_seconds INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. INDICES PARA MEJOR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_content_deliveries_application_id ON content_deliveries(application_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_creator_id ON content_deliveries(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_company_id ON content_deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_status ON content_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_gig_id ON content_deliveries(gig_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_contract_id ON content_deliveries(contract_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_created_at ON content_deliveries(created_at DESC);

-- =====================================================
-- 4. HABILITAR RLS (Row Level Security)
-- =====================================================

ALTER TABLE content_deliveries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLITICAS DE SEGURIDAD
-- =====================================================

-- Creadores pueden ver sus propias entregas
DROP POLICY IF EXISTS "Creators can view own deliveries" ON content_deliveries;
CREATE POLICY "Creators can view own deliveries" ON content_deliveries
    FOR SELECT USING (auth.uid() = creator_id);

-- Empresas pueden ver entregas de sus gigs
DROP POLICY IF EXISTS "Companies can view their deliveries" ON content_deliveries;
CREATE POLICY "Companies can view their deliveries" ON content_deliveries
    FOR SELECT USING (auth.uid() = company_id);

-- Creadores pueden crear entregas
DROP POLICY IF EXISTS "Creators can create deliveries" ON content_deliveries;
CREATE POLICY "Creators can create deliveries" ON content_deliveries
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Creadores pueden actualizar sus entregas (solo ciertos campos)
DROP POLICY IF EXISTS "Creators can update own deliveries" ON content_deliveries;
CREATE POLICY "Creators can update own deliveries" ON content_deliveries
    FOR UPDATE USING (auth.uid() = creator_id);

-- Empresas pueden actualizar entregas (para aprobar/rechazar)
DROP POLICY IF EXISTS "Companies can update deliveries" ON content_deliveries;
CREATE POLICY "Companies can update deliveries" ON content_deliveries
    FOR UPDATE USING (auth.uid() = company_id);

-- =====================================================
-- 6. TABLA DE NOTIFICACIONES DE DELIVERY
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES content_deliveries(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tipo de notificacion
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'content_submitted',    -- Creador subio contenido
        'content_approved',     -- Empresa aprobo
        'revision_requested',   -- Empresa pidio cambios
        'payment_released',     -- Pago liberado
        'delivery_completed'    -- Entrega completada
    )),

    -- Contenido de la notificacion
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Estado
    read_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notifications_recipient ON delivery_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_read ON delivery_notifications(recipient_id, read_at);

ALTER TABLE delivery_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON delivery_notifications;
CREATE POLICY "Users can view own notifications" ON delivery_notifications
    FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON delivery_notifications;
CREATE POLICY "Users can update own notifications" ON delivery_notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- System can insert notifications
DROP POLICY IF EXISTS "System can create notifications" ON delivery_notifications;
CREATE POLICY "System can create notifications" ON delivery_notifications
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. FUNCION: Crear notificacion de delivery
-- =====================================================

CREATE OR REPLACE FUNCTION create_delivery_notification(
    p_delivery_id UUID,
    p_recipient_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO delivery_notifications (
        delivery_id, recipient_id, type, title, message, metadata
    ) VALUES (
        p_delivery_id, p_recipient_id, p_type, p_title, p_message, p_metadata
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCION: Creador sube contenido
-- =====================================================

CREATE OR REPLACE FUNCTION submit_content_delivery(
    p_delivery_id UUID,
    p_video_url TEXT,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_company_id UUID;
    v_creator_name TEXT;
BEGIN
    -- Obtener la entrega
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND creator_id = auth.uid();

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not authorized');
    END IF;

    -- Verificar que puede subir (draft o revision_needed)
    IF v_delivery.status NOT IN ('draft', 'revision_needed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot submit in current status');
    END IF;

    -- Actualizar la entrega
    UPDATE content_deliveries
    SET
        video_url = p_video_url,
        thumbnail_url = COALESCE(p_thumbnail_url, thumbnail_url),
        description = COALESCE(p_description, description),
        status = 'submitted',
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;

    -- Obtener nombre del creador para la notificacion
    SELECT COALESCE(full_name, username, 'Creador') INTO v_creator_name
    FROM profiles
    WHERE user_id = auth.uid();

    -- Crear notificacion para la empresa
    PERFORM create_delivery_notification(
        p_delivery_id,
        v_delivery.company_id,
        'content_submitted',
        'Nuevo contenido recibido',
        v_creator_name || ' ha subido contenido para revision',
        jsonb_build_object('creator_id', auth.uid(), 'gig_id', v_delivery.gig_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'submitted',
        'message', 'Content submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNCION: Empresa aprueba contenido
-- =====================================================

CREATE OR REPLACE FUNCTION approve_content_delivery(
    p_delivery_id UUID,
    p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_creator_name TEXT;
    v_company_name TEXT;
BEGIN
    -- Obtener la entrega
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND company_id = auth.uid();

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not authorized');
    END IF;

    -- Verificar estado
    IF v_delivery.status NOT IN ('submitted', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot approve in current status');
    END IF;

    -- Actualizar entrega
    UPDATE content_deliveries
    SET
        status = 'approved',
        feedback = p_feedback,
        feedback_history = feedback_history || jsonb_build_array(
            jsonb_build_object(
                'action', 'approved',
                'feedback', p_feedback,
                'created_at', NOW(),
                'by', 'company'
            )
        ),
        reviewed_at = NOW(),
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;

    -- Obtener nombre de empresa
    SELECT COALESCE(company_name, full_name, 'Empresa') INTO v_company_name
    FROM profiles
    WHERE user_id = auth.uid();

    -- Notificar al creador
    PERFORM create_delivery_notification(
        p_delivery_id,
        v_delivery.creator_id,
        'content_approved',
        'Tu contenido fue aprobado!',
        v_company_name || ' aprobo tu contenido. El pago sera liberado pronto.',
        jsonb_build_object('company_id', auth.uid(), 'gig_id', v_delivery.gig_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'approved',
        'message', 'Content approved successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. FUNCION: Empresa pide revision
-- =====================================================

CREATE OR REPLACE FUNCTION request_content_revision(
    p_delivery_id UUID,
    p_feedback TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_company_name TEXT;
BEGIN
    -- Validar feedback requerido
    IF p_feedback IS NULL OR LENGTH(TRIM(p_feedback)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feedback is required for revision requests');
    END IF;

    -- Obtener la entrega
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND company_id = auth.uid();

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not authorized');
    END IF;

    -- Verificar estado
    IF v_delivery.status NOT IN ('submitted', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot request revision in current status');
    END IF;

    -- Verificar limite de revisiones
    IF v_delivery.revision_count >= v_delivery.max_revisions THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum revisions reached');
    END IF;

    -- Actualizar entrega
    UPDATE content_deliveries
    SET
        status = 'revision_needed',
        feedback = p_feedback,
        feedback_history = feedback_history || jsonb_build_array(
            jsonb_build_object(
                'action', 'revision_requested',
                'feedback', p_feedback,
                'created_at', NOW(),
                'by', 'company'
            )
        ),
        revision_count = revision_count + 1,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;

    -- Obtener nombre de empresa
    SELECT COALESCE(company_name, full_name, 'Empresa') INTO v_company_name
    FROM profiles
    WHERE user_id = auth.uid();

    -- Notificar al creador
    PERFORM create_delivery_notification(
        p_delivery_id,
        v_delivery.creator_id,
        'revision_requested',
        'Se solicitaron cambios',
        v_company_name || ' solicito cambios en tu contenido: ' || LEFT(p_feedback, 100),
        jsonb_build_object(
            'company_id', auth.uid(),
            'gig_id', v_delivery.gig_id,
            'revision_number', v_delivery.revision_count + 1
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'revision_needed',
        'revision_count', v_delivery.revision_count + 1,
        'revisions_remaining', v_delivery.max_revisions - v_delivery.revision_count - 1,
        'message', 'Revision requested successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. FUNCION: Liberar pago al aprobar
-- =====================================================

CREATE OR REPLACE FUNCTION release_payment_on_approval(
    p_delivery_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_payment_result JSONB;
    v_gig gigs%ROWTYPE;
BEGIN
    -- Obtener la entrega
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND company_id = auth.uid() AND status = 'approved';

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not approved');
    END IF;

    -- Verificar que no se haya pagado ya
    IF v_delivery.payment_released_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment already released');
    END IF;

    -- Obtener monto del gig si no esta especificado
    IF v_delivery.payment_amount IS NULL THEN
        SELECT * INTO v_gig FROM gigs WHERE id = v_delivery.gig_id;
        IF v_gig.id IS NOT NULL THEN
            UPDATE content_deliveries
            SET payment_amount = v_gig.budget_min
            WHERE id = p_delivery_id;
            v_delivery.payment_amount := v_gig.budget_min;
        END IF;
    END IF;

    -- Procesar pago usando la funcion existente
    SELECT process_payment(
        v_delivery.company_id,
        v_delivery.creator_id,
        v_delivery.payment_amount,
        v_delivery.id,
        'content_delivery',
        'Pago por contenido aprobado - ' || v_delivery.title
    ) INTO v_payment_result;

    IF (v_payment_result->>'success')::boolean THEN
        -- Actualizar entrega como completada
        UPDATE content_deliveries
        SET
            status = 'completed',
            payment_released_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_delivery_id;

        -- Notificar al creador
        PERFORM create_delivery_notification(
            p_delivery_id,
            v_delivery.creator_id,
            'payment_released',
            'Pago recibido!',
            'Has recibido $' || v_delivery.payment_amount || ' por tu contenido aprobado',
            jsonb_build_object(
                'amount', v_delivery.payment_amount,
                'gig_id', v_delivery.gig_id
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'status', 'completed',
            'payment', v_payment_result
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', v_payment_result->>'error'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. TRIGGER: Actualizar updated_at
-- =====================================================

DROP TRIGGER IF EXISTS trigger_content_deliveries_updated_at ON content_deliveries;
CREATE TRIGGER trigger_content_deliveries_updated_at
    BEFORE UPDATE ON content_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. VISTA: Deliveries con info completa
-- =====================================================

CREATE OR REPLACE VIEW content_deliveries_full AS
SELECT
    cd.*,
    p_creator.full_name as creator_name,
    p_creator.avatar_url as creator_avatar,
    p_company.company_name,
    p_company.full_name as company_contact_name,
    g.title as gig_title,
    g.budget_min as gig_budget
FROM content_deliveries cd
LEFT JOIN profiles p_creator ON cd.creator_id = p_creator.user_id
LEFT JOIN profiles p_company ON cd.company_id = p_company.user_id
LEFT JOIN gigs g ON cd.gig_id = g.id;

-- =====================================================
-- FIN DEL SCRIPT SQL
-- =====================================================

-- Para verificar que todo se creo correctamente:
-- SELECT * FROM content_deliveries LIMIT 5;
-- SELECT * FROM delivery_notifications LIMIT 5;
