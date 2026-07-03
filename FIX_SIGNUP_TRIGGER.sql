-- =====================================================================
-- FIX: "Database error saving new user"
-- Hace los triggers de signup a prueba de fallos + captura el error real.
-- Pegar en Supabase SQL Editor y Run.
-- =====================================================================

-- 1. Tabla temporal para capturar el error exacto del trigger
CREATE TABLE IF NOT EXISTS public._signup_debug (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ctx TEXT,
  err TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. handle_new_user resiliente: si algo falla, NO bloquea el registro,
--    solo anota el error. Además fija search_path (fix canónico Supabase).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public._signup_debug(ctx, err) VALUES ('handle_new_user', SQLERRM);
  RETURN NEW;
END;
$$;

-- 3. create_wallet_for_user resiliente (misma protección)
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type VARCHAR(20);
BEGIN
  SELECT user_type INTO v_user_type FROM public.profiles WHERE user_id = NEW.user_id;
  IF v_user_type IS NOT NULL THEN
    INSERT INTO public.wallets (user_id, user_type)
    VALUES (NEW.user_id, v_user_type)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public._signup_debug(ctx, err) VALUES ('create_wallet_for_user', SQLERRM);
  RETURN NEW;
END;
$$;

-- 4. Permisos que el rol de auth necesita (fix canónico del error)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, SELECT ON public.profiles TO supabase_auth_admin;
GRANT INSERT, SELECT ON public.wallets TO supabase_auth_admin;
GRANT INSERT ON public._signup_debug TO supabase_auth_admin;

-- 5. Recargar el cache de la API
NOTIFY pgrst, 'reload schema';

SELECT 'Fix aplicado OK' AS status;
