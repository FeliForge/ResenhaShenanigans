CREATE TABLE public.webrtc_peers (
  room TEXT NOT NULL,
  peer_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room, peer_id)
);
CREATE TABLE public.webrtc_signals (
  id BIGSERIAL PRIMARY KEY,
  room TEXT NOT NULL,
  to_peer TEXT NOT NULL,
  from_peer TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX webrtc_signals_inbox ON public.webrtc_signals (room, to_peer, id);
GRANT ALL ON public.webrtc_peers TO service_role;
GRANT ALL ON public.webrtc_signals TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.webrtc_signals_id_seq TO service_role;
ALTER TABLE public.webrtc_peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;