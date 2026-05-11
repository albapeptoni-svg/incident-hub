-- 009_two_role_defaults.sql
-- Ajuste conservador a dos roles operativos reales: admin y tecnico.
--
-- No modifica perfiles existentes ni cambia politicas RLS.
-- Los usuarios nuevos quedan inactivos y con rol tecnico hasta activacion manual por admin.

alter table public.profiles
  alter column rol set default 'tecnico',
  alter column activo set default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, rol, activo)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data->>'nombre', ''),
    'tecnico',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
