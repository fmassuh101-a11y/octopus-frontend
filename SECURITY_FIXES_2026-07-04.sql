-- =====================================================================
-- FIXES DE SEGURIDAD — correr en Supabase SQL Editor.
-- =====================================================================

-- CRÍTICO #1: process_payment es SECURITY DEFINER y estaba expuesta vía
-- /rest/v1/rpc/ a CUALQUIER usuario autenticado → cualquiera podía
-- transferirse dinero de cualquier empresa. Solo el servidor (service_role)
-- debe poder llamarla.
REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, DECIMAL, UUID, VARCHAR, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, DECIMAL, UUID, VARCHAR, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, DECIMAL, UUID, VARCHAR, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment(UUID, UUID, DECIMAL, UUID, VARCHAR, TEXT) TO service_role;

-- CRÍTICO #2: un usuario podía cambiarse SU PROPIO plan/descuento
-- (profiles permite UPDATE de la propia fila → plan='enterprise' gratis).
-- Bloqueamos esas columnas a nivel de trigger: solo service_role puede tocarlas.
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role o acceso directo (SQL editor) pueden todo
  IF current_setting('request.jwt.claims', true) IS NULL
     OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- usuarios normales: no pueden tocar plan, descuento, verificación ni admin
  NEW.plan := OLD.plan;
  NEW.plan_source := OLD.plan_source;
  NEW.discount_percent := OLD.discount_percent;
  NEW.is_admin := OLD.is_admin;
  NEW.verified := OLD.verified;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_plan_columns_trigger ON public.profiles;
CREATE TRIGGER protect_plan_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_columns();

-- CRÍTICO #3: el invitado a un equipo podía editarse SUS PROPIOS permisos
-- (la política de update por email no restringe columnas). Trigger igual:
CREATE OR REPLACE FUNCTION public.protect_team_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL
     OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- el dueño de la empresa sí puede cambiar rol/permisos
  IF auth.uid() = OLD.company_id THEN
    RETURN NEW;
  END IF;
  -- el invitado solo puede aceptar (status + vincular su cuenta), nada más
  NEW.role := OLD.role;
  NEW.permissions := OLD.permissions;
  NEW.email := OLD.email;
  NEW.company_id := OLD.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_team_columns_trigger ON public.team_members;
CREATE TRIGGER protect_team_columns_trigger
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_team_columns();

-- ALTO #4: wallets — nadie debería poder editar su propio balance directo.
-- (la app crea wallets desde el cliente; permitir INSERT con balance 0, no UPDATE de balance)
CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL
     OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- crear wallet siempre en 0 (nadie se "auto-deposita")
    NEW.balance := 0;
    NEW.pending_balance := 0;
    NEW.total_earned := 0;
    NEW.total_withdrawn := 0;
    RETURN NEW;
  END IF;
  -- updates de usuarios normales: congelar los montos
  NEW.balance := OLD.balance;
  NEW.pending_balance := OLD.pending_balance;
  NEW.total_earned := OLD.total_earned;
  NEW.total_withdrawn := OLD.total_withdrawn;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_wallet_balance_trigger ON public.wallets;
CREATE TRIGGER protect_wallet_balance_trigger
  BEFORE INSERT OR UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_balance();

NOTIFY pgrst, 'reload schema';
SELECT 'Fixes de seguridad aplicados: pagos, planes, permisos y wallets protegidos' AS status;
