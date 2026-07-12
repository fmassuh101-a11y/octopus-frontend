-- ============================================================
-- MENSAJES WHOP (jul 2026) — pegar en el editor SQL de Supabase
-- Guarda la identidad de chat de Whop de cada usuario (sin OAuth).
-- Idempotente.
-- ============================================================

alter table public.profiles add column if not exists whop_user_id text;
