-- Requisitos de campaña que realmente bloqueen al postular (jul 12). Pegar en Supabase y Run.
alter table public.gigs add column if not exists require_instagram boolean default false;
alter table public.gigs add column if not exists require_tiktok boolean default false;
alter table public.gigs add column if not exists require_age_21 boolean default false;
alter table public.gigs add column if not exists min_followers integer default 0;
