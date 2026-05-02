-- 006_security_hardening.sql
-- Endurecimiento de seguridad para Supabase.
--
-- NO toca auth.users ni modifica usuarios reales.
-- Refuerza RLS, validaciones, auditoria y operaciones criticas.

create or replace function public.has_active_role(user_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and activo = true
      and rol = any(allowed_roles)
  );
$$;

-- RLS sin politicas abiertas.
drop policy if exists "centros_select_authenticated" on public.centros;
create policy "centros_select_authenticated"
on public.centros
for select
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico', 'visor']));

drop policy if exists "centros_insert_tecnico_admin" on public.centros;
create policy "centros_insert_tecnico_admin"
on public.centros
for insert
to authenticated
with check (public.has_active_role(auth.uid(), array['admin', 'tecnico']));

drop policy if exists "partes_select_authenticated" on public.partes;
create policy "partes_select_authenticated"
on public.partes
for select
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico', 'visor']));

drop policy if exists "partes_insert_tecnico_admin" on public.partes;
create policy "partes_insert_tecnico_admin"
on public.partes
for insert
to authenticated
with check (public.has_active_role(auth.uid(), array['admin', 'tecnico']));

drop policy if exists "partes_update_tecnico_admin" on public.partes;
create policy "partes_update_tecnico_admin"
on public.partes
for update
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico']))
with check (public.has_active_role(auth.uid(), array['admin', 'tecnico']));

drop policy if exists "incidencias_select_authenticated" on public.incidencias;
create policy "incidencias_select_authenticated"
on public.incidencias
for select
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico', 'visor']));

drop policy if exists "incidencias_insert_tecnico_admin" on public.incidencias;
create policy "incidencias_insert_tecnico_admin"
on public.incidencias
for insert
to authenticated
with check (public.has_active_role(auth.uid(), array['admin', 'tecnico']));

drop policy if exists "incidencias_update_tecnico_admin" on public.incidencias;
create policy "incidencias_update_tecnico_admin"
on public.incidencias
for update
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico']))
with check (public.has_active_role(auth.uid(), array['admin', 'tecnico']));

drop policy if exists "app_config_select_authenticated" on public.app_config;
create policy "app_config_select_authenticated"
on public.app_config
for select
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico', 'visor']));

drop policy if exists "app_config_write_admin" on public.app_config;
create policy "app_config_write_admin"
on public.app_config
for all
to authenticated
using (public.has_active_role(auth.uid(), array['admin']))
with check (public.has_active_role(auth.uid(), array['admin']));

drop policy if exists "siec_history_select_authenticated_active" on public.siec_history;
drop policy if exists "siec_history_select_own" on public.siec_history;
drop policy if exists "siec_history_select_admin" on public.siec_history;
create policy "siec_history_select_authenticated_active"
on public.siec_history
for select
to authenticated
using (public.has_active_role(auth.uid(), array['admin', 'tecnico', 'visor']));

-- No permitimos escritura directa de historial desde el cliente.
-- El envio a SIEC debe pasar por public.gestionar_incidencias_siec().
drop policy if exists "siec_history_insert_own" on public.siec_history;

-- Validaciones de datos. NOT VALID evita romper datos antiguos; aplica a nuevos cambios.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partes_estado_operativo_check') then
    alter table public.partes add constraint partes_estado_operativo_check
    check (estado in (
      'revisado',
      'pendiente_siec',
      'preparado_siec',
      'enviado_a_siguiente_paso',
      'enviado_siec',
      'gestionado',
      'eliminado'
    )) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partes_titulo_length_check') then
    alter table public.partes add constraint partes_titulo_length_check
    check (titulo is null or char_length(titulo) <= 160) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partes_centro_nombre_length_check') then
    alter table public.partes add constraint partes_centro_nombre_length_check
    check (centro_nombre is null or char_length(centro_nombre) <= 160) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'incidencias_estado_operativo_check') then
    alter table public.incidencias add constraint incidencias_estado_operativo_check
    check (estado in (
      'revisado',
      'pendiente_siec',
      'gestionado',
      'descartado',
      'error'
    )) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'incidencias_descripcion_length_check') then
    alter table public.incidencias add constraint incidencias_descripcion_length_check
    check (char_length(descripcion) <= 2000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'centros_nombre_length_check') then
    alter table public.centros add constraint centros_nombre_length_check
    check (char_length(nombre) between 1 and 160) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'app_config_nombre_empresa_length_check') then
    alter table public.app_config add constraint app_config_nombre_empresa_length_check
    check (char_length(nombre_empresa) <= 160) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'app_config_email_responsable_length_check') then
    alter table public.app_config add constraint app_config_email_responsable_length_check
    check (email_responsable is null or char_length(email_responsable) <= 254) not valid;
  end if;
end $$;

-- Auditoria enriquecida.
alter table public.audit_log
  add column if not exists usuario_email text,
  add column if not exists usuario_rol text,
  add column if not exists resultado text not null default 'exito';

create or replace function public.audit_operational_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
  entity_id text;
