-- =====================================================================
-- EQUIPO + ROLES (final) — corré esto en Supabase SQL Editor.
-- Va después de la migración consolidada. Idempotente.
-- =====================================================================

-- Vínculo del miembro + permisos por miembro
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS member_user_id UUID;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS name TEXT;

-- El invitado puede VER y ACEPTAR sus propias invitaciones (por su email del JWT)
DROP POLICY IF EXISTS "team_members_invitee_read" ON public.team_members;
CREATE POLICY "team_members_invitee_read" ON public.team_members FOR SELECT
  USING (auth.uid() = company_id OR lower(email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "team_members_invitee_update" ON public.team_members;
CREATE POLICY "team_members_invitee_update" ON public.team_members FOR UPDATE
  USING (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Miembros ACEPTADOS pueden crear/editar campañas y gigs de la empresa
DROP POLICY IF EXISTS "campaigns_member_insert" ON public.campaigns;
CREATE POLICY "campaigns_member_insert" ON public.campaigns FOR INSERT WITH CHECK (
  auth.uid() = company_id OR EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.company_id = campaigns.company_id
      AND tm.status = 'accepted' AND lower(tm.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "campaigns_member_update" ON public.campaigns;
CREATE POLICY "campaigns_member_update" ON public.campaigns FOR UPDATE USING (
  auth.uid() = company_id OR EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.company_id = campaigns.company_id
      AND tm.status = 'accepted' AND lower(tm.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "gigs_member_insert" ON public.gigs;
CREATE POLICY "gigs_member_insert" ON public.gigs FOR INSERT WITH CHECK (
  auth.uid() = company_id OR EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.company_id = gigs.company_id
      AND tm.status = 'accepted' AND lower(tm.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "gigs_member_update" ON public.gigs;
CREATE POLICY "gigs_member_update" ON public.gigs FOR UPDATE USING (
  auth.uid() = company_id OR EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.company_id = gigs.company_id
      AND tm.status = 'accepted' AND lower(tm.email) = lower(auth.jwt() ->> 'email')));

NOTIFY pgrst, 'reload schema';
SELECT 'Equipo + roles listos ✅' AS status;
