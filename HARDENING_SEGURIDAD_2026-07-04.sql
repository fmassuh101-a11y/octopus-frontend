-- =====================================================================
-- HARDENING DE SEGURIDAD — Octopus — 4 jul 2026
-- Consolida los hallazgos de la auditoría de 13 agentes.
-- Idempotente: se puede correr varias veces. Pegar TODO en Supabase → Run.
-- CORRER DESPUÉS de: MASTER_DATABASE_SETUP + MIGRACION_CONSOLIDADA +
--   TEAM_FINAL + FASE_A_ENTREGAS + HABLEMOS_OFERTAS + SECURITY_FIXES_2026-07-04.
-- NADA de esto rompe la app (no toca select=* de perfiles).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. VERIFICACIÓN: ¿los triggers de protección ya existen? (deben salir 3)
-- ---------------------------------------------------------------------
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'protect_%';

-- ---------------------------------------------------------------------
-- 1. DINERO: wallet nunca negativa + pago atómico sin doble gasto
-- ---------------------------------------------------------------------
-- Red de seguridad a nivel de tabla: ninguna wallet puede quedar negativa
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS balance_non_negative;
ALTER TABLE public.wallets ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

-- process_payment con LOCK de fila (FOR UPDATE) → evita doble pago por carrera
CREATE OR REPLACE FUNCTION public.process_payment(
  p_company_id UUID, p_creator_id UUID, p_amount DECIMAL,
  p_reference_id UUID DEFAULT NULL, p_reference_type VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_wallet public.wallets%ROWTYPE;
  v_fee DECIMAL; v_net DECIMAL;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monto inválido');
  END IF;
  -- BLOQUEA la fila de la wallet de la empresa hasta el commit
  SELECT * INTO v_company_wallet FROM public.wallets
    WHERE user_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa sin wallet');
  END IF;
  IF v_company_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente', 'needsFunds', true);
  END IF;
  v_fee := ROUND(p_amount * 0.045, 2);   -- comisión plataforma 4.5%
  v_net := p_amount - v_fee;

  UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = p_company_id;
  UPDATE public.wallets SET balance = balance + v_net,
    total_earned = COALESCE(total_earned,0) + v_net, updated_at = now()
    WHERE user_id = p_creator_id;

  INSERT INTO public.transactions (wallet_id, type, amount, fee, net_amount, status, description, reference_id, reference_type)
  SELECT id, 'payment_sent', p_amount, 0, p_amount, 'completed', p_description, p_reference_id, p_reference_type
    FROM public.wallets WHERE user_id = p_company_id;
  INSERT INTO public.transactions (wallet_id, type, amount, fee, net_amount, status, description, reference_id, reference_type)
  SELECT id, 'payment_received', p_amount, v_fee, v_net, 'completed', p_description, p_reference_id, p_reference_type
    FROM public.wallets WHERE user_id = p_creator_id;

  RETURN jsonb_build_object('success', true, 'net_amount', v_net, 'fee', v_fee);
END; $$;

REVOKE EXECUTE ON FUNCTION public.process_payment(UUID,UUID,DECIMAL,UUID,VARCHAR,TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.process_payment(UUID,UUID,DECIMAL,UUID,VARCHAR,TEXT) TO service_role;

-- Idempotencia: una entrega no puede pagarse dos veces
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_per_delivery
  ON public.transactions (reference_id)
  WHERE type = 'payment_received' AND reference_type = 'delivery';

-- ---------------------------------------------------------------------
-- 2. ENTREGAS: el creador NO puede tocar monto/estado/empresa de su entrega
--    (antes podía poner payment_amount=999999 y vaciar la wallet de la empresa)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_delivery_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = NEW.creator_id THEN
    -- congelar campos sensibles frente a updates del creador
    NEW.payment_amount     := OLD.payment_amount;
    NEW.company_id         := OLD.company_id;
    NEW.creator_id         := OLD.creator_id;
    NEW.approved_at        := OLD.approved_at;
    NEW.payment_released_at := OLD.payment_released_at;
    -- el creador no puede auto-aprobarse ni auto-completarse
    IF NEW.status IN ('approved','completed') AND OLD.status NOT IN ('approved','completed') THEN
      NEW.status := OLD.status;
    END IF;
    -- una vez pagada, no puede reabrirla (evita cobrar dos veces / bait-and-switch)
    IF OLD.status IN ('approved','completed') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS protect_delivery_columns_trigger ON public.content_deliveries;
CREATE TRIGGER protect_delivery_columns_trigger
  BEFORE UPDATE ON public.content_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.protect_delivery_columns();

-- Al INSERTAR una entrega, exigir que exista una aplicación aceptada
-- que ligue creador + empresa (no entregas huérfanas contra cualquier empresa)
DROP POLICY IF EXISTS "Creators can create deliveries" ON public.content_deliveries;
CREATE POLICY "Creators can create deliveries" ON public.content_deliveries
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.creator_id = content_deliveries.creator_id
        AND a.company_id = content_deliveries.company_id
        AND a.status = 'accepted'
    )
  );