begin
  select *
  into actor
  from public.profiles
  where id = auth.uid();

  if TG_OP = 'DELETE' then
    entity_id := old.id::text;
  else
    entity_id := new.id::text;
  end if;

  insert into public.audit_log (
    user_id,
    usuario_email,
    usuario_rol,
    accion,
    entidad,
    entidad_id,
    resultado,
    payload
  )
  values (
    auth.uid(),
    actor.email,
    actor.rol,
    lower(TG_OP),
    TG_TABLE_NAME,
    entity_id,
    'exito',
    jsonb_build_object(
      'old', case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      'new', case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    )
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists audit_partes_changes on public.partes;
create trigger audit_partes_changes
after insert or update or delete on public.partes
for each row execute function public.audit_operational_change();

drop trigger if exists audit_incidencias_changes on public.incidencias;
create trigger audit_incidencias_changes
after insert or update or delete on public.incidencias
for each row execute function public.audit_operational_change();

-- RPC critica: gestiona incidencias a SIEC en una transaccion controlada.
create or replace function public.gestionar_incidencias_siec(incidencia_ids uuid[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  lote text := 'lote-' || gen_random_uuid()::text;
  actor public.profiles%rowtype;
  total_solicitadas int := coalesce(array_length(incidencia_ids, 1), 0);
  total_pendientes int;
begin
  if not public.has_active_role(auth.uid(), array['admin', 'tecnico']) then
    raise exception 'No tienes permiso para gestionar incidencias SIEC';
  end if;

  if total_solicitadas = 0 then
    raise exception 'No se han seleccionado incidencias';
  end if;

  select *
  into actor
  from public.profiles
  where id = auth.uid()
    and activo = true;

  select count(*)
  into total_pendientes
  from public.incidencias
  where id = any(incidencia_ids)
    and estado = 'pendiente_siec';

  if total_pendientes <> total_solicitadas then
    raise exception 'Todas las incidencias deben existir y estar pendientes de SIEC';
  end if;

  insert into public.siec_history (
    lote_id,
    parte_id,
    parte_titulo,
    centro,
    fecha,
    descripcion,
    estado,
    origen,
    accion,
    usuario_id,
    usuario_nombre,
    usuario_email,
    usuario_rol,
    enviado_en
  )
  select
    lote,
    i.parte_id::text,
    coalesce(p.titulo, 'Parte ' || coalesce(p.centro_nombre, c.nombre, 'Centro sin indicar') || ' - ' || p.fecha_visita::text),
    coalesce(p.centro_nombre, c.nombre, 'Centro sin indicar'),
    p.fecha_visita::text,
    coalesce(i.texto_corregido, i.descripcion, i.texto_ocr),
    'gestionado',
    coalesce(p.origen, 'parte_trabajo_ocr'),
    'gestionado_siec',
    auth.uid(),
    coalesce(actor.nombre, actor.email),
    actor.email,
    actor.rol,
    now()
  from public.incidencias i
  join public.partes p on p.id = i.parte_id
  left join public.centros c on c.id = p.centro_id
  where i.id = any(incidencia_ids)
    and i.estado = 'pendiente_siec';

  update public.incidencias
  set estado = 'gestionado'
  where id = any(incidencia_ids)
    and estado = 'pendiente_siec';

  update public.partes p
  set estado = 'gestionado'
  where p.id in (
    select distinct parte_id
    from public.incidencias
    where id = any(incidencia_ids)
  )
  and not exists (
    select 1
    from public.incidencias i
    where i.parte_id = p.id
      and i.estado = 'pendiente_siec'
  );

  insert into public.audit_log (
    user_id,
    usuario_email,
    usuario_rol,
    accion,
    entidad,
    entidad_id,
    resultado,
    payload
  )
  values (
    auth.uid(),
    actor.email,
    actor.rol,
    'gestionado_siec',
    'incidencias',
    lote,
    'exito',
    jsonb_build_object('loteId', lote, 'incidenciaIds', incidencia_ids)
  );

  return lote;
end;
$$;

revoke all on function public.gestionar_incidencias_siec(uuid[]) from public;
grant execute on function public.gestionar_incidencias_siec(uuid[]) to authenticated;

-- Storage: bucket privado preparado para fotos/documentos operativos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partes-operativos',
  'partes-operativos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists "partes_operativos_select_authenticated" on storage.objects;
create policy "partes_operativos_select_authenticated"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'partes-operativos'
  and public.has_active_role(auth.uid(), array['admin', 'tecnico', 'visor'])
);

drop policy if exists "partes_operativos_insert_tecnico_admin" on storage.objects;
create policy "partes_operativos_insert_tecnico_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'partes-operativos'
  and public.has_active_role(auth.uid(), array['admin', 'tecnico'])
);

drop policy if exists "partes_operativos_update_admin" on storage.objects;
create policy "partes_operativos_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'partes-operativos'
  and public.has_active_role(auth.uid(), array['admin'])
)
with check (
  bucket_id = 'partes-operativos'
  and public.has_active_role(auth.uid(), array['admin'])
);
