-- FIX CRÍTICO DE SEGURIDAD — 20 jul 2026
-- ============================================================================
-- HALLAZGO (encontrado auditando antes de promocionar la app públicamente):
-- Cualquier usuario logueado (no admin, un creador o empresa cualquiera)
-- podía leer con su propia sesión, directo contra la API de Supabase:
--   - la tabla `profiles` COMPLETA de TODOS los usuarios: email real,
--     teléfono (columna phone_number Y dentro del JSON de `bio`), y todo
--     lo demás — sin ningún filtro por dueño.
--   - la tabla `contracts` COMPLETA de TODAS las empresas/creadores: montos
--     pagados, títulos de campaña, condiciones — de contratos ajenos.
-- Esto pasaba porque las políticas RLS de esas dos tablas permitían leer a
-- "cualquier usuario autenticado", sin filtrar por auth.uid(). Las demás
-- tablas (wallets, withdrawal_requests, waitlist, applications, disputes)
-- SÍ estaban bien filtradas — se probó específicamente antes de este fix.
--
-- QUÉ HACE ESTE ARCHIVO:
-- 1. `profiles`: cada usuario ahora solo puede leer/editar SU PROPIA fila
--    (+ el admin puede leer todas, para el panel /admin).
-- 2. Crea la vista `public_profiles`: expone SOLO las columnas públicas de
--    la app (nombre, foto, redes, ciudad, rubro, etc.) — nunca email ni
--    teléfono — y limpia el JSON de `bio` sacándole cualquier campo tipo
--    teléfono/email/dirección antes de mostrarlo. Esta vista es la que usa
--    el código para mostrar perfiles de OTROS usuarios (recruit, chat,
--    aplicantes, contratos, etc.).
-- 3. `contracts`: cada empresa/creador ahora solo puede leer/editar los
--    contratos donde ES PARTE (creator_id o company_id = su propio id).
--
-- CÓMO APLICAR: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Es seguro correrlo aunque ya existan políticas con otros nombres (las
-- borra todas primero, dinámicamente, y las vuelve a crear bien).
-- No borra ni modifica ningún dato — solo permisos de lectura/escritura.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) PROFILES: solo el dueño (+ admin) puede leer/escribir su fila
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'fmassuh133@gmail.com');

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2) VISTA PÚBLICA SEGURA: lo único que la app puede mostrar de OTROS
--    usuarios. Nunca email, nunca teléfono, nunca ids internos de Whop/KYC.
-- ---------------------------------------------------------------------------

-- limpia el JSON de bio: saca cualquier llave que sea contacto/identificación
CREATE OR REPLACE FUNCTION public.redact_bio(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  j jsonb;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;
  BEGIN
    j := raw::jsonb;
  EXCEPTION WHEN others THEN
    RETURN raw; -- no era JSON (texto libre) — se deja tal cual
  END;
  IF jsonb_typeof(j) <> 'object' THEN
    RETURN raw;
  END IF;
  j := j - 'phoneNumber' - 'phone' - 'email' - 'address' - 'dni' - 'rut'
         - 'whatsapp' - 'bankAccount' - 'cardNumber' - 'idNumber' - 'cvv';
  RETURN j::text;
END;
$$;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id,
  user_id,
  user_type,
  full_name,
  username,
  location,
  academic_level,
  studies,
  instagram,
  tiktok,
  youtube,
  profile_photo_url,
  avatar_url,
  public.redact_bio(bio) AS bio,
  skills,
  company_name,
  website,
  created_at,
  verified,
  plan,
  is_pro
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) CONTRACTS: solo las dos partes del contrato (empresa y creador)
-- ---------------------------------------------------------------------------
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contracts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contracts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY contracts_select_party ON public.contracts
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = company_id);

CREATE POLICY contracts_select_admin ON public.contracts
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'fmassuh133@gmail.com');

CREATE POLICY contracts_insert_company ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY contracts_update_party ON public.contracts
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = company_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = company_id);

-- ---------------------------------------------------------------------------
-- Fin. Después de correr esto, avisale a Claude para que verifique con
-- pruebas reales que el hueco se cerró (login de prueba intentando leer
-- datos ajenos) y que nada se rompió (recruit, aplicantes, chat, contratos).
-- ---------------------------------------------------------------------------
