-- =====================================================
-- FIX CONTRACTS CANCELLATION
-- Ejecutar en Supabase SQL Editor
-- Fecha: Febrero 2026
-- =====================================================

-- =====================================================
-- PARTE 1: AGREGAR CAMPOS FALTANTES A CONTRACTS
-- =====================================================

-- Agregar campo cancelled_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts'
                   AND column_name = 'cancelled_at') THEN
        ALTER TABLE public.contracts ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;

-- Agregar campo cancellation_reason si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts'
                   AND column_name = 'cancellation_reason') THEN
        ALTER TABLE public.contracts ADD COLUMN cancellation_reason TEXT;
    END IF;
END $$;

-- Agregar campo updated_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts'
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.contracts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- PARTE 2: VERIFICAR Y ACTUALIZAR CONSTRAINT DE STATUS
-- =====================================================

-- Actualizar el constraint de status para incluir 'cancelled'
ALTER TABLE public.contracts
DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
ADD CONSTRAINT contracts_status_check
CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'));

-- =====================================================
-- PARTE 3: CREAR/ACTUALIZAR POLITICAS RLS
-- =====================================================

-- Asegurar RLS está habilitado
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Companies can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Creators can view their contracts" ON public.contracts;
DROP POLICY IF EXISTS "Companies can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Companies can update own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Creators can update their contracts" ON public.contracts;

-- Política: Empresas pueden ver sus propios contratos
CREATE POLICY "Companies can view own contracts" ON public.contracts
  FOR SELECT USING (auth.uid() = company_id);

-- Política: Creadores pueden ver sus contratos
CREATE POLICY "Creators can view their contracts" ON public.contracts
  FOR SELECT USING (auth.uid() = creator_id);

-- Política: Empresas pueden crear contratos
CREATE POLICY "Companies can create contracts" ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() = company_id);

-- Política: Empresas pueden actualizar (incluido cancelar) sus propios contratos
CREATE POLICY "Companies can update own contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);

-- Política: Creadores pueden actualizar sus contratos (aceptar, rechazar, etc.)
CREATE POLICY "Creators can update their contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- =====================================================
-- PARTE 4: CREAR TRIGGER PARA UPDATED_AT
-- =====================================================

-- Crear función si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para contracts
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 5: VERIFICACION
-- =====================================================

-- Verificar estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;

-- Verificar políticas
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'contracts';

-- Verificar constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.contracts'::regclass
AND contype = 'c';
