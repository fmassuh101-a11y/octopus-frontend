-- =====================================================
-- SISTEMA DE CONTRATOS PROFESIONALES - OCTOPUS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla principal de contratos
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relaciones
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informacion del contrato
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Entregables (JSON array)
  -- Ejemplo: [{"platform": "tiktok", "content_type": "video", "quantity": 2, "duration_seconds": 60}]
  deliverables JSONB NOT NULL DEFAULT '[]',

  -- Pago
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- bank_transfer, paypal, wise, etc.
  payment_terms TEXT, -- Cuando se paga: al aprobar, al publicar, etc.

  -- Fechas
  start_date DATE,
  end_date DATE,
  content_due_date DATE,

  -- Derechos de uso
  usage_rights JSONB DEFAULT '{"platforms": ["organic"], "duration_months": 12, "paid_ads": false, "whitelisting": false}',

  -- Exclusividad
  exclusivity_enabled BOOLEAN DEFAULT false,
  exclusivity_days INTEGER DEFAULT 0,
  exclusivity_competitors TEXT[], -- Lista de competidores

  -- Requisitos adicionales
  hashtags TEXT[], -- Hashtags requeridos
  mentions TEXT[], -- Menciones requeridas (@marca, etc)
  brand_guidelines TEXT, -- Instrucciones especificas

  -- Terminos legales
  additional_terms TEXT, -- Terminos adicionales de la empresa

  -- Estado del contrato
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft',      -- Borrador, empresa aun editando
    'sent',       -- Enviado al creador
    'viewed',     -- Creador lo vio
    'accepted',   -- Creador acepto
    'rejected',   -- Creador rechazo
    'in_progress', -- Trabajo en progreso
    'completed',  -- Completado
    'cancelled'   -- Cancelado
  )),

  -- Firma del creador
  creator_signed_at TIMESTAMP WITH TIME ZONE,
  creator_signature_ip VARCHAR(45),

  -- Firma de la empresa (automatica al enviar)
  company_signed_at TIMESTAMP WITH TIME ZONE,

  -- Handles del creador (se llenan cuando acepta)
  creator_handles JSONB DEFAULT '[]',
  -- Ejemplo: [{"platform": "tiktok", "handle": "@usuario", "followers": 10000, "submitted_at": "2024-01-01"}]

  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_contracts_application_id ON contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_creator_id ON contracts(creator_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_gig_id ON contracts(gig_id);

-- 2. Tabla de entregas/submissions del creador
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Que se entrega
  deliverable_index INTEGER NOT NULL, -- Indice del deliverable en el array del contrato
  platform VARCHAR(50) NOT NULL, -- tiktok, instagram, youtube
  content_type VARCHAR(50) NOT NULL, -- video, reel, story, post

  -- Contenido
  content_url TEXT, -- URL del contenido subido o link al post
  caption TEXT, -- Caption/descripcion usada
  thumbnail_url TEXT,

  -- Estado
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Esperando entrega
    'submitted',  -- Creador envio contenido
    'revision',   -- Empresa pidio cambios
    'approved',   -- Aprobado
    'rejected',   -- Rechazado
    'published'   -- Publicado en la red social
  )),

  -- Feedback
  revision_notes TEXT,
  revision_count INTEGER DEFAULT 0,

  -- Cuando se publico (si aplica)
  published_url TEXT, -- URL del post publicado
  published_at TIMESTAMP WITH TIME ZONE,

  -- Metricas (se actualizan despues de publicar)
  metrics JSONB DEFAULT '{}',
  -- Ejemplo: {"views": 1000, "likes": 50, "comments": 10, "shares": 5}

  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_contract_id ON contract_submissions(contract_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON contract_submissions(status);

-- 3. Tabla de plantillas de contrato (para empresas)
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Valores predeterminados
  default_deliverables JSONB DEFAULT '[]',
  default_payment_terms TEXT,
  default_usage_rights JSONB,
  default_additional_terms TEXT,
  default_brand_guidelines TEXT,

  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_company_id ON contract_templates(company_id);

-- 4. Habilitar RLS (Row Level Security)
-- =====================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- 5. Politicas de seguridad para contracts
-- =====================================================

-- Empresas pueden ver sus propios contratos
DROP POLICY IF EXISTS "Companies can view own contracts" ON contracts;
CREATE POLICY "Companies can view own contracts" ON contracts
  FOR SELECT USING (auth.uid() = company_id);

-- Creadores pueden ver contratos donde son parte
DROP POLICY IF EXISTS "Creators can view their contracts" ON contracts;
CREATE POLICY "Creators can view their contracts" ON contracts
  FOR SELECT USING (auth.uid() = creator_id);

-- Empresas pueden crear contratos
DROP POLICY IF EXISTS "Companies can create contracts" ON contracts;
CREATE POLICY "Companies can create contracts" ON contracts
  FOR INSERT WITH CHECK (auth.uid() = company_id);

-- Empresas pueden actualizar sus contratos (solo draft y sent)
DROP POLICY IF EXISTS "Companies can update own contracts" ON contracts;
CREATE POLICY "Companies can update own contracts" ON contracts
  FOR UPDATE USING (auth.uid() = company_id);

-- Creadores pueden actualizar contratos (para aceptar/rechazar y agregar handles)
DROP POLICY IF EXISTS "Creators can update their contracts" ON contracts;
CREATE POLICY "Creators can update their contracts" ON contracts
  FOR UPDATE USING (auth.uid() = creator_id);

-- 6. Politicas para contract_submissions
-- =====================================================

-- Ambas partes pueden ver las entregas
DROP POLICY IF EXISTS "Users can view submissions" ON contract_submissions;
CREATE POLICY "Users can view submissions" ON contract_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_submissions.contract_id
      AND (contracts.creator_id = auth.uid() OR contracts.company_id = auth.uid())
    )
  );

