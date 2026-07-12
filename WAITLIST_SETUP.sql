-- ============================================================
-- LISTA DE ESPERA (jul 2026) — pegar en el editor SQL de Supabase
-- No depende de ninguna tabla previa. Idempotente (se puede correr 2 veces).
-- La app escribe SOLO desde el server con la service key (RLS cerrado al público).
-- ============================================================

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('creator','company')),
  email text not null,
  name text,
  experience text,             -- creador: si / mas_o_menos / empezando / no
  company_name text,           -- empresa
  niche text,                  -- empresa
  marketing_experience text,   -- empresa: si / no / algo
  referred_by uuid references public.waitlist(id),
  referral_count int not null default 0,
  created_at timestamptz not null default now()
);

-- un email solo puede anotarse una vez
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));

-- RLS: cerrado al público (solo la service key del server puede leer/escribir)
alter table public.waitlist enable row level security;

-- sumar un referido de forma atómica (la llama el server al anotar un invitado)
create or replace function public.oct_waitlist_ref(p_ref uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.waitlist set referral_count = referral_count + 1 where id = p_ref;
$$;

revoke all on function public.oct_waitlist_ref(uuid) from public, anon, authenticated;
