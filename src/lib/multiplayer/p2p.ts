// @ts-nocheck
/**
 * Full-mesh WebRTC rooms signaled via Supabase Realtime (broadcast + presence).
 * No custom DB tables and no service-role API — only VITE_SUPABASE_* client keys.
 */

export type SignalKind = "offer" | "answer" | "ice";

export interface PeerRow {
  id: string;
  name: string;
}
export interface SignalRow {
  id: number;
  from: string;
  kind: SignalKind;
  payload: unknown;
}
export interface RtcPollResponse {
  peers: PeerRow[];
  signals: SignalRow[];
}

export interface PeerInfo {
  id: string;
  name: string;
  connectionState: RTCPeerConnectionState;
  candidateType: string | null;
  rttMs: number | null;
}

export interface P2PRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  iceServers?: RTCIceServer[];
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
}

interface PeerSlot {
  pc: RTCPeerConnection;
  state?: RTCDataChannel;
  reliable?: RTCDataChannel;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  lastProgressAt: number;
  recoveryAttempts: number;
  terminal?: boolean;
  recreatedForOffer?: boolean;
  info: PeerInfo;
  pingSentAt?: number;
}

const PING_INTERVAL_MS = 2000;
const STALL_MS = 12_000;
const MAX_RECOVERY_ATTEMPTS = 3;

export function defaultIceServers(): RTCIceServer[] {
  const urls = (import.meta.env["VITE_STUN_URLS"] as string | undefined)
    ?.split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  return [
    {
      urls: urls?.length
        ? urls
        : ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"],
    },
  ];
}

export class P2PRoom {
  private readonly opts: P2PRoomOptions;
  private readonly peers = new Map<string, PeerSlot>();
  private channel: any = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private joined = false;

  constructor(opts: P2PRoomOptions) {
    this.opts = opts;
  }

  async join(): Promise<void> {
    if (this.closed || this.joined) return;
    this.joined = true;

    const { supabase } = await import("@/integrations/supabase/client");
    const topic = `arena:${this.opts.room}`;

    this.channel = supabase.channel(topic, {
      config: {
        presence: { key: this.opts.selfId },
        broadcast: { self: false },
      },
    });

    this.channel
      .on("presence", { event: "sync" }, () => {
        if (this.closed) return;
        const state = this.channel.presenceState() as Record<
          string,
          Array<{ name?: string }>
        >;
        const roster: { id: string; name: string }[] = [];
        for (const id of Object.keys(state)) {
          if (id === this.opts.selfId) continue;
          const meta = state[id]?.[0];
          roster.push({ id, name: meta?.name || "luchador" });
        }
        this.reconcileRoster(roster);
      })
      .on("broadcast", { event: "signal" }, ({ payload }: any) => {
        if (this.closed || !payload) return;
        // Only handle signals addressed to us
        if (payload.to && payload.to !== this.opts.selfId) return;
        if (payload.from === this.opts.selfId) return;
        void this.onSignal(payload.from, payload.kind, payload.payload);
      });

    const status = await this.channel.subscribe(async (s: string) => {
      if (s === "SUBSCRIBED") {
        await this.channel.track({
          name: this.opts.name || "luchador",
          joinedAt: Date.now(),
        });
        this.opts.onConnected?.();
      }
    });

    // subscribe() resolves when attached in supabase-js v2
    void status;

    this.pingTimer = setInterval(() => {
      this.pingAll();
      this.watchdog();
    }, PING_INTERVAL_MS);
  }

  close(): void {
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    for (const slot of this.peers.values()) slot.pc.close();
    this.peers.clear();
    if (this.channel) {
      try {
        void this.channel.untrack();
        void this.channel.unsubscribe();
      } catch {}
      this.channel = null;
    }
  }

  broadcast(data: unknown): void {
    const wire = JSON.stringify({ t: "d", d: data });
    for (const slot of this.peers.values()) {
      if (slot.state?.readyState === "open") {
        try {
          slot.state.send(wire);
        } catch {}
      }
    }
  }

