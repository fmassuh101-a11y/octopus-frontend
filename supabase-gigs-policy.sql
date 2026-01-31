-- =====================================================
-- POLITICAS RLS PARA TABLA GIGS
-- Ejecutar en Supabase SQL Editor si los creadores no ven los trabajos
-- =====================================================

-- Habilitar RLS en la tabla gigs (si no esta habilitado)
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

-- Politica: Cualquiera puede ver gigs activos (para creadores)
DROP POLICY IF EXISTS "Anyone can view active gigs" ON gigs;
CREATE POLICY "Anyone can view active gigs" ON gigs
  FOR SELECT USING (status = 'active');

-- Politica: Empresas pueden ver todos sus propios gigs
DROP POLICY IF EXISTS "Companies can view own gigs" ON gigs;
CREATE POLICY "Companies can view own gigs" ON gigs
  FOR SELECT USING (auth.uid() = company_id);

-- Politica: Empresas pueden crear gigs
DROP POLICY IF EXISTS "Companies can create gigs" ON gigs;
CREATE POLICY "Companies can create gigs" ON gigs
  FOR INSERT WITH CHECK (auth.uid() = company_id);

-- Politica: Empresas pueden actualizar sus propios gigs
DROP POLICY IF EXISTS "Companies can update own gigs" ON gigs;
CREATE POLICY "Companies can update own gigs" ON gigs
  FOR UPDATE USING (auth.uid() = company_id);

-- Politica: Empresas pueden eliminar sus propios gigs
DROP POLICY IF EXISTS "Companies can delete own gigs" ON gigs;
CREATE POLICY "Companies can delete own gigs" ON gigs
  FOR DELETE USING (auth.uid() = company_id);

-- =====================================================
-- FIN
-- =====================================================
