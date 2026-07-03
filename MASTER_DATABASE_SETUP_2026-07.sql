-- =====================================================================
-- OCTOPUS — SCRIPT MAESTRO DE BASE DE DATOS
-- Fecha: Julio 2026
--
-- Consolida y REEMPLAZA (para setup desde cero) estos archivos:
--   EJECUTAR_EN_SUPABASE.sql, supabase-setup.sql, supabase-migrations.sql,
--   supabase-contracts-system.sql, FIX_CONTRACTS_CANCEL.sql,
--   supabase-messaging-system.sql, setup_payments_system.sql,
--   SUPPORT_CHAT_SQL.sql, CONTENT_APPROVAL_SYSTEM.sql
-- Además agrega tablas que existían solo en la DB vieja (nunca tuvieron
-- SQL guardado, reconstruidas leyendo el código): tiktok_data,
-- handle_requests, payouts, company_topups.
--
-- USO: pegar COMPLETO en Supabase Dashboard > SQL Editor > Run.
-- Es idempotente: se puede ejecutar más de una vez sin romper nada.
--
-- DESPUÉS de ejecutar esto y de registrar el usuario admin
-- (fmassuh133@gmail.com), correr la PARTE 15 (seed de admins) de nuevo.
-- =====================================================================


-- =====================================================================
-- PARTE 1: FUNCIONES AUXILIARES
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- PARTE 2: PROFILES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  user_type TEXT CHECK (user_type IN ('creator', 'company')),
  full_name TEXT,
  username TEXT,
  email TEXT,
  location TEXT,
  phone_number TEXT,
  academic_level TEXT,
  studies TEXT,
  linkedin_url TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  profile_photo_url TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  company_name TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden leer perfiles (antes era USING(true):
-- cualquiera con la anon key podía scrapear emails/teléfonos vía REST)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- PARTE 3: GIGS (TRABAJOS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.gigs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  budget_currency TEXT DEFAULT 'USD',
  location TEXT,
  remote BOOLEAN DEFAULT true,
  platforms TEXT[],
  requirements TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'completed')),
  applicant_count INTEGER DEFAULT 0,
  company_name TEXT,
  company_logo TEXT,
  image_url TEXT,
  applicants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active gigs" ON public.gigs;
CREATE POLICY "Anyone can view active gigs" ON public.gigs
  FOR SELECT USING (status = 'active' OR company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can create gigs" ON public.gigs;
CREATE POLICY "Companies can create gigs" ON public.gigs
  FOR INSERT WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Companies can update own gigs" ON public.gigs;
CREATE POLICY "Companies can update own gigs" ON public.gigs
  FOR UPDATE USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Companies can delete own gigs" ON public.gigs;
CREATE POLICY "Companies can delete own gigs" ON public.gigs
  FOR DELETE USING (auth.uid() = company_id);

CREATE INDEX IF NOT EXISTS gigs_company_id_idx ON public.gigs(company_id);
CREATE INDEX IF NOT EXISTS gigs_status_idx ON public.gigs(status);


-- =====================================================================
-- PARTE 4: APPLICATIONS (APLICACIONES A GIGS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID REFERENCES public.gigs ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  message TEXT,
  proposed_rate DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, creator_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own applications" ON public.applications;
CREATE POLICY "Creators can view own applications" ON public.applications
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Companies can view applications to their gigs" ON public.applications;
CREATE POLICY "Companies can view applications to their gigs" ON public.applications
  FOR SELECT USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Creators can create applications" ON public.applications;
CREATE POLICY "Creators can create applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own applications" ON public.applications;
CREATE POLICY "Creators can update own applications" ON public.applications
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Companies can update applications" ON public.applications;
CREATE POLICY "Companies can update applications" ON public.applications
  FOR UPDATE USING (auth.uid() = company_id);

CREATE INDEX IF NOT EXISTS applications_gig_id_idx ON public.applications(gig_id);
CREATE INDEX IF NOT EXISTS applications_creator_id_idx ON public.applications(creator_id);
CREATE INDEX IF NOT EXISTS applications_company_id_idx ON public.applications(company_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications(status);

-- Contador de aplicantes en el gig
CREATE OR REPLACE FUNCTION update_applicants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gigs SET applicants_count = COALESCE(applicants_count, 0) + 1 WHERE id = NEW.gig_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gigs SET applicants_count = GREATEST(COALESCE(applicants_count, 0) - 1, 0) WHERE id = OLD.gig_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_applicants_count ON public.applications;
CREATE TRIGGER trigger_update_applicants_count
  AFTER INSERT OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_applicants_count();


-- =====================================================================
-- PARTE 5: MESSAGES (CHAT EMPRESA <-> CREADOR)
-- conversation_id apunta al id de la application
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('creator', 'company')),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  is_auto_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies can view messages" ON public.messages;
CREATE POLICY "Companies can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = messages.conversation_id
      AND applications.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can view messages" ON public.messages;
CREATE POLICY "Creators can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = messages.conversation_id
      AND applications.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can insert messages" ON public.messages;
CREATE POLICY "Companies can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversation_id
      AND applications.company_id = auth.uid()
    )
    AND sender_type = 'company'
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "Creators can insert messages" ON public.messages;
CREATE POLICY "Creators can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversation_id
      AND applications.creator_id = auth.uid()
    )
    AND sender_type = 'creator'
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update messages" ON public.messages;
CREATE POLICY "Users can update messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = messages.conversation_id
      AND (applications.company_id = auth.uid() OR applications.creator_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);