-- ---------------------------------------------------------------------
-- 3. CONTRATOS: el creador solo acepta/rechaza + pone sus handles,
--    NO cambia monto ni marca el contrato como completado
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_contract_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = NEW.creator_id AND auth.uid() <> NEW.company_id THEN
    NEW.payment_amount := OLD.payment_amount;
    NEW.company_id     := OLD.company_id;
    -- el creador solo puede mover el estado a viewed/accepted/rejected
    IF NEW.status NOT IN ('viewed','accepted','rejected') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS protect_contract_columns_trigger ON public.contracts;
CREATE TRIGGER protect_contract_columns_trigger
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.protect_contract_columns();

-- ---------------------------------------------------------------------
-- 4. APLICACIONES: el creador NO puede auto-aceptarse
--    (solo puede retirarse; aceptar/rechazar lo hace la empresa)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() = NEW.creator_id THEN NEW.status := 'pending'; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- si quien edita es el creador, solo puede pasar a 'withdrawn'
    IF auth.uid() = NEW.creator_id AND auth.uid() <> COALESCE(NEW.company_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      IF NEW.status <> OLD.status AND NEW.status <> 'withdrawn' THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS protect_application_status_trigger ON public.applications;
CREATE TRIGGER protect_application_status_trigger
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.protect_application_status();

-- ---------------------------------------------------------------------
-- 5. RESEÑAS: no auto-reseñarse ni bombardear; solo con entrega completada
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_verified" ON public.reviews;
CREATE POLICY "reviews_insert_verified" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewee_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.content_deliveries d
      WHERE d.id = reviews.delivery_id
        AND d.status = 'completed'
        AND ( (d.company_id = auth.uid() AND d.creator_id = reviews.reviewee_id)
           OR (d.creator_id = auth.uid() AND d.company_id = reviews.reviewee_id) )
    )
  );
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_delivery
  ON public.reviews(delivery_id, reviewer_id);

-- ---------------------------------------------------------------------
-- 6. RETIROS: el usuario no puede pedir más de su saldo ni inventar net_amount
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_withdrawal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance DECIMAL;
BEGIN
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = NEW.user_id;
  IF v_balance IS NULL OR NEW.amount IS NULL OR NEW.amount <= 0 OR NEW.amount > v_balance THEN
    RAISE EXCEPTION 'Monto de retiro inválido o mayor al saldo disponible';
  END IF;
  -- el servidor recalcula fee/net; el cliente no los controla
  NEW.fee := ROUND(NEW.amount * 0.0, 2);       -- ajustar si cobras fee de retiro
  NEW.net_amount := NEW.amount - NEW.fee;
  NEW.status := 'pending';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_withdrawal_trigger ON public.withdrawal_requests;
CREATE TRIGGER validate_withdrawal_trigger
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal();

