-- Academia Octopus — tabla de lecciones (editable por el admin desde /admin/academia).
-- Pegar en el SQL Editor de Supabase.

create table if not exists public.academy_lessons (
  id text primary key default gen_random_uuid()::text,
  position int not null default 0,
  title text not null,
  subtitle text default '',
  video_url text,
  created_at timestamptz default now()
);

alter table public.academy_lessons enable row level security;

-- cualquiera puede LEER las lecciones (para mostrar la Academia)
drop policy if exists al_read on public.academy_lessons;
create policy al_read on public.academy_lessons for select using (true);

-- solo el admin (por email) puede crear/editar/borrar
drop policy if exists al_admin on public.academy_lessons;
create policy al_admin on public.academy_lessons for all
  using (auth.jwt() ->> 'email' = 'fmassuh133@gmail.com')
  with check (auth.jwt() ->> 'email' = 'fmassuh133@gmail.com');

-- semilla: las 15 lecciones (podés editarlas/borrarlas después desde el panel)
insert into public.academy_lessons (id, position, title, subtitle) values
  ('l1', 1,  'Bienvenido al océano',  'Cómo funciona Octopus y cómo se gana plata'),
  ('l2', 2,  'Calentá el algoritmo',  'Preparar tu cuenta antes de publicar'),
  ('l3', 3,  'Luces, cámara, acción', 'Creá y subí tu primer video paso a paso'),
  ('l4', 4,  'El perfil imán',        'Armá el perfil que las marcas eligen'),
  ('l5', 5,  'Postulá como pro',      'Destacá entre todos los que aplican'),
  ('l6', 6,  'La letra chica',        'Leé y entendé un contrato antes de aceptar'),
  ('l7', 7,  'Entregá y que aprueben','Contenido que las marcas aceptan al toque'),
  ('l8', 8,  'Tu plata, tu retiro',   'Cómo cobrar sin vueltas'),
  ('l9', 9,  'Frená el scroll',       'Ganchos que atrapan en 3 segundos'),
  ('l10',10, 'Guiones que venden',    'Escribí para que la gente actúe'),
  ('l11',11, 'El arte del UGC',       'Qué es y cómo lo piden las marcas'),
  ('l12',12, 'Clipping = plata',      'Ganá por views con el pay-per-view'),
  ('l13',13, 'Sin dar la cara',       'Contenido faceless que igual funciona'),
  ('l14',14, 'Subí de liga',          'Más XP, más visibilidad, más plata'),
  ('l15',15, 'Los errores que cuestan','Lo que NO tenés que hacer con las marcas')
on conflict (id) do nothing;

-- ===== Storage: bucket para los videos de la Academia =====
insert into storage.buckets (id, name, public)
values ('academy', 'academy', true)
on conflict (id) do nothing;

-- cualquiera puede VER los videos (bucket público)
drop policy if exists academy_read on storage.objects;
create policy academy_read on storage.objects for select
  using (bucket_id = 'academy');

-- solo el admin puede SUBIR / actualizar / borrar videos
drop policy if exists academy_admin_write on storage.objects;
create policy academy_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'academy' and auth.jwt() ->> 'email' = 'fmassuh133@gmail.com');

drop policy if exists academy_admin_update on storage.objects;
create policy academy_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'academy' and auth.jwt() ->> 'email' = 'fmassuh133@gmail.com');

drop policy if exists academy_admin_delete on storage.objects;
create policy academy_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'academy' and auth.jwt() ->> 'email' = 'fmassuh133@gmail.com');
