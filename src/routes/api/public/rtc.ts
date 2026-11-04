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
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since } = parsed.data;
  const sb = await db();

  if (since === 0 || Math.random() < 0.02) {
    await Promise.all([
      sb.from("webrtc_signals").delete().lt("created_at", ago(SIGNAL_TTL)),
      sb.from("webrtc_peers").delete().lt("last_seen", ago(PEER_TTL)),
    ]);
  }
  const up = await sb
    .from("webrtc_peers")
    .upsert({ room, peer_id: peer, name, last_seen: new Date().toISOString() });
  if (up.error) throw up.error;

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
  if (sig.error) throw sig.error;
  if (peers.error) throw peers.error;
  return json({
    peers: peers.data.map((r) => ({ id: r.peer_id, name: r.name })),
    signals: sig.data.map((r) => ({
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
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  const sb = await db();
  if (msg.op === "signal") {
    const { error } = await sb.from("webrtc_signals").insert({
      room: msg.room,
      to_peer: msg.to,
      from_peer: msg.from,
      kind: msg.kind,
      payload: msg.payload as never,
    });
    if (error) throw error;
  } else {
    await sb.from("webrtc_peers").delete().eq("room", msg.room).eq("peer_id", msg.peer);
  }
  return json({ ok: true });
}

async function handle({ request }: { request: Request }) {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    return await handlePost(request);
  } catch (error) {
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}

export const Route = createFileRoute("/api/public/rtc")({
  server: { handlers: { GET: handle, POST: handle } },
});
