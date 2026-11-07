-- Run this in the Supabase SQL editor (project linked to the game).
-- Required for /api/public/rtc multiplayer signaling.

create table if not exists public.webrtc_peers (
  room text not null,
  peer_id text not null,
  name text not null default '',
  last_seen timestamptz not null default now(),
  primary key (room, peer_id)
);

create index if not exists webrtc_peers_last_seen_idx
  on public.webrtc_peers (last_seen);

create table if not exists public.webrtc_signals (
  id bigint generated always as identity primary key,
  room text not null,
  from_peer text not null,
  to_peer text not null,
  kind text not null check (kind in ('offer', 'answer', 'ice')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists webrtc_signals_room_to_id_idx
  on public.webrtc_signals (room, to_peer, id);

create index if not exists webrtc_signals_created_at_idx
  on public.webrtc_signals (created_at);

-- Service role bypasses RLS; still enable RLS and deny anon/authenticated
-- so the tables are only reachable from the server route.
alter table public.webrtc_peers enable row level security;
alter table public.webrtc_signals enable row level security;

-- No policies for anon/authenticated → only service_role can read/write.
