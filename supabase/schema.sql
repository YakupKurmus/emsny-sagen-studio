-- Emsny Sagen-Studio: Optionaler Cloud-Sync (Supabase EU - z. B. Frankfurt)
-- Dieses Schema einfach im Supabase SQL-Editor ausfuehren, sobald optionaler Cloud-Sync aktiviert wird.

create table if not exists public.user_drafts (
  user_id uuid not null references auth.users (id) on delete cascade,
  saga_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, saga_id)
);

create table if not exists public.user_custom_sagas (
  user_id uuid not null references auth.users (id) on delete cascade,
  saga_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, saga_id)
);

alter table public.user_drafts enable row level security;
alter table public.user_custom_sagas enable row level security;

-- Row-Level Security: Jeder angemeldete Nutzer darf ausschliesslich eigene Daten lesen & schreiben
create policy "Own drafts select"
  on public.user_drafts for select
  using (auth.uid() = user_id);

create policy "Own drafts insert"
  on public.user_drafts for insert
  with check (auth.uid() = user_id);

create policy "Own drafts update"
  on public.user_drafts for update
  using (auth.uid() = user_id);

create policy "Own drafts delete"
  on public.user_drafts for delete
  using (auth.uid() = user_id);

create policy "Own custom sagas select"
  on public.user_custom_sagas for select
  using (auth.uid() = user_id);

create policy "Own custom sagas insert"
  on public.user_custom_sagas for insert
  with check (auth.uid() = user_id);

create policy "Own custom sagas update"
  on public.user_custom_sagas for update
  using (auth.uid() = user_id);

create policy "Own custom sagas delete"
  on public.user_custom_sagas for delete
  using (auth.uid() = user_id);
