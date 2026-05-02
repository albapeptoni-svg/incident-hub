create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  accion text not null,
  entidad text,
  entidad_id text,
  payload jsonb,
  creado_en timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_own" on public.audit_log;
create policy "audit_log_select_own"
on public.audit_log
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "audit_log_select_admin" on public.audit_log;
create policy "audit_log_select_admin"
on public.audit_log
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "audit_log_insert_own" on public.audit_log;
create policy "audit_log_insert_own"
on public.audit_log
for insert
to authenticated
with check (user_id = auth.uid());
