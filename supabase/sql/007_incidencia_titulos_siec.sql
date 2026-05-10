-- 007_incidencia_titulos_siec.sql
-- Añade título técnico breve por incidencia sin sustituir el texto original.

alter table public.incidencias
  add column if not exists titulo text;

alter table public.siec_history
  add column if not exists titulo text;

update public.incidencias
set titulo = left(regexp_replace(coalesce(texto_corregido, descripcion, texto_ocr, ''), '\s+', ' ', 'g'), 120)
where titulo is null
  and coalesce(texto_corregido, descripcion, texto_ocr, '') <> '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'incidencias_titulo_length_check') then
    alter table public.incidencias add constraint incidencias_titulo_length_check
    check (titulo is null or char_length(titulo) <= 160) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'siec_history_titulo_length_check') then
    alter table public.siec_history add constraint siec_history_titulo_length_check
    check (titulo is null or char_length(titulo) <= 160) not valid;
  end if;
end $$;

create or replace function public.gestionar_incidencias_siec(incidencia_ids uuid[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  lote text := 'lote-' || gen_random_uuid()::text;
  actor public.profiles%rowtype;
  total_solicitadas integer := coalesce(array_length(incidencia_ids, 1), 0);
  total_pendientes integer;
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
    titulo,
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
    coalesce(i.titulo, left(regexp_replace(coalesce(i.texto_corregido, i.descripcion, i.texto_ocr, ''), '\s+', ' ', 'g'), 120)),
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
