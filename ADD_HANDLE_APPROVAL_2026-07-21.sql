-- Conecta la tabla handle_requests (ya existía, nadie la usaba) al flujo real:
-- creador manda handles -> empresa los aprueba -> recién ahí el creador puede
-- verificar (conectar OAuth) esas cuentas. Aditivo, no rompe nada existente.

ALTER TABLE public.handle_requests
  ADD COLUMN IF NOT EXISTS company_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_approved_by UUID REFERENCES public.profiles(id);

-- "handles" queda como array: [{platform, handle, verified, verified_at, connected_username}]
-- El default original de la tabla era '{}' (objeto), pero todo el código lo
-- trata como ARRAY ([]) — con el default viejo, una fila creada sin mandar
-- "handles" explícito podía romper la pantalla al intentar hacer .map()/
-- .find() sobre un objeto. Se corrige el default y se normalizan filas viejas.
ALTER TABLE public.handle_requests ALTER COLUMN handles SET DEFAULT '[]';
UPDATE public.handle_requests SET handles = '[]' WHERE handles = '{}'::jsonb OR handles IS NULL;

COMMENT ON COLUMN public.handle_requests.company_approved_at IS
  'Cuándo la empresa aprobó los handles que mandó el creador. Sin esto seteado, el creador no puede verificar (conectar OAuth) todavía.';
