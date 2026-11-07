create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$')
);
create unique index if not exists profiles_username_unique_ci on public.profiles (lower(username));
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username) on public.profiles to authenticated;
create or replace function private.handle_new_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, username) values (new.id, 'player_' || substr(new.id::text, 1, 8)) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function private.handle_new_user_profile();
insert into public.profiles (user_id, username) select u.id, 'player_' || substr(u.id::text, 1, 8) from auth.users u on conflict (user_id) do nothing;
