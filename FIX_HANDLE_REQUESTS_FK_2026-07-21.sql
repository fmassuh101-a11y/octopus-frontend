-- Arregla el error "violates foreign key constraint" al aprobar handles.
-- company_approved_by apuntaba a profiles(id) — pero profiles.id es un UUID
-- propio random, NO el id del usuario logueado (auth.uid()). El que sí
-- coincide es profiles.user_id. Se corrige para que apunte a auth.users(id)
-- directo, que es lo que realmente se está guardando ahí.

ALTER TABLE public.handle_requests DROP CONSTRAINT IF EXISTS handle_requests_company_approved_by_fkey;
ALTER TABLE public.handle_requests
  ADD CONSTRAINT handle_requests_company_approved_by_fkey
  FOREIGN KEY (company_approved_by) REFERENCES auth.users(id);
