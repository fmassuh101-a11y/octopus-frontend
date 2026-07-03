-- Jerarquía Campaña → Formatos
-- Una "campaign" es el contenedor grande (ej: "Lanzar mi app").
-- Los "gigs" pasan a ser los formatos (clipping, UGC, faceless) dentro de una campaign.

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

-- Cada gig (formato) puede pertenecer a una campaign
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- RLS: cada empresa ve/gestiona sus propias campaigns; todos pueden leer las activas
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
SELECT 'Jerarquía de campañas creada ✅' AS status;