-- =====================================================================
-- PARTE 6: MESSAGE TEMPLATES + COMPANY SETTINGS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT DEFAULT 'Gracias por tu mensaje. Te respondere pronto.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own templates" ON public.message_templates;
CREATE POLICY "Companies manage own templates"
  ON public.message_templates FOR ALL
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Companies manage own settings" ON public.company_settings;
CREATE POLICY "Companies manage own settings"
  ON public.company_settings FOR ALL
  USING (auth.uid() = company_id);


-- =====================================================================
-- PARTE 7: CONTRACTS + SUBMISSIONS + TEMPLATES
-- (incluye ya los campos de cancelación del FIX_CONTRACTS_CANCEL)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deliverables JSONB NOT NULL DEFAULT '[]',
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_terms TEXT,
  start_date DATE,
  end_date DATE,
  content_due_date DATE,
  usage_rights JSONB DEFAULT '{"platforms": ["organic"], "duration_months": 12, "paid_ads": false, "whitelisting": false}',
  exclusivity_enabled BOOLEAN DEFAULT false,
  exclusivity_days INTEGER DEFAULT 0,
  exclusivity_competitors TEXT[],
  hashtags TEXT[],
  mentions TEXT[],
  brand_guidelines TEXT,
  additional_terms TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
  creator_signed_at TIMESTAMPTZ,
  creator_signature_ip VARCHAR(45),
  company_signed_at TIMESTAMPTZ,
  creator_handles JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies can view own contracts" ON public.contracts;
CREATE POLICY "Companies can view own contracts" ON public.contracts
  FOR SELECT USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Creators can view their contracts" ON public.contracts;
CREATE POLICY "Creators can view their contracts" ON public.contracts
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Companies can create contracts" ON public.contracts;
CREATE POLICY "Companies can create contracts" ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Companies can update own contracts" ON public.contracts;
CREATE POLICY "Companies can update own contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Creators can update their contracts" ON public.contracts;
CREATE POLICY "Creators can update their contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS contracts_company_id_idx ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS contracts_creator_id_idx ON public.contracts(creator_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_gig_id_idx ON public.contracts(gig_id);

-- Entregas asociadas a contratos
CREATE TABLE IF NOT EXISTS public.contract_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  deliverable_index INTEGER NOT NULL,
  platform VARCHAR(50) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  content_url TEXT,
  caption TEXT,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'revision', 'approved', 'rejected', 'published')),
  revision_notes TEXT,
  revision_count INTEGER DEFAULT 0,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view submissions" ON public.contract_submissions;
CREATE POLICY "Users can view submissions" ON public.contract_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_submissions.contract_id
      AND (contracts.creator_id = auth.uid() OR contracts.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators can create submissions" ON public.contract_submissions;
CREATE POLICY "Creators can create submissions" ON public.contract_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND contracts.creator_id = auth.uid()
      AND contracts.status IN ('accepted', 'in_progress')
    )
  );