-- Creadores pueden crear entregas
DROP POLICY IF EXISTS "Creators can create submissions" ON contract_submissions;
CREATE POLICY "Creators can create submissions" ON contract_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND contracts.creator_id = auth.uid()
      AND contracts.status IN ('accepted', 'in_progress')
    )
  );

-- Creadores pueden actualizar sus entregas
DROP POLICY IF EXISTS "Creators can update submissions" ON contract_submissions;
CREATE POLICY "Creators can update submissions" ON contract_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_submissions.contract_id
      AND contracts.creator_id = auth.uid()
    )
  );

-- Empresas pueden actualizar entregas (para aprobar/rechazar)
DROP POLICY IF EXISTS "Companies can update submissions" ON contract_submissions;
CREATE POLICY "Companies can update submissions" ON contract_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_submissions.contract_id
      AND contracts.company_id = auth.uid()
    )
  );

-- 7. Politicas para contract_templates
-- =====================================================
DROP POLICY IF EXISTS "Companies manage own templates" ON contract_templates;
CREATE POLICY "Companies manage own templates" ON contract_templates
  FOR ALL USING (auth.uid() = company_id);

-- 8. Trigger para updated_at
-- =====================================================
DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON contracts;
CREATE TRIGGER trigger_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_submissions_updated_at ON contract_submissions;
CREATE TRIGGER trigger_submissions_updated_at
  BEFORE UPDATE ON contract_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TERMINOS LEGALES BASE DE OCTOPUS (Plantilla)
-- =====================================================
-- Esta es la plantilla base que se incluye en todos los contratos
-- Las empresas pueden agregar terminos adicionales

COMMENT ON TABLE contracts IS 'Contratos entre empresas y creadores. Incluye terminos base de Octopus mas terminos personalizados de la empresa.';

-- =====================================================
-- FIN - Ejecutar este script completo en Supabase
-- =====================================================