-- ---------------------------------------------------------------------
-- 7. OFERTAS "HABLEMOS": la empresa solo cambia el estado, no se auto-fija precio/comisión
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_offer_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- solo el service_role (admin API) puede fijar los términos de la oferta
  IF auth.role() <> 'service_role' THEN
    NEW.offer_price      := OLD.offer_price;
    NEW.offer_commission := OLD.offer_commission;
    NEW.offer_seats      := OLD.offer_seats;
    NEW.offer_message    := OLD.offer_message;
    -- la empresa solo puede aceptar/rechazar una oferta ya enviada
    IF NEW.offer_status NOT IN ('accepted','declined') OR OLD.offer_status <> 'offered' THEN
      NEW.offer_status := OLD.offer_status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS protect_offer_columns_trigger ON public.contact_requests;
CREATE TRIGGER protect_offer_columns_trigger
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_offer_columns();

-- ---------------------------------------------------------------------
-- 8. MÉTRICAS FALSAS: el creador no puede inflar sus followers/views a mano
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tiktok_data') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.protect_metrics() RETURNS TRIGGER
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
      BEGIN
        IF auth.role() <> ''service_role'' THEN
          NEW.metrics := OLD.metrics;
        END IF;
        RETURN NEW;
      END; $f$;';
    EXECUTE 'DROP TRIGGER IF EXISTS protect_metrics_trigger ON public.tiktok_data';
    EXECUTE 'CREATE TRIGGER protect_metrics_trigger BEFORE UPDATE ON public.tiktok_data
      FOR EACH ROW EXECUTE FUNCTION public.protect_metrics()';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 9. VISTA content_deliveries_full: que respete RLS (no exponga todo a todos)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name='content_deliveries_full') THEN
    EXECUTE 'ALTER VIEW public.content_deliveries_full SET (security_invoker = true)';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 10. PERMISOS DE EQUIPO: un "Colaborador/viewer" no puede crear/editar campañas
--     (la RLS solo miraba status='accepted', ignoraba el permiso granular)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "campaigns_member_insert" ON public.campaigns;
CREATE POLICY "campaigns_member_insert" ON public.campaigns FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members tm
    WHERE tm.company_id = campaigns.company_id AND tm.status='accepted'
      AND lower(tm.email) = lower(auth.jwt() ->> 'email')
      AND tm.permissions ? 'create_campaigns')
);
DROP POLICY IF EXISTS "campaigns_member_update" ON public.campaigns;
CREATE POLICY "campaigns_member_update" ON public.campaigns FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.team_members tm
    WHERE tm.company_id = campaigns.company_id AND tm.status='accepted'
      AND lower(tm.email) = lower(auth.jwt() ->> 'email')
      AND tm.permissions ? 'edit_campaigns')
);
DROP POLICY IF EXISTS "gigs_member_insert" ON public.gigs;
CREATE POLICY "gigs_member_insert" ON public.gigs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members tm
    WHERE tm.company_id = gigs.company_id AND tm.status='accepted'
      AND lower(tm.email) = lower(auth.jwt() ->> 'email')
      AND tm.permissions ? 'create_campaigns')
);
DROP POLICY IF EXISTS "gigs_member_update" ON public.gigs;
CREATE POLICY "gigs_member_update" ON public.gigs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.team_members tm
    WHERE tm.company_id = gigs.company_id AND tm.status='accepted'
      AND lower(tm.email) = lower(auth.jwt() ->> 'email')
      AND tm.permissions ? 'edit_campaigns')
);

-- ---------------------------------------------------------------------
-- 11. RPC hardening residual: funciones de contenido llamables solo por logueados
-- ---------------------------------------------------------------------
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'submit_content_delivery(uuid,text,text,text)',
    'approve_content_delivery(uuid,text)',
    'request_content_revision(uuid,text)',
    'release_payment_on_approval(uuid)'
  ]) LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    EXCEPTION WHEN undefined_function THEN NULL; END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
SELECT '✅ Hardening de seguridad aplicado' AS status;

-- =====================================================================
-- OPCIONAL (requiere probar la app primero — NO correr a ciegas):
-- Esconder email/phone de OTROS usuarios. Como la app usa select=* en
-- profiles, esto necesita cambios de código coordinados. Ver el informe.
-- =====================================================================
