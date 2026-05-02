create table if not exists public.siec_history (
  id uuid primary key default gen_random_uuid(),
  lote_id text,
  parte_id text,
  parte_titulo text,
  centro text,
  fecha text,
  descripcion text not null,
  estado text not null default 'gestionado',
  origen text,
  accion text not null default 'gestionado_siec',
  usuario_id uuid references auth.users(id),
  usuario_nombre text,
  usuario_email text,
  usuario_rol text,
  enviado_en timestamptz not null default now()
);

alter table public.siec_history enable row level security;

drop policy if exists "siec_history_select_own" on public.siec_history;
create policy "siec_history_select_own"
on public.siec_history
for select
to authenticated
using (usuario_id = auth.uid());

drop policy if exists "siec_history_select_admin" on public.siec_history;
create policy "siec_history_select_admin"
on public.siec_history
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "siec_history_insert_own" on public.siec_history;
create policy "siec_history_insert_own"
on public.siec_history
for insert
to authenticated
with check (usuario_id = auth.uid());

create index if not exists siec_history_lote_id_idx on public.siec_history (lote_id);
create index if not exists siec_history_enviado_en_idx on public.siec_history (enviado_en desc);
