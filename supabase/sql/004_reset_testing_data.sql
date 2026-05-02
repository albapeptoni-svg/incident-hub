-- 004_reset_testing_data.sql
-- Limpieza segura de datos operativos/de prueba.
--
-- CONSERVA SIEMPRE:
-- - auth.users
-- - public.profiles
-- - roles, emails y estado activo/inactivo de usuarios
-- - public.centros, tratado como catalogo/base de la aplicacion
--
-- LIMPIA SOLO TABLAS OPERATIVAS DECLARADAS EN EL PROYECTO:
-- - public.incidencias
-- - public.partes
-- - public.automatizaciones
-- - public.siec_history, si existe
-- - public.audit_log, si existe
-- - public.fotos, si existe (referenciada por el servicio de datos)
--
-- Nota: el bloque comprueba que cada tabla exista antes de truncarla para que
-- pueda ejecutarse aunque aun no se hayan aplicado todos los SQL opcionales.

create temp table if not exists reset_testing_data_counts (
  tabla text primary key,
  registros bigint
);

truncate table reset_testing_data_counts;

do $$
declare
  tablas_a_limpiar text[] := array[
    'public.incidencias',
    'public.partes',
    'public.automatizaciones',
    'public.siec_history',
    'public.audit_log',
    'public.fotos'
  ];
  tablas_existentes text[];
  tabla text;
  total bigint;
begin
  select array_agg(nombre_tabla)
  into tablas_existentes
  from unnest(tablas_a_limpiar) as t(nombre_tabla)
  where to_regclass(nombre_tabla) is not null;

  if tablas_existentes is not null then
    execute 'truncate table '
      || array_to_string(tablas_existentes, ', ')
      || ' restart identity cascade';
  end if;

  foreach tabla in array tablas_a_limpiar loop
    if to_regclass(tabla) is not null then
      execute format('select count(*) from %s', tabla) into total;
      insert into reset_testing_data_counts (tabla, registros)
      values (tabla, total);
    else
      insert into reset_testing_data_counts (tabla, registros)
      values (tabla || ' (no existe en este entorno)', null);
    end if;
  end loop;
end $$;

-- Comprobacion: las tablas limpiadas deben quedar a 0.
select tabla, registros
from reset_testing_data_counts
order by tabla;

-- Comprobacion adicional: tablas criticas conservadas.
select 'auth.users (conservada)' as tabla, count(*) as registros
from auth.users
union all
select 'public.profiles (conservada)' as tabla, count(*) as registros
from public.profiles
union all
select 'public.centros (conservada como catalogo/base)' as tabla, count(*) as registros
from public.centros;
