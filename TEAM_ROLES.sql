-- Roles y permisos por miembro del equipo. Correr después de TEAM_WORKSPACE.sql
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
-- (la columna 'role' ya existe: manager / editor / viewer / custom)

NOTIFY pgrst, 'reload schema';
SELECT 'Roles y permisos listos ✅' AS status;
