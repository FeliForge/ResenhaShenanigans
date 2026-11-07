// @ts-nocheck
import { P2PRoom } from "@/lib/multiplayer";

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
  for (const id of [...ids].sort()) {
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

export class MultiplayerManager {
  constructor(roomCode, connId) {
    this.selfId = safeId(connId, "player");
    this.mySeat = hashSeat(this.selfId);
    this.remotes = new Map();
    this.loadouts = new Map();
    this.onEvent = null;
    this.onMusic = null;
    this.roomMusic = "";
    this.byPeer = new Map();
    this.peerIds = [];
    const room = `arena-${safeId(roomCode, "lobby")}`;
    this.room = new P2PRoom({
      room,
      selfId: this.selfId,
      name: "luchador",
      onPeersChanged: (peers) => {
        this.peerIds = (peers || []).map((p) => p.id);
        this.reindex();
        // Pedir música actual al unirse
        try { this.room.broadcast({ type: "music_request" }); } catch {}
      },
      onMessage: (from, data) => this.handle(from, data),
    });
    this.room.join().catch(() => {});
  }

  reindex() {
    const seats = assignSeats([this.selfId, ...this.peerIds]);
    this.mySeat = seats.get(this.selfId) || this.mySeat;
    this.remotes.clear();
    this.loadouts.clear();
    for (const [id, rec] of this.byPeer) {
      if (!this.peerIds.includes(id)) continue;
      const seat = seats.get(id);
      if (!seat) continue;
      if (rec.state) this.remotes.set(seat, rec.state);
      if (rec.loadout) this.loadouts.set(seat, rec.loadout);
    }
  }

  seatFor(peerId) {
    return assignSeats([this.selfId, ...this.peerIds, peerId]).get(peerId);
  }

  handle(fromPeer, data) {
    if (!data || typeof data !== "object") return;
    if (!this.peerIds.includes(fromPeer)) this.peerIds.push(fromPeer);
    const rec = this.byPeer.get(fromPeer) || {};
    if (data.type === "music") {
      this.roomMusic = data.url || "";
      try { this.onMusic?.(this.roomMusic); } catch {}
      return;
    }
    if (data.type === "music_request") {
      if (this.roomMusic) {
        try { this.room.broadcast({ type: "music", url: this.roomMusic }); } catch {}
      }
      return;
    }
    if (data.type === "state") {
      const { type, ...state } = data;
      rec.state = state;
      this.byPeer.set(fromPeer, rec);
      this.reindex();
    } else if (data.type === "loadout") {
      const { type, ...loadout } = data;
      rec.loadout = loadout;
      this.byPeer.set(fromPeer, rec);
      this.reindex();
    } else if (data.type === "event") {
      // Inject the sender's seat so GameCanvas can use msg.from as seat number.
      const seat = this.seatFor(fromPeer) || this.mySeat;
      const withSeat = { ...data, from: seat };
      try { this.onEvent?.(withSeat, fromPeer); } catch {}
    }
  }

  sendState(s) {
    try {
      this.room.broadcast({ type: "state", ...s });
    } catch {}
  }

  sendLoadout(l) {
    try {
      this.room.send({ type: "loadout", ...l });
    } catch {}
  }

  sendEvent(e) {
    try {
      // Always tag events with our current seat so receivers can attribute them.
      this.room.send({ type: "event", from: this.mySeat, ...e });
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
