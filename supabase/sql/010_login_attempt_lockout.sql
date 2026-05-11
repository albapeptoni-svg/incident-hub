-- 010_login_attempt_lockout.sql
-- Bloqueo defensivo por intentos fallidos de login.
--
-- Conservador: no modifica usuarios existentes ni cambia RLS operativa.

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text,
  user_id uuid references auth.users(id) on delete set null,
  success boolean not null default false,
  reason text,
  ip text,
  user_agent text
);

create table if not exists public.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  hard_locked boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists login_attempts_created_at_idx
on public.login_attempts (created_at desc);

create index if not exists login_attempts_email_created_at_idx
on public.login_attempts (email, created_at desc);

alter table public.login_attempts enable row level security;
alter table public.account_security enable row level security;

drop policy if exists "login_attempts_select_admin" on public.login_attempts;
create policy "login_attempts_select_admin"
on public.login_attempts
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "account_security_select_admin" on public.account_security;
create policy "account_security_select_admin"
on public.account_security
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "account_security_update_admin" on public.account_security;
create policy "account_security_update_admin"
on public.account_security
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.normalized_login_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(lower(trim(coalesce(p_email, ''))), '');
$$;

create or replace function public.login_request_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  headers jsonb;
  forwarded text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;

  forwarded := coalesce(headers->>'x-forwarded-for', headers->>'cf-connecting-ip', headers->>'x-real-ip');
  if forwarded is null or btrim(forwarded) = '' then
    return null;
  end if;

  return left(split_part(forwarded, ',', 1), 128);
end;
$$;

create or replace function public.login_request_user_agent()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  headers jsonb;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;

  return left(nullif(headers->>'user-agent', ''), 512);
end;
$$;

create or replace function public.find_login_user_id(p_email text)
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select coalesce(
    (
      select p.id
      from public.profiles p
      where lower(trim(p.email)) = public.normalized_login_email(p_email)
      limit 1
    ),
    (
      select u.id
      from auth.users u
      where lower(trim(u.email)) = public.normalized_login_email(p_email)
      limit 1
    )
  );
$$;

create or replace function public.get_login_lock_status(p_email text)
returns table (
  locked boolean,
  hard_locked boolean,
  locked_until timestamptz
)
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  normalized_email text := public.normalized_login_email(p_email);
  target_user_id uuid;
  security_row public.account_security%rowtype;
begin
  if normalized_email is null then
    return query select false, false, null::timestamptz;
    return;
  end if;

  target_user_id := public.find_login_user_id(normalized_email);

  if target_user_id is null then
    return query select false, false, null::timestamptz;
    return;
  end if;

  select *
  into security_row
  from public.account_security
  where user_id = target_user_id;

  if not found then
    return query select false, false, null::timestamptz;
    return;
  end if;

  return query
  select
    (security_row.hard_locked or (security_row.locked_until is not null and security_row.locked_until > now())) as locked,
    security_row.hard_locked,
    security_row.locked_until;
end;
$$;

create or replace function public.register_login_failure(
  p_email text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := public.normalized_login_email(p_email);
  target_user_id uuid;
  target_role text;
  attempts integer;
  next_locked_until timestamptz;
  next_hard_locked boolean;
begin
  if normalized_email is null then
    insert into public.login_attempts (email, success, reason, ip, user_agent)
    values (null, false, left(coalesce(p_reason, 'invalid_email'), 120), public.login_request_ip(), public.login_request_user_agent());
    return;
  end if;

  target_user_id := public.find_login_user_id(normalized_email);

  insert into public.login_attempts (email, user_id, success, reason, ip, user_agent)
  values (
    normalized_email,
    target_user_id,
    false,
    left(coalesce(p_reason, 'login_failed'), 120),
    public.login_request_ip(),
    public.login_request_user_agent()
  );

  if target_user_id is null then
    return;
  end if;

  select rol
  into target_role
  from public.profiles
  where id = target_user_id
  limit 1;

  insert into public.account_security (user_id, failed_attempts, updated_at)
  values (target_user_id, 0, now())
  on conflict (user_id) do nothing;

  update public.account_security
  set
    failed_attempts = failed_attempts + 1,
    updated_at = now()
  where user_id = target_user_id
  returning failed_attempts into attempts;

  next_hard_locked := coalesce(target_role, '') <> 'admin' and attempts >= 15;
  next_locked_until := case
    when attempts >= 15 and coalesce(target_role, '') = 'admin' then now() + interval '1 hour'
    when attempts >= 15 then null
    when attempts >= 10 then now() + interval '1 hour'
    when attempts >= 5 then now() + interval '15 minutes'
    else null
  end;

  update public.account_security
  set
    hard_locked = next_hard_locked,
    locked_until = next_locked_until,
    updated_at = now()
  where user_id = target_user_id;
end;
$$;

create or replace function public.register_login_success(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
begin
  if p_user_id is null then
    return;
  end if;

  select lower(trim(coalesce(p.email, u.email)))
  into target_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id
  limit 1;

  insert into public.account_security (user_id, failed_attempts, locked_until, hard_locked, updated_at)
  values (p_user_id, 0, null, false, now())
  on conflict (user_id) do update
  set
    failed_attempts = 0,
    locked_until = null,
    hard_locked = false,
    updated_at = now();

  insert into public.login_attempts (email, user_id, success, reason, ip, user_agent)
  values (target_email, p_user_id, true, 'login_success', public.login_request_ip(), public.login_request_user_agent());
end;
$$;

create or replace function public.admin_unlock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  insert into public.account_security (user_id, failed_attempts, locked_until, hard_locked, updated_at)
  values (p_user_id, 0, null, false, now())
  on conflict (user_id) do update
  set
    failed_attempts = 0,
    locked_until = null,
    hard_locked = false,
    updated_at = now();
end;
$$;

revoke all on function public.normalized_login_email(text) from public;
revoke all on function public.login_request_ip() from public;
revoke all on function public.login_request_user_agent() from public;
revoke all on function public.find_login_user_id(text) from public;
revoke all on function public.get_login_lock_status(text) from public;
revoke all on function public.register_login_failure(text, text) from public;
revoke all on function public.register_login_success(uuid) from public;
revoke all on function public.admin_unlock_user(uuid) from public;

grant execute on function public.get_login_lock_status(text) to anon, authenticated;
grant execute on function public.register_login_failure(text, text) to anon, authenticated;
grant execute on function public.register_login_success(uuid) to authenticated;
grant execute on function public.admin_unlock_user(uuid) to authenticated;
