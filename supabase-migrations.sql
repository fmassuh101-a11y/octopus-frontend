-- =====================================================
-- MIGRACIONES PARA OCTOPUS - Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columnas faltantes a la tabla gigs
-- =====================================================
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES auth.users(id);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS applicants_count INTEGER DEFAULT 0;

-- 2. Crear tabla de aplicaciones
-- =====================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar duplicados
  UNIQUE(gig_id, creator_id)
);

-- Indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_applications_gig_id ON applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_applications_creator_id ON applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 3. Crear tabla de mensajes
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('creator', 'company')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 4. Habilitar RLS (Row Level Security)
-- =====================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Politicas de seguridad para applications
-- =====================================================

-- Creadores pueden ver sus propias aplicaciones
DROP POLICY IF EXISTS "Creators can view own applications" ON applications;
CREATE POLICY "Creators can view own applications" ON applications
  FOR SELECT USING (auth.uid() = creator_id);

-- Empresas pueden ver aplicaciones a sus gigs
DROP POLICY IF EXISTS "Companies can view applications to their gigs" ON applications;
CREATE POLICY "Companies can view applications to their gigs" ON applications
  FOR SELECT USING (auth.uid() = company_id);

-- Creadores pueden crear aplicaciones
DROP POLICY IF EXISTS "Creators can create applications" ON applications;
CREATE POLICY "Creators can create applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Empresas pueden actualizar el estado de aplicaciones
DROP POLICY IF EXISTS "Companies can update application status" ON applications;
CREATE POLICY "Companies can update application status" ON applications
  FOR UPDATE USING (auth.uid() = company_id);

-- 6. Politicas de seguridad para messages
-- =====================================================

-- Usuarios pueden ver mensajes de sus conversaciones
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = messages.conversation_id
      AND (applications.creator_id = auth.uid() OR applications.company_id = auth.uid())
    )
  );

-- Usuarios pueden enviar mensajes en sus conversaciones
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversation_id
      AND (applications.creator_id = auth.uid() OR applications.company_id = auth.uid())
      AND applications.status = 'accepted'
    )
  );

-- 7. Funcion para actualizar el contador de aplicantes
-- =====================================================
CREATE OR REPLACE FUNCTION update_applicants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gigs SET applicants_count = COALESCE(applicants_count, 0) + 1 WHERE id = NEW.gig_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gigs SET applicants_count = GREATEST(COALESCE(applicants_count, 0) - 1, 0) WHERE id = OLD.gig_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar contador
DROP TRIGGER IF EXISTS trigger_update_applicants_count ON applications;
CREATE TRIGGER trigger_update_applicants_count
  AFTER INSERT OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_applicants_count();

-- 8. Funcion para actualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para applications
DROP TRIGGER IF EXISTS trigger_applications_updated_at ON applications;
CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DE MIGRACIONES
-- =====================================================
