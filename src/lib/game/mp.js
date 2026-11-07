// @ts-nocheck
import { P2PRoom } from "@/lib/multiplayer";
import { normalizeNetLoadout } from "@/lib/game/mpProtocol";

function hashSeat(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 16 + 1;
}

function assignSeats(ids) {
  const used = new Set();
  const map = new Map();
  const unique = [...new Set(ids.filter(Boolean))];
  for (const id of unique.sort()) {
    let seat = hashSeat(id);
    let n = 0;
    while (used.has(seat) && n < 16) {
      seat = (seat % 16) + 1;
      n += 1;
    }
    used.add(seat);
    map.set(id, seat);
  }
  return map;
}

function safeId(value, fallback) {
  const clean = String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
  return clean || fallback;
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

export class MultiplayerManager {
  constructor(roomCode, connId) {
    this.selfId = safeId(connId, "player");
    this.mySeat = hashSeat(this.selfId);
    this.remotes = new Map(); // seat -> state
    this.loadouts = new Map(); // seat -> loadout
    this.peerToSeat = new Map(); // peerId -> seat (stable view)
    this.onEvent = null;
    this.onMusic = null;
    this.onStatus = null;
    this.onLoadout = null; // (seat, loadout) when a peer identity updates
    this.roomMusic = "";
    this.byPeer = new Map(); // peerId -> { state?, loadout? }
    this.peerIds = [];
    this.lastLoadout = null;
    this.status = "connecting";
    const room = `arena-${safeId(roomCode, "lobby")}`;
    this.roomName = room;
    this.room = new P2PRoom({
      room,
      selfId: this.selfId,
      name: "luchador",
      onConnected: () => {
        this.status = "signaling";
        try {
          this.onStatus?.("signaling", "Realtime listo");
        } catch {}
        this._announce();
      },
      onPeersChanged: (peers) => {
        // Always unique; never accumulate duplicates from messages
        this.peerIds = uniqueIds((peers || []).map((p) => p.id));
        this.reindex();
        const connected = (peers || []).filter((p) => p.connectionState === "connected").length;
        this.status = connected > 0 ? "connected" : this.peerIds.length ? "negotiating" : "waiting";
        try {
          this.onStatus?.(this.status, `${this.peerIds.length} peers · ${connected} P2P`);
        } catch {}
        try {
          this.room.broadcast({ type: "music_request" });
        } catch {}
        this._announce();
      },
      onMessage: (from, data) => this.handle(from, data),
    });
    this._joinWithRetry();
  }

  _announce() {
    if (this.lastLoadout) {
      try {
        this.room.send({ type: "loadout", ...this.lastLoadout });
      } catch {}
      try {
        this.room.send({ type: "hello", loadout: this.lastLoadout });
      } catch {}
    }
  }

  async _joinWithRetry() {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await this.room.join();
        return;
      } catch (e) {
        console.warn("[mp] join attempt failed", attempt, e);
        this.status = "error";
        try {
          this.onStatus?.("error", String(e?.message || e));
        } catch {}
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }

  /** Rebuild seat maps from the authoritative unique peer list. */
  reindex() {
    const seats = assignSeats([this.selfId, ...this.peerIds]);
    this.mySeat = seats.get(this.selfId) || this.mySeat;
    this.peerToSeat = seats;
    this.remotes.clear();
    this.loadouts.clear();
    for (const [id, rec] of this.byPeer) {
      if (id !== this.selfId && !this.peerIds.includes(id)) continue;
      const seat = seats.get(id);
      if (!seat) continue;
      if (rec.state) this.remotes.set(seat, rec.state);
      if (rec.loadout) this.loadouts.set(seat, rec.loadout);
    }
  }

  /** Stable seat for a known peer. Does NOT mutate peerIds. */
  seatFor(peerId) {
    if (!peerId) return null;
    if (this.peerToSeat.has(peerId)) return this.peerToSeat.get(peerId);
    // Unknown peer: compute without permanently adding to roster
    const seats = assignSeats([this.selfId, ...this.peerIds, peerId]);
    return seats.get(peerId) || null;
  }

  handle(fromPeer, data) {
    if (!data || typeof data !== "object" || !fromPeer) return;

    // Register peer id without duplicates (roster is still driven by presence)
    if (fromPeer !== this.selfId && !this.peerIds.includes(fromPeer)) {
      this.peerIds = uniqueIds([...this.peerIds, fromPeer]);
      this.reindex();
    }

    const rec = this.byPeer.get(fromPeer) || {};

    if (data.type === "music") {
      this.roomMusic = data.url || "";
      try {
        this.onMusic?.(this.roomMusic);
      } catch {}
      return;
    }
    if (data.type === "music_request") {
      if (this.roomMusic) {
        try {
          this.room.broadcast({ type: "music", url: this.roomMusic });
        } catch {}
      }
      return;
    }
    if (data.type === "hello") {
      if (data.loadout) {
        const lo = normalizeNetLoadout(data.loadout);
        rec.loadout = lo;
        this.byPeer.set(fromPeer, rec);
        this.reindex();
        const seat = this.seatFor(fromPeer);
        if (seat) {
          try {
            this.onLoadout?.(seat, lo);
          } catch {}
        }
      }
      if (this.lastLoadout) {
        try {
          this.room.send({ type: "loadout", ...this.lastLoadout }, fromPeer);
        } catch {}
      }
      return;
    }
    if (data.type === "state") {
      const { type, ...state } = data;
      rec.state = state;
      this.byPeer.set(fromPeer, rec);
      // Lightweight update — full reindex only when seats may change
      const seat = this.seatFor(fromPeer);
      if (seat) this.remotes.set(seat, state);
    } else if (data.type === "loadout") {
      const { type, ...raw } = data;
      const lo = normalizeNetLoadout(raw);
      rec.loadout = lo;
      this.byPeer.set(fromPeer, rec);
      this.reindex();
      const seat = this.seatFor(fromPeer);
      if (seat) {
        try {
          this.onLoadout?.(seat, lo);
        } catch {}
      }
    } else if (data.type === "event") {
      // Prefer live seat from peerId; never trust sender's claimed `from` seat
      const seat = this.seatFor(fromPeer);
      if (!seat) return;
      const withSeat = { ...data, from: seat, peerId: fromPeer };
      try {
        this.onEvent?.(withSeat, fromPeer);
      } catch {}
    }
  }

  sendState(s) {
    try {
      this.room.broadcast({ type: "state", ...s });
    } catch {}
  }

  sendLoadout(l) {
    this.lastLoadout = normalizeNetLoadout(l) || l;
    try {
      this.room.send({ type: "loadout", ...this.lastLoadout });
    } catch {}
    try {
      this.room.send({ type: "hello", loadout: this.lastLoadout });
    } catch {}
  }

  sendEvent(e) {
    try {
      // Include both seat (compat) and selfId so receivers can resolve stably
      this.room.send({
        type: "event",
        from: this.mySeat,
        peerId: this.selfId,
        ...e,
      });
    } catch {}
  }

  sendMusic(url) {
    this.roomMusic = url || "";
    try {
      this.room.broadcast({ type: "music", url: this.roomMusic });
    } catch {}
  }

  close() {
    try {
      this.room.close();
    } catch {}
  }
}
