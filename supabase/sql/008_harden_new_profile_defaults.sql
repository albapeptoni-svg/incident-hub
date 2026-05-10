-- 008_harden_new_profile_defaults.sql
-- Fase 3: endurece solo los perfiles nuevos.
--
-- No modifica usuarios ni profiles existentes.
-- En Supabase hosted hay que desactivar el signup publico manualmente en:
-- Authentication > Sign In / Providers > Email > Disable sign ups.

alter table public.profiles
  alter column rol set default 'visor',
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
    'visor',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
