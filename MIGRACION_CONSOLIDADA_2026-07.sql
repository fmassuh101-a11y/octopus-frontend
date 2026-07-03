-- =====================================================================
-- MIGRACIÓN COMPLETA OCTOPUS — corré esto UNA vez en Supabase SQL Editor.
-- Idempotente: se puede correr más de una vez sin romper nada.
-- Incluye: columnas faltantes, fee 4.5%, jerarquía de campañas,
-- sistema de planes, cuenta admin, team members y form de contacto.
-- =====================================================================

-- ---------- COLUMNAS FALTANTES ----------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whop_company_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whop_user_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_source TEXT DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS bookmarked BOOLEAN DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS messaged_at TIMESTAMPTZ;

ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS budget TEXT;

-- ---------- FEE DE PLATAFORMA 4.5% ----------
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

-- ---------- JERARQUÍA Campaña → Formatos ----------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  title TEXT NOT NULL,
  objective TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_select_all" ON public.campaigns;
CREATE POLICY "campaigns_select_all" ON public.campaigns FOR SELECT USING (true);
DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
CREATE POLICY "campaigns_insert_own" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = company_id);
DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
CREATE POLICY "campaigns_update_own" ON public.campaigns FOR UPDATE USING (auth.uid() = company_id);
DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
CREATE POLICY "campaigns_delete_own" ON public.campaigns FOR DELETE USING (auth.uid() = company_id);

-- ---------- TEAM MEMBERS ----------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'invited',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_own" ON public.team_members;
CREATE POLICY "team_members_own" ON public.team_members FOR ALL
  USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- ---------- CONTACT REQUESTS (formulario "Hablemos") ----------
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  company TEXT,
  budget TEXT,
  reason TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert_all" ON public.contact_requests;
CREATE POLICY "contact_insert_all" ON public.contact_requests FOR INSERT WITH CHECK (true);

-- ---------- CUENTA ADMIN (admin@octopus.app / admin123) ----------
-- Requiere pgcrypto (Supabase lo trae por defecto).
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@octopus.app';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@octopus.app', crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
    );
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_id::text, admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@octopus.app'),
      'email', now(), now(), now()
    );
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = admin_id) THEN
    UPDATE public.profiles SET is_admin = true, user_type = 'admin', plan = 'enterprise' WHERE user_id = admin_id;
  ELSE
    INSERT INTO public.profiles (user_id, user_type, email, full_name, is_admin, plan)
    VALUES (admin_id, 'admin', 'admin@octopus.app', 'Admin Octopus', true, 'enterprise');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
SELECT 'Migración completa aplicada ✅ — admin@octopus.app / admin123' AS status;
