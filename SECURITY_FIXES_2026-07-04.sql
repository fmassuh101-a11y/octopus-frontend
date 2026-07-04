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

-- CRÍTICO #5: secuestro de payouts. protect_plan_columns NO congelaba
-- whop_company_id/whop_user_id/kyc_status → un atacante podía apuntar sus
-- retiros a la cuenta Whop de otra empresa. Los agregamos al trigger.
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL
     OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.plan := OLD.plan;
  NEW.plan_source := OLD.plan_source;
  NEW.discount_percent := OLD.discount_percent;
  NEW.is_admin := OLD.is_admin;
  NEW.verified := OLD.verified;
  NEW.whop_company_id := OLD.whop_company_id;
  NEW.whop_user_id := OLD.whop_user_id;
  NEW.kyc_status := OLD.kyc_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CRÍTICO #6: guard de monto en process_payment (nada de montos negativos
-- que inflen la wallet del atacante).
CREATE OR REPLACE FUNCTION process_payment(
  p_company_id UUID, p_creator_id UUID, p_amount DECIMAL,
  p_reference_id UUID, p_reference_type VARCHAR, p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_company_wallet wallets%ROWTYPE;
  v_creator_wallet wallets%ROWTYPE;
  v_platform_fee DECIMAL;
  v_creator_amount DECIMAL;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monto inválido');
  END IF;
  v_platform_fee := p_amount * 0.045;
  v_creator_amount := p_amount - v_platform_fee;
  SELECT * INTO v_company_wallet FROM wallets WHERE user_id = p_company_id;
  IF v_company_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  SELECT * INTO v_creator_wallet FROM wallets WHERE user_id = p_creator_id;
  IF v_creator_wallet.id IS NULL THEN
    INSERT INTO wallets (user_id, user_type) VALUES (p_creator_id, 'creator') RETURNING * INTO v_creator_wallet;
  END IF;
  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_company_wallet.id;
  UPDATE wallets SET balance = balance + v_creator_amount, total_earned = total_earned + v_creator_amount, updated_at = NOW() WHERE id = v_creator_wallet.id;
  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_company_wallet.id, 'payment_sent', p_amount, 0, p_amount, p_description, p_reference_id, p_reference_type);
  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_creator_wallet.id, 'payment_received', p_amount, v_platform_fee, v_creator_amount, p_description, p_reference_id, p_reference_type);
  RETURN jsonb_build_object('success', true, 'amount', p_amount, 'fee', v_platform_fee, 'creator_receives', v_creator_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.process_payment(UUID, UUID, DECIMAL, UUID, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment(UUID, UUID, DECIMAL, UUID, VARCHAR, TEXT) TO service_role;

-- MEDIA #7: create_delivery_notification era llamable por cualquiera vía RPC
-- → notificaciones falsas de "pago recibido" (phishing interno). Solo servidor.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_delivery_notification') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_delivery_notification(UUID,UUID,VARCHAR,VARCHAR,TEXT,JSONB) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_delivery_notification(UUID,UUID,VARCHAR,VARCHAR,TEXT,JSONB) TO service_role';
  END IF;
END $$;

-- CRÍTICO #1: rotar la contraseña del admin (el admin123 del SQL versionado).
-- CAMBIA 'PONE-UNA-CLAVE-FUERTE-AQUI' por una contraseña larga y única ANTES de correr.
UPDATE auth.users
  SET encrypted_password = crypt('PONE-UNA-CLAVE-FUERTE-AQUI', gen_salt('bf'))
  WHERE email = 'admin@octopus.app';

NOTIFY pgrst, 'reload schema';
SELECT 'Fixes de seguridad aplicados: pagos, planes, payouts, permisos, wallets y notificaciones protegidos' AS status;
