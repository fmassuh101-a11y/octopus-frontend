-- FIX: la tabla public.campaigns tenía RLS de SELECT completamente pública
-- ("campaigns_select_all" USING (true)) — cualquiera con la anon key (que
-- va en el bundle de JS, es pública por diseño) podía leer TODAS las
-- campañas de TODAS las empresas sin login: company_id, company_name,
-- title, objective, status de cada una. Detectado en auditoría externa
-- 20 jul 2026. Solo dos pantallas de la app usan esta tabla
-- (app/company/campaigns/[id] y app/company/campaigns/new), ambas del
-- lado empresa autenticado — no hay ningún caso legítimo de lectura
-- pública. Pegar en el SQL Editor de Supabase.

DROP POLICY IF EXISTS "campaigns_select_all" ON public.campaigns;
CREATE POLICY "campaigns_select_own" ON public.campaigns FOR SELECT USING (auth.uid() = company_id);
