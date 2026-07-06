-- ============================================================
-- FIX RLS: "infinite recursion detected in policy" en wallets y
-- withdrawal_requests. Pegar TODO en el SQL Editor de Supabase.
--
-- La recursión pasa cuando una policy consulta la misma tabla (o una
-- tabla cuya policy vuelve a esta). La solución: policies simples que
-- solo comparan con auth.uid() — sin subconsultas a la misma tabla.
-- Fail-safe: cada usuario ve/gestiona SOLO lo suyo. Nadie ve lo ajeno.
-- ============================================================

-- ---------- WALLETS ----------
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- borrar TODAS las policies actuales de wallets (las recursivas incluidas)
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='wallets'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.wallets', p.policyname); END LOOP;
END $$;

-- el dueño lee su wallet
CREATE POLICY wallets_select_own ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- NADIE puede modificar saldos desde el cliente (solo el backend con service key,
-- que salta RLS). Sin policy de INSERT/UPDATE/DELETE = bloqueado por defecto.

-- ---------- WITHDRAWAL_REQUESTS ----------
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='withdrawal_requests'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.withdrawal_requests', p.policyname); END LOOP;
END $$;

-- el creador ve sus propias solicitudes de retiro
CREATE POLICY wr_select_own ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

-- el creador puede CREAR una solicitud a su nombre (el estado/monto real
-- lo valida el backend; acá solo permitimos crear la fila propia)
CREATE POLICY wr_insert_own ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NO se permite UPDATE/DELETE desde el cliente (aprobar/rechazar = backend).

-- ---------- VERIFICACIÓN ----------
-- Después de correr esto, estas dos consultas deben devolver filas (no error):
--   select * from public.wallets limit 1;
--   select * from public.withdrawal_requests limit 1;
