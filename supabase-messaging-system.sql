-- =====================================================
-- SISTEMA DE MENSAJERIA PROFESIONAL
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de templates de mensajes
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de settings de empresa
CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT DEFAULT 'Gracias por tu mensaje. Te respondere pronto.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Agregar columnas a messages (si no existen)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_auto_reply BOOLEAN DEFAULT false;

-- 4. Habilitar RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies para message_templates
DROP POLICY IF EXISTS "Companies manage own templates" ON message_templates;
CREATE POLICY "Companies manage own templates"
  ON message_templates FOR ALL
  USING (auth.uid() = company_id);

-- 6. RLS Policies para company_settings
DROP POLICY IF EXISTS "Companies manage own settings" ON company_settings;
CREATE POLICY "Companies manage own settings"
  ON company_settings FOR ALL
  USING (auth.uid() = company_id);

-- =====================================================
-- FIN - Ejecutar este script completo en Supabase
-- =====================================================
