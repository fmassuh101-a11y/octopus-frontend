-- ============================================================
-- CHAT EMPRESA↔CREADOR (jul 2026) — pegar en el editor SQL de Supabase
-- Registro de las conversaciones de Whop (support channels): los MENSAJES
-- viven en Whop; acá solo guardamos qué canal une a qué par de usuarios,
-- para armar la lista lateral con nuestros datos (nombre/foto).
-- Idempotente.
-- ============================================================

create table if not exists public.chat_channels (
  channel_id text primary key,
  host_company text not null,        -- compañía Whop del creador (dueña del canal)
  creator_user uuid not null,        -- user_id (Octopus) del creador
  company_user uuid not null,        -- user_id (Octopus) de la empresa
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists chat_channels_creator on public.chat_channels (creator_user);
create index if not exists chat_channels_company on public.chat_channels (company_user);

-- RLS: cada uno ve SOLO sus conversaciones
alter table public.chat_channels enable row level security;
drop policy if exists chat_channels_select on public.chat_channels;
create policy chat_channels_select on public.chat_channels
  for select using (auth.uid() = creator_user or auth.uid() = company_user);
-- escritura solo desde el server (service key)
