-- Resenha Shenanigans: cloud movesets
-- Run once in the Supabase SQL Editor.
create table if not exists public.community_movesets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  author_name text not null default 'Jugador',
  moves jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_movesets_public_created_idx on public.community_movesets (is_public, created_at desc);
create index if not exists community_movesets_user_created_idx on public.community_movesets (user_id, created_at desc);
alter table public.community_movesets enable row level security;
drop policy if exists "Public movesets are readable" on public.community_movesets;
create policy "Public movesets are readable" on public.community_movesets for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "Users create their own movesets" on public.community_movesets;
create policy "Users create their own movesets" on public.community_movesets for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete their own movesets" on public.community_movesets;
create policy "Users delete their own movesets" on public.community_movesets for delete using (auth.uid() = user_id);
