import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public WebRTC signaling relay (roster + SDP/ICE) for multiplayer rooms.
// No private data: rows are ephemeral rendezvous messages pruned after seconds.
const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z
    .unknown()
    .refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, {
      message: "payload too large",
    }),
});
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

const PEER_TTL = 30_000;
const SIGNAL_TTL = 60_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function errMessage(error: unknown): string {
  if (!error) return "unknown";
  if (typeof error === "string") return error;
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(" | ") || String(error);
}

async function handleGet(url: URL) {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
    });
  if (!parsed.success) return json({ error: "invalid query", detail: parsed.error.message }, 400);
  const { room, peer, name, since } = parsed.data;

  let sb;
  try {
    sb = await db();
  } catch (error) {
    console.error("[rtc] supabase admin init failed:", errMessage(error));
    return json(
      {
        error: "supabase_not_configured",
        detail:
          "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY on the server. Set them in Vercel → Environment Variables.",
      },
      503
    );
  }

  // Best-effort prune; never fail the request if cleanup errors.
  if (since === 0 || Math.random() < 0.05) {
    try {
      await Promise.all([
        sb.from("webrtc_signals").delete().lt("created_at", ago(SIGNAL_TTL)),
        sb.from("webrtc_peers").delete().lt("last_seen", ago(PEER_TTL)),
      ]);
    } catch (error) {
      console.warn("[rtc] prune warning:", errMessage(error));
    }
  }

  // Upsert peer presence. Prefer composite conflict target; fall back to plain upsert.
  const nowIso = new Date().toISOString();
  let up = await sb.from("webrtc_peers").upsert(
    { room, peer_id: peer, name, last_seen: nowIso },
    { onConflict: "room,peer_id" }
  );
  if (up.error) {
    // Fallback without onConflict (older schemas / missing unique index)
    up = await sb.from("webrtc_peers").upsert({ room, peer_id: peer, name, last_seen: nowIso });
  }
  if (up.error) {
    console.error("[rtc] peer upsert failed:", errMessage(up.error));
    return json(
      {
        error: "peer_upsert_failed",
        detail: errMessage(up.error),
        hint: "Ensure table public.webrtc_peers exists with unique (room, peer_id).",
      },
      500
    );
  }

  const [sig, peers] = await Promise.all([
    sb
      .from("webrtc_signals")
      .select("id, from_peer, kind, payload")
      .eq("room", room)
      .eq("to_peer", peer)
      .gt("id", since)
      .order("id")
      .limit(200),
    sb
      .from("webrtc_peers")
      .select("peer_id, name")
      .eq("room", room)
      .gt("last_seen", ago(PEER_TTL))
      .order("peer_id")
      .limit(32),
  ]);

  if (sig.error) {
    console.error("[rtc] signals select failed:", errMessage(sig.error));
    return json(
      {
        error: "signals_query_failed",
        detail: errMessage(sig.error),
        hint: "Ensure table public.webrtc_signals exists.",
      },
      500
    );
  }
  if (peers.error) {
    console.error("[rtc] peers select failed:", errMessage(peers.error));
    return json(
      {
        error: "peers_query_failed",
        detail: errMessage(peers.error),
        hint: "Ensure table public.webrtc_peers exists.",
      },
      500
    );
  }

  return json({
    peers: (peers.data || []).map((r) => ({ id: r.peer_id, name: r.name })),
    signals: (sig.data || []).map((r) => ({
      id: Number(r.id),
      from: r.from_peer,
      kind: r.kind,
      payload: r.payload,
    })),
  });
}

async function handlePost(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request", detail: parsed.error.message }, 400);
  const msg = parsed.data;

  let sb;
  try {
    sb = await db();
  } catch (error) {
    console.error("[rtc] supabase admin init failed:", errMessage(error));
    return json(
      {
        error: "supabase_not_configured",
        detail:
          "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY on the server. Set them in Vercel → Environment Variables.",
      },
      503
    );
  }

  if (msg.op === "signal") {
    const { error } = await sb.from("webrtc_signals").insert({
      room: msg.room,
      to_peer: msg.to,
      from_peer: msg.from,
      kind: msg.kind,
      payload: msg.payload as never,
    });
    if (error) {
      console.error("[rtc] signal insert failed:", errMessage(error));
      return json({ error: "signal_insert_failed", detail: errMessage(error) }, 500);
    }
  } else {
    const { error } = await sb
      .from("webrtc_peers")
      .delete()
      .eq("room", msg.room)
      .eq("peer_id", msg.peer);
    if (error) {
      console.warn("[rtc] leave delete warning:", errMessage(error));
    }
  }
  return json({ ok: true });
}

async function handle({ request }: { request: Request }) {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method_not_allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error:", errMessage(error));
    return json({ error: "signaling failed", detail: errMessage(error) }, 500);
  }
}

export const Route = createFileRoute("/api/public/rtc")({
  server: { handlers: { GET: handle, POST: handle } },
});