DROP POLICY IF EXISTS "Creators can update submissions" ON public.contract_submissions;
CREATE POLICY "Creators can update submissions" ON public.contract_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_submissions.contract_id
      AND contracts.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can update submissions" ON public.contract_submissions;
CREATE POLICY "Companies can update submissions" ON public.contract_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_submissions.contract_id
      AND contracts.company_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS submissions_contract_id_idx ON public.contract_submissions(contract_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.contract_submissions(status);

-- Plantillas de contrato por empresa
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_deliverables JSONB DEFAULT '[]',
  default_payment_terms TEXT,
  default_usage_rights JSONB,
  default_additional_terms TEXT,
  default_brand_guidelines TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage own templates" ON public.contract_templates;
CREATE POLICY "Companies manage own templates" ON public.contract_templates
  FOR ALL USING (auth.uid() = company_id);

CREATE INDEX IF NOT EXISTS idx_contract_templates_company_id ON public.contract_templates(company_id);

COMMENT ON TABLE public.contracts IS 'Contratos entre empresas y creadores. Incluye terminos base de Octopus mas terminos personalizados de la empresa.';


-- =====================================================================
-- PARTE 8: VERIFIED_ACCOUNTS (redes sociales conectadas via OAuth)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.verified_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  platform_user_id VARCHAR(255),
  username VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  follower_count INTEGER,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.verified_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verified accounts" ON public.verified_accounts;
CREATE POLICY "Users can view own verified accounts" ON public.verified_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own verified accounts" ON public.verified_accounts;
CREATE POLICY "Users can insert own verified accounts" ON public.verified_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own verified accounts" ON public.verified_accounts;
CREATE POLICY "Users can update own verified accounts" ON public.verified_accounts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own verified accounts" ON public.verified_accounts;
CREATE POLICY "Users can delete own verified accounts" ON public.verified_accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS verified_accounts_user_id_idx ON public.verified_accounts(user_id);
CREATE INDEX IF NOT EXISTS verified_accounts_platform_idx ON public.verified_accounts(platform);


-- =====================================================================
-- PARTE 9: SISTEMA DE PAGOS INTERNO (wallets, transactions, retiros, admins)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('creator', 'company')),
  balance DECIMAL(12, 2) DEFAULT 0.00,
  pending_balance DECIMAL(12, 2) DEFAULT 0.00,
  total_earned DECIMAL(12, 2) DEFAULT 0.00,
  total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'deposit', 'withdrawal', 'payment_sent', 'payment_received', 'fee', 'refund', 'bonus'
  )),
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  reference_id UUID,
  reference_type VARCHAR(30),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL,
  method VARCHAR(30) NOT NULL CHECK (method IN ('bank_transfer', 'paypal', 'crypto_usdt', 'crypto_usdc')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  payment_details JSONB NOT NULL,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(30) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '["all"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Wallet automática al crear perfil
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type VARCHAR(20);
BEGIN
  SELECT user_type INTO v_user_type
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_user_type IS NOT NULL THEN
    INSERT INTO wallets (user_id, user_type)
    VALUES (NEW.user_id, v_user_type)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_create_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_user();

-- Pago interno empresa -> creador (fee 10%)
CREATE OR REPLACE FUNCTION process_payment(
  p_company_id UUID,
  p_creator_id UUID,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_reference_type VARCHAR,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_company_wallet wallets%ROWTYPE;
  v_creator_wallet wallets%ROWTYPE;
  v_platform_fee DECIMAL;
  v_creator_amount DECIMAL;
BEGIN
  v_platform_fee := p_amount * 0.10;
  v_creator_amount := p_amount - v_platform_fee;

  SELECT * INTO v_company_wallet FROM wallets WHERE user_id = p_company_id;

  IF v_company_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  SELECT * INTO v_creator_wallet FROM wallets WHERE user_id = p_creator_id;

  IF v_creator_wallet.id IS NULL THEN
    INSERT INTO wallets (user_id, user_type)
    VALUES (p_creator_id, 'creator')
    RETURNING * INTO v_creator_wallet;
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = v_company_wallet.id;

  UPDATE wallets
  SET balance = balance + v_creator_amount,
      total_earned = total_earned + v_creator_amount,
      updated_at = NOW()
  WHERE id = v_creator_wallet.id;

  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_company_wallet.id, 'payment_sent', p_amount, 0, p_amount, p_description, p_reference_id, p_reference_type);

  INSERT INTO transactions (wallet_id, type, amount, fee, net_amount, description, reference_id, reference_type)
  VALUES (v_creator_wallet.id, 'payment_received', p_amount, v_platform_fee, v_creator_amount, p_description, p_reference_id, p_reference_type);

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'fee', v_platform_fee,
    'creator_receives', v_creator_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS pagos
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- SIN policy de UPDATE para usuarios: los balances solo se mueven vía
-- funciones SECURITY DEFINER (process_payment) o service_role.
-- (La policy anterior permitía a cualquier usuario inflar su propio balance.)
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets"
  ON public.wallets FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can view own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can manage all withdrawal requests"
  ON public.withdrawal_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view admin list" ON public.admins;
CREATE POLICY "Admins can view admin list"
  ON public.admins FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));


