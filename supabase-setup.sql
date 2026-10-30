-- EDGIM: tablas y reglas de seguridad para las cuentas.
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.

-- 1. Datos de cada usuario (entrenos, rutina, dieta, cardio…) en un solo documento JSON
create table if not exists public.edgim_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.edgim_data enable row level security;

-- Acceso por la API solo para usuarios con sesión iniciada (necesario si
-- "Automatically expose new tables" está apagado); las reglas de abajo limitan cada fila a su dueño
revoke all on public.edgim_data from anon;
grant select, insert, update, delete on public.edgim_data to authenticated;

-- Cada persona solo puede leer y modificar su propia fila
drop policy if exists "edgim leer propios" on public.edgim_data;
drop policy if exists "edgim crear propios" on public.edgim_data;
drop policy if exists "edgim editar propios" on public.edgim_data;
drop policy if exists "edgim borrar propios" on public.edgim_data;
create policy "edgim leer propios" on public.edgim_data for select to authenticated using (auth.uid() = user_id);
create policy "edgim crear propios" on public.edgim_data for insert to authenticated with check (auth.uid() = user_id);
create policy "edgim editar propios" on public.edgim_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "edgim borrar propios" on public.edgim_data for delete to authenticated using (auth.uid() = user_id);

-- 2. Fotos y documentos: bucket privado, cada usuario en su carpeta <user_id>/
insert into storage.buckets (id, name, public)
values ('edgim', 'edgim', false)
on conflict (id) do nothing;

drop policy if exists "edgim fotos leer" on storage.objects;
drop policy if exists "edgim fotos subir" on storage.objects;
drop policy if exists "edgim fotos editar" on storage.objects;
drop policy if exists "edgim fotos borrar" on storage.objects;
create policy "edgim fotos leer" on storage.objects for select to authenticated
  using (bucket_id = 'edgim' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "edgim fotos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'edgim' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "edgim fotos editar" on storage.objects for update to authenticated
  using (bucket_id = 'edgim' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "edgim fotos borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'edgim' and (storage.foldername(name))[1] = auth.uid()::text);
