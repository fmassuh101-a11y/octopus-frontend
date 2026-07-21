-- Conecta la tabla handle_requests (ya existía, nadie la usaba) al flujo real:
-- creador manda handles -> empresa los aprueba -> recién ahí el creador puede
-- verificar (conectar OAuth) esas cuentas. Aditivo, no rompe nada existente.

ALTER TABLE public.handle_requests
  ADD COLUMN IF NOT EXISTS company_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE;

-- IMPORTANTE: la tabla exigía application_id (NOT NULL) — pero los
-- contratos que se mandan por mensaje directo (sin pasar por una
-- "aplicación" formal) NO tienen application_id. Por eso no se podía
-- aprobar nada en esos casos. Se pasa a usar contract_id como la llave
-- real (todo contrato la tiene siempre) y application_id queda opcional.
ALTER TABLE public.handle_requests ALTER COLUMN application_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS handle_requests_contract_id_idx ON public.handle_requests(contract_id);

-- las reglas de acceso ahora se validan contra contracts (creator_id/
-- company_id están ahí directo, sin depender de que exista application_id)
DROP POLICY IF EXISTS "Parties can view handle requests" ON public.handle_requests;
CREATE POLICY "Parties can view handle requests" ON public.handle_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = handle_requests.contract_id
      AND (contracts.creator_id = auth.uid() OR contracts.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Parties can create handle requests" ON public.handle_requests;
CREATE POLICY "Parties can create handle requests" ON public.handle_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND (contracts.creator_id = auth.uid() OR contracts.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Parties can update handle requests" ON public.handle_requests;
CREATE POLICY "Parties can update handle requests" ON public.handle_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = handle_requests.contract_id
      AND (contracts.creator_id = auth.uid() OR contracts.company_id = auth.uid())
    )
  );

-- "handles" queda como array: [{platform, handle, verified, verified_at, connected_username}]
-- El default original de la tabla era '{}' (objeto), pero todo el código lo
-- trata como ARRAY ([]) — con el default viejo, una fila creada sin mandar
-- "handles" explícito podía romper la pantalla al intentar hacer .map()/
-- .find() sobre un objeto. Se corrige el default y se normalizan filas viejas.
ALTER TABLE public.handle_requests ALTER COLUMN handles SET DEFAULT '[]';
UPDATE public.handle_requests SET handles = '[]' WHERE handles = '{}'::jsonb OR handles IS NULL;

COMMENT ON COLUMN public.handle_requests.company_approved_at IS
  'Cuándo la empresa aprobó los handles que mandó el creador. Sin esto seteado, el creador no puede verificar (conectar OAuth) todavía.';
