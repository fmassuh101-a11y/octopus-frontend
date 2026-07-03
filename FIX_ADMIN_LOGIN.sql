-- Arregla "Database error querying schema" al iniciar sesión del admin.
-- El login de Supabase espera estos campos en '' (vacío), no en NULL.
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE email = 'admin@octopus.app';

SELECT 'Admin login arreglado ✅ — probá admin@octopus.app / admin123' AS status;