-- =====================================================================
-- PARTE 10: SISTEMA DE SOPORTE (chatbot Gemini + agentes humanos)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  user_type TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting_agent', 'in_progress', 'resolved', 'closed')),
  assigned_agent_id UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'agent')),
  sender_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_escalated BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('agent', 'supervisor', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.support_conversations;
CREATE POLICY "Users can view own conversations" ON public.support_conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.support_conversations;
CREATE POLICY "Admins can view all conversations" ON public.support_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
CREATE POLICY "Users can create conversations" ON public.support_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.support_conversations;
CREATE POLICY "Users can update own conversations" ON public.support_conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all conversations" ON public.support_conversations;
CREATE POLICY "Admins can update all conversations" ON public.support_conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.support_messages;
CREATE POLICY "Users can view messages in own conversations" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.support_messages;
CREATE POLICY "Users can create messages in own conversations" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = conversation_id
      AND support_conversations.user_id = auth.uid()
    )
    OR sender_type = 'bot'
  );

DROP POLICY IF EXISTS "Admins can create messages" ON public.support_messages;
CREATE POLICY "Admins can create messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Admins can update messages" ON public.support_messages;
CREATE POLICY "Admins can update messages" ON public.support_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Admins can view admins" ON public.support_admins;
CREATE POLICY "Admins can view admins" ON public.support_admins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_admins WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE INDEX IF NOT EXISTS support_conversations_user_id_idx ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS support_conversations_updated_at_idx ON public.support_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_conversation_id_idx ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at);

CREATE OR REPLACE FUNCTION update_support_conversation_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_conversations
    SET updated_at = NOW(), last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.support_messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_support_conversation_timestamps();


