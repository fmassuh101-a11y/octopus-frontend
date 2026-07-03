-- =====================================================================
-- MIGRACIÓN CONSOLIDADA — corré esto UNA vez en Supabase SQL Editor.
-- Agrega todas las columnas que la app usa y que faltaban en el schema
-- reconstruido, + baja el fee a 4.5%. Después de esto no deberían
-- aparecer más errores de "column X does not exist".
-- Idempotente: se puede correr más de una vez sin romper nada.
-- =====================================================================

-- PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whop_company_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whop_user_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- APPLICATIONS (anti-ghosting + bookmarks)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS bookmarked BOOLEAN DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS messaged_at TIMESTAMPTZ;

-- GIGS (columna budget que usa la app)
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS budget TEXT;

-- FEE de plataforma -> 4.5%
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

-- JERARQUÍA Campaña → Formatos
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

NOTIFY pgrst, 'reload schema';
SELECT 'Migración consolidada aplicada ✅' AS status;
