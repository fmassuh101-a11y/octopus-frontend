-- =====================================================
-- OCTOPUS - SCRIPT COMPLETO DE BASE DE DATOS
-- Ejecutar TODO en Supabase SQL Editor
-- Fecha: Febrero 2026
-- =====================================================

-- =====================================================
-- PARTE 1: FUNCION AUXILIAR
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- PARTE 2: TABLA PROFILES
-- =====================================================

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

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON public.profiles(user_type);

-- =====================================================
-- PARTE 3: TABLA GIGS (TRABAJOS)
-- =====================================================

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

-- =====================================================
-- PARTE 4: TABLA APPLICATIONS (APLICACIONES)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID REFERENCES public.gigs ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
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

-- =====================================================
-- PARTE 5: TABLA MESSAGES (MENSAJES)
-- =====================================================

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

-- =====================================================
-- PARTE 6: TABLA CONTRACTS (CONTRATOS)
-- =====================================================

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
  FOR UPDATE USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Creators can update their contracts" ON public.contracts;
CREATE POLICY "Creators can update their contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS contracts_company_id_idx ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS contracts_creator_id_idx ON public.contracts(creator_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_gig_id_idx ON public.contracts(gig_id);

-- =====================================================
-- PARTE 7: TABLA CONTRACT_SUBMISSIONS (ENTREGAS)
-- =====================================================

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

-- =====================================================
-- PARTE 8: TABLA VERIFIED_ACCOUNTS (CUENTAS VERIFICADAS)
-- =====================================================

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

-- =====================================================
-- PARTE 9: TRIGGERS PARA UPDATED_AT
-- =====================================================

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

-- =====================================================
-- PARTE 10: FUNCION PARA CREAR PERFIL AUTOMATICAMENTE
-- =====================================================

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

-- =====================================================
-- PARTE 11: VERIFICAR QUE TODO ESTA CORRECTO
-- =====================================================

-- Ver todas las tablas con RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'gigs', 'applications', 'messages', 'contracts', 'contract_submissions', 'verified_accounts');

-- Ver todas las policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Recargar schema de PostgREST
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- FIN DEL SCRIPT
-- Si ves las tablas con rowsecurity = true, todo esta OK
-- =====================================================