  send(data: unknown, peerId?: string): void {
    const wire = JSON.stringify({ t: "d", d: data });
    const targets = peerId ? [this.peers.get(peerId)] : [...this.peers.values()];
    for (const slot of targets) {
      if (slot?.reliable?.readyState === "open") {
        try {
          slot.reliable.send(wire);
        } catch {}
      }
    }
  }

  peerList(): PeerInfo[] {
    return [...this.peers.values()].map((s) => ({ ...s.info }));
  }

  private reconcileRoster(peers: { id: string; name: string }[]): void {
    const alive = new Set(peers.map((p) => p.id));
    for (const p of peers) {
      if (p.id === this.opts.selfId) continue;
      const existing = this.peers.get(p.id);
      if (existing) {
        existing.info.name = p.name;
      } else {
        // Lexicographically larger id dials (creates offer)
        this.connectTo(p.id, p.name, this.opts.selfId > p.id);
      }
    }
    for (const [id, slot] of this.peers) {
      if (!alive.has(id)) {
        slot.pc.close();
        this.peers.delete(id);
      }
    }
    this.emitPeers();
  }

  private connectTo(peerId: string, name: string, initiator: boolean): PeerSlot | null {
    if (this.closed) return null;
    const pc = new RTCPeerConnection({
      iceServers: this.opts.iceServers ?? defaultIceServers(),
    });
    const slot: PeerSlot = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      lastProgressAt: Date.now(),
      recoveryAttempts: 0,
      info: {
        id: peerId,
        name,
        connectionState: pc.connectionState,
        candidateType: null,
        rttMs: null,
      },
    };
    this.peers.set(peerId, slot);

    pc.onicecandidate = (e) => {
      if (e.candidate) void this.sendSignal(peerId, "ice", e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      slot.info.connectionState = pc.connectionState;
      if (pc.connectionState === "connecting" || pc.connectionState === "connected") {
        slot.lastProgressAt = Date.now();
      }
      if (pc.connectionState === "connected") {
        slot.recoveryAttempts = 0;
        slot.terminal = false;
        void this.readCandidateType(slot);
      }
      this.emitPeers();
      if (pc.connectionState === "failed") {
        try {
          pc.restartIce();
        } catch {}
      }
    };
    pc.onnegotiationneeded = async () => {
      try {
        slot.makingOffer = true;
        await pc.setLocalDescription();
        await this.sendSignal(peerId, "offer", pc.localDescription!.toJSON());
      } catch {
        // retried on next negotiationneeded
      } finally {
        slot.makingOffer = false;
      }
    };
    pc.ondatachannel = (e) => this.attachChannel(slot, e.channel);

    if (initiator) {
      this.attachChannel(
        slot,
        pc.createDataChannel("state", { ordered: false, maxRetransmits: 0 })
      );
      this.attachChannel(slot, pc.createDataChannel("reliable", { ordered: true }));
    }
    return slot;
  }

  private attachChannel(slot: PeerSlot, channel: RTCDataChannel): void {
    if (channel.label === "state") slot.state = channel;
    else slot.reliable = channel;
    channel.onopen = () => {
      slot.lastProgressAt = Date.now();
      this.emitPeers();
    };
    channel.onmessage = (e) => {
      let msg: { t: string; d?: unknown };
      try {
        msg = JSON.parse(e.data as string) as { t: string; d?: unknown };
      } catch {
        return;
      }
      if (msg.t === "ping") {
        if (slot.state?.readyState === "open") {
          try {
            slot.state.send(JSON.stringify({ t: "pong" }));
          } catch {}
        }
      } else if (msg.t === "pong") {
        if (slot.pingSentAt) {
          slot.info.rttMs = Math.round(performance.now() - slot.pingSentAt);
          slot.pingSentAt = undefined;
          this.emitPeers();
        }
      } else {
        this.opts.onMessage?.(
          slot.info.id,
          msg.d,
          channel.label === "state" ? "state" : "reliable"
        );
      }
    };
  }

  private async flushPendingCandidates(slot: PeerSlot): Promise<void> {
    while (slot.pendingCandidates.length > 0) {
      const candidate = slot.pendingCandidates.shift()!;
      try {
        await slot.pc.addIceCandidate(candidate);
      } catch (err) {
        if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
      }
      if (this.closed) return;
    }
  }

