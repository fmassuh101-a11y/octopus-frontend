-- ═══════════════════════════════════════════════════════════════════════════
-- CRÍTICO — tokens de redes sociales expuestos, y dos huecos más
-- 29 de julio de 2026
--
-- CORRER ESTO COMPLETO EN EL SQL EDITOR DE SUPABASE.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- QUÉ PASABA (lo peor encontrado en toda la auditoría)
--
-- Los callbacks de OAuth guardan el token de acceso y el de refresco dentro del
-- JSON de `profiles.bio`, anidados así:
--     bio.tiktokAccounts[0].accessToken
--     bio.youtubeAccounts[0].refreshToken
--     bio.instagramAccounts[0].accessToken
--
-- La vista `public_profiles` expone `bio` y corre con security_invoker = false,
-- o sea saltándose el RLS, y está otorgada a `authenticated`.
--
-- La función que debía limpiarla usaba el operador `-` de jsonb, que SOLO borra
-- claves del primer nivel. Los tokens están dentro de un arreglo, así que la
-- limpieza nunca los tocaba.
--
-- Resultado: cualquiera se registraba (el registro es abierto), tomaba su token
-- y la llave anónima —que está en el bundle, es pública por diseño— y pedía:
--     GET /rest/v1/public_profiles?select=user_id,bio&limit=1000
-- y recibía los tokens de TikTok, YouTube e Instagram de TODOS los creadores.
-- Con eso se pueden leer sus datos privados y, según los permisos, publicar en
-- su nombre. Es tomar el control de las cuentas sociales de los creadores, que
-- es justo el activo que sostiene el marketplace.
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. SACAR `bio` DE LA VISTA PÚBLICA
--
-- No se intenta limpiar el JSON mejor: se saca entero. Limpiar por lista de
-- claves ya falló una vez, y va a volver a fallar la próxima vez que alguien
-- guarde algo nuevo ahí adentro. Lo que nadie necesita ver, no se publica.
--
-- Lo que sí se necesita de `bio` para mostrar un perfil —la descripción y las
-- cuentas de redes SIN sus tokens— se arma acá abajo en columnas aparte.
-- ─────────────────────────────────────────────────────────────────────────

-- Deja solo lo que se puede mostrar de una cuenta de red social: el nombre de
-- usuario y los números públicos. Nada de tokens, ni de ids internos.
CREATE OR REPLACE FUNCTION public.cuentas_publicas(raw text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb;
  salida jsonb := '{}'::jsonb;
  lista jsonb;
  item jsonb;
  limpias jsonb;
  clave text;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN salida;
  END IF;
  BEGIN
    j := raw::jsonb;
  EXCEPTION WHEN others THEN
    RETURN salida;
  END;
  IF jsonb_typeof(j) <> 'object' THEN
    RETURN salida;
  END IF;

  FOREACH clave IN ARRAY ARRAY['tiktokAccounts', 'youtubeAccounts', 'instagramAccounts'] LOOP
    lista := j -> clave;
    IF lista IS NULL OR jsonb_typeof(lista) <> 'array' THEN
      CONTINUE;
    END IF;
    limpias := '[]'::jsonb;
    FOR item IN SELECT * FROM jsonb_array_elements(lista) LOOP
      -- Lista BLANCA, no negra: solo pasa lo que se nombra acá. Si mañana el
      -- callback guarda un campo nuevo, queda fuera por defecto en vez de
      -- filtrarse hasta que alguien se acuerde de agregarlo a una lista negra.
      limpias := limpias || jsonb_build_array(
        jsonb_strip_nulls(jsonb_build_object(
          'username',    item -> 'username',
          'displayName', item -> 'displayName',
          'avatarUrl',   item -> 'avatarUrl',
          'followers',   item -> 'followers',
          'following',   item -> 'following',
          'likes',       item -> 'likes',
          'videoCount',  item -> 'videoCount',
          'isVerified',  item -> 'isVerified',
          'bio',         item -> 'bio',
          -- Los últimos videos: son contenido PÚBLICO de TikTok (portada,
          -- título, views). La empresa los necesita para decidir a quién
          -- contratar, y no exponen nada privado.
          'recentVideos', item -> 'recentVideos'
        ))
      );
    END LOOP;
    salida := salida || jsonb_build_object(clave, limpias);
  END LOOP;

  -- La descripción que el creador escribió sobre sí mismo sí es pública.
  IF j ? 'about' THEN
    salida := salida || jsonb_build_object('about', j -> 'about');
  END IF;

  RETURN salida;
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
  -- `bio` YA NO SE PUBLICA EN CRUDO. En su lugar va solo lo mostrable.
  public.cuentas_publicas(bio)::text AS bio,
  skills,
  company_name,
  website,
  created_at,
  verified,
  plan,
  is_pro
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL ON public.public_profiles FROM anon;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. CERRAR EL RETIRO CON COMISIÓN A ELECCIÓN DEL CLIENTE
--
-- `oct_request_withdrawal(p_amount, p_fee_percent)` es SECURITY DEFINER y está
-- otorgada a `authenticated`. El PORCENTAJE DE COMISIÓN es un parámetro que
-- manda quien llama, y la función acepta 0 sin chistar.
--
-- Cualquiera podía llamarla desde el navegador con {"p_fee_percent": 0} y
-- retirar sin pagar comisión, sin pasar por ninguna ruta de la app.
--
-- Ninguna parte del código la usa, así que se cierra sin romper nada.
-- ─────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.oct_request_withdrawal(numeric, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.oct_request_withdrawal(numeric, numeric) FROM anon;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. CONGELAR email, is_pro Y user_type
--
-- El trigger que ya existe congela plan, is_admin, verified y las cuentas de
-- Whop — eso está bien hecho. Pero deja editar estas tres desde el navegador:
--
--   is_pro     → suscripción Pro gratis y 0% de comisión al retirar.
--   user_type  → un creador se declara empresa y habilita pagar a otros.
--   email      → el peor. whopIdentity busca un perfil "gemelo" POR EMAIL para
--                reutilizar su cuenta de Whop. Poniéndose el correo de otra
--                persona que aún no tenga cuenta, cuando esa persona active sus
--                cobros adopta la cuenta del atacante — y su dinero cae ahí.
--                Describe exactamente a todo usuario nuevo el día del
--                lanzamiento.
--
-- El email real vive en auth.users; el de profiles es una copia para mostrar.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Con la service key (el servidor) se permite todo: las rutas ya validan.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Columnas que el usuario NUNCA puede cambiar desde el navegador.
  NEW.plan             := OLD.plan;
  NEW.plan_source      := OLD.plan_source;
  NEW.discount_percent := OLD.discount_percent;
  NEW.is_admin         := OLD.is_admin;
  NEW.verified         := OLD.verified;
  NEW.whop_company_id  := OLD.whop_company_id;
  NEW.whop_user_id     := OLD.whop_user_id;
  NEW.kyc_status       := OLD.kyc_status;

  -- Agregadas el 29 jul 2026 tras la auditoría.
  NEW.email            := OLD.email;
  NEW.is_pro           := OLD.is_pro;
  NEW.user_type        := OLD.user_type;

  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- COMPROBACIÓN — debe devolver CERO filas con tokens
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  count(*) FILTER (WHERE bio ILIKE '%accessToken%')  AS con_token_acceso,
  count(*) FILTER (WHERE bio ILIKE '%refreshToken%') AS con_token_refresco
FROM public.public_profiles;
