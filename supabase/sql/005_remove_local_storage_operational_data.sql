-- 005_remove_local_storage_operational_data.sql
-- Migracion para que los datos operativos vivan exclusivamente en Supabase.
--
-- NO toca:
-- - auth.users
-- - public.profiles
-- - roles, emails ni estados de usuarios

-- Campos que antes vivian en objetos locales de "partes_guardados".
alter table public.partes
  add column if not exists titulo text,
  add column if not exists centro_nombre text,
  add column if not exists origen text not null default 'OCR/Gemini',
  add column if not exists creado_en timestamptz not null default now(),
  add column if not exists enviado_en timestamptz,
  add column if not exists eliminado_en timestamptz;

create index if not exists partes_creado_en_idx on public.partes (creado_en desc);
create index if not exists partes_eliminado_en_idx on public.partes (eliminado_en);
create index if not exists incidencias_estado_idx on public.incidencias (estado);

-- Configuracion general de la aplicacion en base de datos.
create table if not exists public.app_config (
  id text primary key default 'global',
  nombre_empresa text not null default '',
  entorno text not null default 'pruebas' check (entorno in ('pruebas', 'produccion')),
  modo_siec text not null default 'simulado' check (modo_siec in ('simulado', 'manual', 'api_futura')),
  email_responsable text,
  actualizado_en timestamptz not null default now()
);

insert into public.app_config (id)
values ('global')
on conflict (id) do nothing;

alter table public.centros enable row level security;
alter table public.partes enable row level security;
alter table public.incidencias enable row level security;
alter table public.app_config enable row level security;

drop policy if exists "centros_select_authenticated" on public.centros;
create policy "centros_select_authenticated"
on public.centros
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
  )
);

drop policy if exists "centros_insert_tecnico_admin" on public.centros;
create policy "centros_insert_tecnico_admin"
on public.centros
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
);

drop policy if exists "partes_select_authenticated" on public.partes;
create policy "partes_select_authenticated"
on public.partes
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
  )
);

drop policy if exists "partes_insert_tecnico_admin" on public.partes;
create policy "partes_insert_tecnico_admin"
on public.partes
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
);

drop policy if exists "partes_update_tecnico_admin" on public.partes;
create policy "partes_update_tecnico_admin"
on public.partes
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
)
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
);

drop policy if exists "incidencias_select_authenticated" on public.incidencias;
create policy "incidencias_select_authenticated"
on public.incidencias
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
  )
);

drop policy if exists "incidencias_insert_tecnico_admin" on public.incidencias;
create policy "incidencias_insert_tecnico_admin"
on public.incidencias
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
);

drop policy if exists "incidencias_update_tecnico_admin" on public.incidencias;
create policy "incidencias_update_tecnico_admin"
on public.incidencias
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
)
with check (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
      and rol = 'tecnico'
  )
);

drop policy if exists "app_config_select_authenticated" on public.app_config;
create policy "app_config_select_authenticated"
on public.app_config
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
  )
);

drop policy if exists "app_config_write_admin" on public.app_config;
create policy "app_config_write_admin"
on public.app_config
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Historial SIEC: cualquier usuario activo autenticado puede verlo.
-- La escritura sigue restringida por las politicas de 003 a registros propios.
drop policy if exists "siec_history_select_authenticated_active" on public.siec_history;
create policy "siec_history_select_authenticated_active"
on public.siec_history
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and activo = true
  )
);

-- RPC segura para el boton de mantenimiento. Solo admin puede ejecutarla.
create or replace function public.reset_operational_testing_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo un administrador puede limpiar datos de prueba';
  end if;

  truncate table
    public.incidencias,
    public.partes,
    public.automatizaciones,
    public.siec_history,
    public.audit_log
  restart identity cascade;
end;
$$;

revoke all on function public.reset_operational_testing_data() from public;
grant execute on function public.reset_operational_testing_data() to authenticated;