-- =====================================================================
-- PARTE 11: CONTENT APPROVAL WORKFLOW (entregas de contenido UGC)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.content_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    additional_files JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'in_review', 'approved', 'revision_needed', 'completed'
    )),
    revision_count INTEGER DEFAULT 0,
    max_revisions INTEGER DEFAULT 3,
    feedback TEXT,
    feedback_history JSONB DEFAULT '[]',
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    payment_released_at TIMESTAMPTZ,
    payment_transaction_id UUID REFERENCES public.transactions(id),
    platform VARCHAR(50),
    content_type VARCHAR(50),
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_deliveries_application_id ON public.content_deliveries(application_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_creator_id ON public.content_deliveries(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_company_id ON public.content_deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_status ON public.content_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_gig_id ON public.content_deliveries(gig_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_contract_id ON public.content_deliveries(contract_id);
CREATE INDEX IF NOT EXISTS idx_content_deliveries_created_at ON public.content_deliveries(created_at DESC);

ALTER TABLE public.content_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own deliveries" ON public.content_deliveries;
CREATE POLICY "Creators can view own deliveries" ON public.content_deliveries
    FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Companies can view their deliveries" ON public.content_deliveries;
CREATE POLICY "Companies can view their deliveries" ON public.content_deliveries
    FOR SELECT USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Creators can create deliveries" ON public.content_deliveries;
CREATE POLICY "Creators can create deliveries" ON public.content_deliveries
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own deliveries" ON public.content_deliveries;
CREATE POLICY "Creators can update own deliveries" ON public.content_deliveries
    FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Companies can update deliveries" ON public.content_deliveries;
CREATE POLICY "Companies can update deliveries" ON public.content_deliveries
    FOR UPDATE USING (auth.uid() = company_id);

-- Notificaciones de entregas
CREATE TABLE IF NOT EXISTS public.delivery_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES public.content_deliveries(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'content_submitted', 'content_approved', 'revision_requested',
        'payment_released', 'delivery_completed'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notifications_recipient ON public.delivery_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_read ON public.delivery_notifications(recipient_id, read_at);

ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.delivery_notifications;
CREATE POLICY "Users can view own notifications" ON public.delivery_notifications
    FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.delivery_notifications;
CREATE POLICY "Users can update own notifications" ON public.delivery_notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- SIN policy de INSERT abierta: las notificaciones se crean únicamente vía
-- create_delivery_notification() que es SECURITY DEFINER y bypassa RLS.
-- (WITH CHECK(true) permitía a cualquiera mandar notificaciones falsas
-- tipo "pago aprobado" a cualquier usuario.)
DROP POLICY IF EXISTS "System can create notifications" ON public.delivery_notifications;

-- Funciones del flujo de aprobación
CREATE OR REPLACE FUNCTION create_delivery_notification(
    p_delivery_id UUID,
    p_recipient_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO delivery_notifications (
        delivery_id, recipient_id, type, title, message, metadata
    ) VALUES (
        p_delivery_id, p_recipient_id, p_type, p_title, p_message, p_metadata
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION submit_content_delivery(
    p_delivery_id UUID,
    p_video_url TEXT,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_creator_name TEXT;
BEGIN
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND creator_id = auth.uid();

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not authorized');
    END IF;

    IF v_delivery.status NOT IN ('draft', 'revision_needed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot submit in current status');
    END IF;

    UPDATE content_deliveries
    SET
        video_url = p_video_url,
        thumbnail_url = COALESCE(p_thumbnail_url, thumbnail_url),
        description = COALESCE(p_description, description),
        status = 'submitted',
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;

    SELECT COALESCE(full_name, username, 'Creador') INTO v_creator_name
    FROM profiles
    WHERE user_id = auth.uid();

    PERFORM create_delivery_notification(
        p_delivery_id,
        v_delivery.company_id,
        'content_submitted',
        'Nuevo contenido recibido',
        v_creator_name || ' ha subido contenido para revision',
        jsonb_build_object('creator_id', auth.uid(), 'gig_id', v_delivery.gig_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'submitted',
        'message', 'Content submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_content_delivery(
    p_delivery_id UUID,
    p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_company_name TEXT;
BEGIN
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND company_id = auth.uid();

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not authorized');
    END IF;

    IF v_delivery.status NOT IN ('submitted', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot approve in current status');
    END IF;

    UPDATE content_deliveries
    SET
        status = 'approved',
        feedback = p_feedback,
        feedback_history = feedback_history || jsonb_build_array(
            jsonb_build_object(
                'action', 'approved',
                'feedback', p_feedback,
                'created_at', NOW(),
                'by', 'company'
            )
        ),
        reviewed_at = NOW(),
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;

    SELECT COALESCE(company_name, full_name, 'Empresa') INTO v_company_name
    FROM profiles
    WHERE user_id = auth.uid();

    PERFORM create_delivery_notification(
        p_delivery_id,
        v_delivery.creator_id,
        'content_approved',
        'Tu contenido fue aprobado!',
        v_company_name || ' aprobo tu contenido. El pago sera liberado pronto.',
        jsonb_build_object('company_id', auth.uid(), 'gig_id', v_delivery.gig_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'approved',
        'message', 'Content approved successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION request_content_revision(
    p_delivery_id UUID,
    p_feedback TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_company_name TEXT;
BEGIN
    IF p_feedback IS NULL OR LENGTH(TRIM(p_feedback)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feedback is required for revision requests');
    END IF;

    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND company_id = auth.uid();

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not authorized');
    END IF;

    IF v_delivery.status NOT IN ('submitted', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot request revision in current status');
    END IF;

    IF v_delivery.revision_count >= v_delivery.max_revisions THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum revisions reached');
    END IF;

    UPDATE content_deliveries
    SET
        status = 'revision_needed',
        feedback = p_feedback,
        feedback_history = feedback_history || jsonb_build_array(
            jsonb_build_object(
                'action', 'revision_requested',
                'feedback', p_feedback,
                'created_at', NOW(),
                'by', 'company'
            )
        ),
        revision_count = revision_count + 1,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_delivery_id;

    SELECT COALESCE(company_name, full_name, 'Empresa') INTO v_company_name
    FROM profiles
    WHERE user_id = auth.uid();

    PERFORM create_delivery_notification(
        p_delivery_id,
        v_delivery.creator_id,
        'revision_requested',
        'Se solicitaron cambios',
        v_company_name || ' solicito cambios en tu contenido: ' || LEFT(p_feedback, 100),
        jsonb_build_object(
            'company_id', auth.uid(),
            'gig_id', v_delivery.gig_id,
            'revision_number', v_delivery.revision_count + 1
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'revision_needed',
        'revision_count', v_delivery.revision_count + 1,
        'revisions_remaining', v_delivery.max_revisions - v_delivery.revision_count - 1,
        'message', 'Revision requested successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_payment_on_approval(
    p_delivery_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_delivery content_deliveries%ROWTYPE;
    v_payment_result JSONB;
    v_gig gigs%ROWTYPE;
BEGIN
    SELECT * INTO v_delivery
    FROM content_deliveries
    WHERE id = p_delivery_id AND company_id = auth.uid() AND status = 'approved';

    IF v_delivery.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found or not approved');
    END IF;

    IF v_delivery.payment_released_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment already released');
    END IF;

    IF v_delivery.payment_amount IS NULL THEN
        SELECT * INTO v_gig FROM gigs WHERE id = v_delivery.gig_id;
        IF v_gig.id IS NOT NULL THEN
            UPDATE content_deliveries
            SET payment_amount = v_gig.budget_min
            WHERE id = p_delivery_id;
            v_delivery.payment_amount := v_gig.budget_min;
        END IF;
    END IF;

    SELECT process_payment(
        v_delivery.company_id,
        v_delivery.creator_id,
        v_delivery.payment_amount,
        v_delivery.id,
        'content_delivery',
        'Pago por contenido aprobado - ' || v_delivery.title
    ) INTO v_payment_result;

    IF (v_payment_result->>'success')::boolean THEN
        UPDATE content_deliveries
        SET
            status = 'completed',
            payment_released_at = NOW(),
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_delivery_id;

        PERFORM create_delivery_notification(
            p_delivery_id,
            v_delivery.creator_id,
            'payment_released',
            'Pago recibido!',
            'Has recibido $' || v_delivery.payment_amount || ' por tu contenido aprobado',
            jsonb_build_object(
                'amount', v_delivery.payment_amount,
                'gig_id', v_delivery.gig_id
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'status', 'completed',
            'payment', v_payment_result
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', v_payment_result->>'error'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista con info completa de deliveries
CREATE OR REPLACE VIEW content_deliveries_full AS
SELECT
    cd.*,
    p_creator.full_name as creator_name,
    p_creator.avatar_url as creator_avatar,
    p_company.company_name,
    p_company.full_name as company_contact_name,
    g.title as gig_title,
    g.budget_min as gig_budget
FROM content_deliveries cd
LEFT JOIN profiles p_creator ON cd.creator_id = p_creator.user_id
LEFT JOIN profiles p_company ON cd.company_id = p_company.user_id
LEFT JOIN gigs g ON cd.gig_id = g.id;


-- =====================================================================
-- PARTE 12: TIKTOK_DATA (datos crudos de la API de TikTok por creador)
-- Reconstruida desde el código (app/company/analytics, posts, creator/[id])
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tiktok_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT,
  videos JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tiktok_data ENABLE ROW LEVEL SECURITY;

-- Las empresas necesitan leer los datos de TikTok de los creadores
DROP POLICY IF EXISTS "Authenticated users can view tiktok data" ON public.tiktok_data;
CREATE POLICY "Authenticated users can view tiktok data" ON public.tiktok_data
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own tiktok data" ON public.tiktok_data;
CREATE POLICY "Users can insert own tiktok data" ON public.tiktok_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tiktok data" ON public.tiktok_data;
CREATE POLICY "Users can update own tiktok data" ON public.tiktok_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tiktok_data_user_id_idx ON public.tiktok_data(user_id);
CREATE INDEX IF NOT EXISTS tiktok_data_created_at_idx ON public.tiktok_data(created_at DESC);


-- =====================================================================
-- PARTE 13: HANDLE_REQUESTS (solicitudes de verificación de handles)
-- Reconstruida desde el código (app/company/handle-requests)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.handle_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  handles JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.handle_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view handle requests" ON public.handle_requests;
CREATE POLICY "Parties can view handle requests" ON public.handle_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = handle_requests.application_id
      AND (applications.creator_id = auth.uid() OR applications.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Parties can create handle requests" ON public.handle_requests;
CREATE POLICY "Parties can create handle requests" ON public.handle_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_id
      AND (applications.creator_id = auth.uid() OR applications.company_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Parties can update handle requests" ON public.handle_requests;
CREATE POLICY "Parties can update handle requests" ON public.handle_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = handle_requests.application_id
      AND (applications.creator_id = auth.uid() OR applications.company_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS handle_requests_application_id_idx ON public.handle_requests(application_id);


-- =====================================================================
-- PARTE 14: TABLAS DE REGISTRO WHOP (payouts a creadores)
-- Reconstruidas desde app/api/whop/*. Las escriben rutas server-side
-- con service role (bypassa RLS); RLS solo para lecturas de usuarios.
-- NOTA: las rutas whop/transfers y whop/webhooks también referencian
-- tablas legacy "users" y "jobs" que NO se crean aquí — esas rutas son
-- experimentales (sandbox) y necesitan refactor a profiles/gigs.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  whop_transfer_id TEXT,
  amount DECIMAL(12, 2),
  fee DECIMAL(12, 2),
  creator_amount DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'usd',
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payouts" ON public.payouts;
CREATE POLICY "Users can view own payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = company_id);

CREATE TABLE IF NOT EXISTS public.company_topups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whop_company_id TEXT,
  whop_topup_id TEXT,
  amount DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'usd',
  status VARCHAR(20) DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies can view own topups" ON public.company_topups;
CREATE POLICY "Companies can view own topups" ON public.company_topups
  FOR SELECT USING (auth.uid() = company_id);


-- =====================================================================
-- PARTE 15: SEED DE ADMINS
-- Requiere que el usuario ya exista en auth.users.
-- Si acabás de crear el proyecto, registrate primero en la app con
-- fmassuh133@gmail.com y volvé a correr SOLO esta parte.
-- =====================================================================

INSERT INTO public.admins (user_id, email, role, permissions)
SELECT id, email, 'super_admin', '["all"]'
FROM auth.users
WHERE LOWER(email) = 'fmassuh133@gmail.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.support_admins (user_id, email, role, is_active)
SELECT id, email, 'admin', true
FROM auth.users
WHERE LOWER(email) = 'fmassuh133@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_active = true, role = 'admin';


-- =====================================================================
-- PARTE 16: TRIGGERS UPDATED_AT (todas las tablas)
-- =====================================================================

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_gigs_updated_at ON public.gigs;
CREATE TRIGGER trigger_gigs_updated_at
  BEFORE UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON public.contracts;
CREATE TRIGGER trigger_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_submissions_updated_at ON public.contract_submissions;
CREATE TRIGGER trigger_submissions_updated_at
  BEFORE UPDATE ON public.contract_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_verified_accounts_updated_at ON public.verified_accounts;
CREATE TRIGGER trigger_verified_accounts_updated_at
  BEFORE UPDATE ON public.verified_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_content_deliveries_updated_at ON public.content_deliveries;
CREATE TRIGGER trigger_content_deliveries_updated_at
  BEFORE UPDATE ON public.content_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_message_templates_updated_at ON public.message_templates;
CREATE TRIGGER trigger_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trigger_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tiktok_data_updated_at ON public.tiktok_data;
CREATE TRIGGER trigger_tiktok_data_updated_at
  BEFORE UPDATE ON public.tiktok_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_handle_requests_updated_at ON public.handle_requests;
CREATE TRIGGER trigger_handle_requests_updated_at
  BEFORE UPDATE ON public.handle_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================================
-- PARTE 17: VERIFICACIÓN FINAL
-- =====================================================================

-- Recargar el schema cache de la API REST
NOTIFY pgrst, 'reload schema';

-- Debe listar ~22 tablas, todas con rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