  private async onSignal(from: string, kind: SignalKind, payload: unknown): Promise<void> {
    if (this.closed) return;
    let slot = this.peers.get(from);
    if (!slot) {
      const created = this.connectTo(from, "", false);
      if (!created) return;
      slot = created;
    }
    const polite = this.opts.selfId < from;

    try {
      if (kind === "offer" || kind === "answer") {
        const description = payload as RTCSessionDescriptionInit;
        const collision =
          kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
        slot.ignoreOffer = !polite && collision;
        if (slot.ignoreOffer) return;
        try {
          await slot.pc.setRemoteDescription(description);
        } catch (err) {
          if (kind !== "offer" || slot.recreatedForOffer) throw err;
          const attempts = slot.recoveryAttempts;
          const name = slot.info.name;
          slot.pc.close();
          this.peers.delete(from);
          const fresh = this.connectTo(from, name, false);
          if (!fresh) return;
          fresh.recoveryAttempts = attempts;
          fresh.recreatedForOffer = true;
          slot = fresh;
          await slot.pc.setRemoteDescription(description);
        }
        if (this.closed) return;
        await this.flushPendingCandidates(slot);
        if (this.closed) return;
        if (kind === "offer") {
          await slot.pc.setLocalDescription();
          if (this.closed) return;
          await this.sendSignal(from, "answer", slot.pc.localDescription!.toJSON());
        }
      } else if (kind === "ice") {
        const candidate = payload as RTCIceCandidateInit;
        if (!slot.pc.remoteDescription) {
          slot.pendingCandidates.push(candidate);
          return;
        }
        try {
          await slot.pc.addIceCandidate(candidate);
        } catch (err) {
          if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
        }
      }
    } catch (e) {
      console.warn("[p2p] onSignal error", kind, from, e);
    }
  }

  private async sendSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    if (this.closed || !this.channel) return;
    try {
      await this.channel.send({
        type: "broadcast",
        event: "signal",
        payload: {
          from: this.opts.selfId,
          to,
          kind,
          payload,
        },
      });
    } catch (err) {
      console.warn(`[p2p] signal ${kind} to ${to} failed`, err);
    }
  }

  private pingAll(): void {
    const wire = JSON.stringify({ t: "ping" });
    for (const slot of this.peers.values()) {
      if (slot.state?.readyState !== "open") continue;
      const stale =
        slot.pingSentAt !== undefined &&
        performance.now() - slot.pingSentAt > 2 * PING_INTERVAL_MS;
      if (slot.pingSentAt === undefined || stale) {
        slot.pingSentAt = performance.now();
        try {
          slot.state.send(wire);
        } catch {}
      }
    }
  }

  private watchdog(): void {
    if (this.closed) return;
    const now = Date.now();
    for (const [peerId, slot] of this.peers) {
      const live = slot.pc.connectionState;
      if (live !== slot.info.connectionState) {
        slot.info.connectionState = live;
        if (live === "connecting" || live === "connected") slot.lastProgressAt = now;
        this.emitPeers();
      }
      if (slot.terminal || live === "connected") continue;
      if (now - slot.lastProgressAt <= STALL_MS) continue;
      if (slot.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
        slot.terminal = true;
        this.emitPeers();
        continue;
      }
      slot.recoveryAttempts += 1;
      slot.lastProgressAt = now;
      if (this.opts.selfId > peerId) {
        const { name } = slot.info;
        const attempts = slot.recoveryAttempts;
        slot.pc.close();
        this.peers.delete(peerId);
        const fresh = this.connectTo(peerId, name, true);
        if (fresh) fresh.recoveryAttempts = attempts;
      } else {
        try {
          slot.pc.restartIce();
        } catch {}
      }
    }
  }

  private async readCandidateType(slot: PeerSlot): Promise<void> {
    try {
      const stats = await slot.pc.getStats();
      for (const r of stats.values()) {
        if (r.type === "local-candidate" && (r as any).candidateType) {
          slot.info.candidateType = (r as any).candidateType;
          this.emitPeers();
          return;
        }
      }
    } catch {}
  }

  private emitPeers(): void {
    try {
      this.opts.onPeersChanged?.(this.peerList());
    } catch {}
  }
}
