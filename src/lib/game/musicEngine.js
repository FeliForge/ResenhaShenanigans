// @ts-nocheck
// Motor de música del jugador. UN solo <audio> => imposible que suenen dos pistas a la vez.
// Solo se ejecuta en el cliente (se crea de forma perezosa al primer uso).

import {
  loadSettings,
  saveSettings,
  loadLibrary,
  loadPlaylists,
  getTrackBlob,
} from "@/lib/game/musicStore";

const FADE_MS = 450;

class MusicEngine {
  constructor() {
    this.audio = null;
    this.settings = loadSettings();
    this.library = [];
    this.playlists = [];
    this.queue = []; // ids de pistas en orden de reproducción
    this.index = -1;
    this.playlistId = "";
    this.currentUrl = "";
    this.listeners = new Set();
    this.state = {
      playing: false,
      trackId: "",
      title: "",
      time: 0,
      duration: 0,
      needsGesture: false,
      error: "",
    };
    this.suspended = false; // la música de sala (YouTube) tiene prioridad
    this.context = "menu";
    this.fadeTimer = null;
    this.failStreak = 0;
    this.loadToken = 0;
    this.gestureBound = false;
    this.started = false;
  }

  // ---------- infraestructura ----------
  ensureAudio() {
    if (this.audio || typeof window === "undefined") return this.audio;
    const a = new Audio();
    a.preload = "auto";
    a.loop = false;
    a.addEventListener("timeupdate", () => this.patch({ time: a.currentTime || 0, duration: a.duration || 0 }));
    a.addEventListener("durationchange", () => this.patch({ duration: a.duration || 0 }));
    a.addEventListener("play", () => this.patch({ playing: true, needsGesture: false }));
    a.addEventListener("pause", () => this.patch({ playing: false }));
    a.addEventListener("ended", () => this.onEnded());
    a.addEventListener("error", () => this.onTrackError());
    this.audio = a;
    return a;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  patch(p) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((fn) => {
      try { fn(this.state); } catch {}
    });
  }

  refreshData() {
    this.library = loadLibrary();
    this.playlists = loadPlaylists();
    // descartar pistas del queue que ya no existen
    const valid = new Set(this.library.map((t) => t.id));
    const before = this.queue.length;
    this.queue = this.queue.filter((id) => valid.has(id));
    if (this.index >= this.queue.length) this.index = this.queue.length ? this.queue.length - 1 : -1;
    // si la pista actual ya no existe, parar o saltar
    if (this.state.trackId && !valid.has(this.state.trackId)) {
      if (this.queue.length) {
        const i = Math.max(0, Math.min(this.index, this.queue.length - 1));
        this.loadIndex(i, this.state.playing);
      } else {
        this.stop();
      }
    } else if (before && !this.queue.length) {
      this.stop();
    }
  }

  /** Parar por completo y liberar el blob actual (p.ej. al borrar la canción). */
  stop() {
    clearInterval(this.fadeTimer);
    this.loadToken += 1;
    const a = this.audio;
    if (a) {
      try { a.pause(); } catch {}
      try { a.removeAttribute("src"); a.load(); } catch {}
    }
    if (this.currentUrl) {
      try { URL.revokeObjectURL(this.currentUrl); } catch {}
      this.currentUrl = "";
    }
    this.index = -1;
    this.failStreak = 0;
    this.patch({ playing: false, trackId: "", title: "", time: 0, duration: 0, error: "" });
  }

  /** Llamar tras borrar pistas de la biblioteca. */
  onTracksRemoved(ids) {
    const gone = new Set(Array.isArray(ids) ? ids : [ids]);
    this.refreshData();
    if (this.state.trackId && gone.has(this.state.trackId)) {
      if (this.queue.length) this.loadIndex(Math.max(0, this.index), false);
      else this.stop();
    }
  }

  trackTitle(id) {
    return this.library.find((t) => t.id === id)?.name || "";
  }

  effectiveVolume() {
    const s = this.settings;
    return s.muted || !s.enabled ? 0 : Math.max(0, Math.min(1, s.volume));
  }

  fadeTo(target, ms = FADE_MS, done) {
    const a = this.audio;
    if (!a) return done && done();
    clearInterval(this.fadeTimer);
    const from = a.volume;
    const start = performance.now();
    this.fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / ms);
      try { a.volume = Math.max(0, Math.min(1, from + (target - from) * k)); } catch {}
      if (k >= 1) {
        clearInterval(this.fadeTimer);
        done && done();
      }
    }, 30);
  }

  // Llamar desde un gesto del usuario (clic/tecla) para cumplir la política de autoplay.
  unlock() {
    this.started = true;
    this.ensureAudio();
    if (this.state.needsGesture) this.play();
  }

  bindGestureRetry() {
    if (this.gestureBound || typeof window === "undefined") return;
    this.gestureBound = true;
    const handler = () => {
      window.removeEventListener("pointerdown", handler, true);
      window.removeEventListener("keydown", handler, true);
      this.gestureBound = false;
      this.unlock();
    };
    window.addEventListener("pointerdown", handler, true);
    window.addEventListener("keydown", handler, true);
  }

  // ---------- cola ----------
  buildQueue(playlistId) {
    this.refreshData();
    let ids;
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (pl) ids = pl.trackIds.filter((id) => this.library.some((t) => t.id === id));
    else ids = this.library.map((t) => t.id); // sin playlist: toda la biblioteca
    if (this.settings.shuffle) {
      ids = [...ids];
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    return ids;
  }

  /** Empieza una playlist ("" = toda la biblioteca). startTrackId opcional. */
  async startPlaylist(playlistId = "", startTrackId = "") {
    this.unlock();
    this.playlistId = playlistId;
    this.queue = this.buildQueue(playlistId);
    this.failStreak = 0;
    if (!this.queue.length) {
      this.stop();
      this.patch({ error: "No hay canciones en esta playlist" });
      return;
    }
    let i = startTrackId ? this.queue.indexOf(startTrackId) : 0;
    if (i < 0) i = 0;
    this.settings = { ...this.settings, lastPlaylistId: playlistId };
    saveSettings(this.settings);
    await this.loadIndex(i, true);
  }

  async loadIndex(i, autoplay = true) {
    const a = this.ensureAudio();
    if (!a || !this.queue.length) {
      this.stop();
      return;
    }
    const n = this.queue.length;
    this.index = ((i % n) + n) % n;
    const id = this.queue[this.index];
    const token = ++this.loadToken;
    this.patch({ trackId: id, title: this.trackTitle(id), time: 0, duration: 0, error: "" });

    let blob = null;
    try {
      blob = await getTrackBlob(id);
    } catch {
      blob = null;
    }
    if (token !== this.loadToken) return; // llegó una petición más nueva
    if (!blob) {
      this.onTrackError("Archivo no encontrado en este navegador");
      return;
    }

    const swap = () => {
      if (token !== this.loadToken) return;
      try { a.pause(); } catch {}
      const old = this.currentUrl;
      this.currentUrl = URL.createObjectURL(blob);
      a.src = this.currentUrl;
      if (old) { try { URL.revokeObjectURL(old); } catch {} }
      a.volume = 0;
      if (autoplay && this.canPlayNow()) this.play();
      else this.patch({ playing: false });
    };
    if (!a.paused && a.volume > 0.01) this.fadeTo(0, 250, swap);
    else swap();
  }

  canPlayNow() {
    return this.settings.enabled && !this.suspended;
  }

  // ---------- controles ----------
  async play() {
    const a = this.ensureAudio();
    if (!a || !this.canPlayNow()) return;
    if (!a.src) {
      await this.startPlaylist(this.playlistId || this.settings.lastPlaylistId || "");
      return;
    }
    try {
      await a.play();
      this.failStreak = 0;
      this.fadeTo(this.effectiveVolume());
    } catch (e) {
      if (e && e.name === "NotAllowedError") {
        this.patch({ needsGesture: true, playing: false });
        this.bindGestureRetry();
      } else if (e && e.name !== "AbortError") {
        this.onTrackError();
      }
    }
  }

  pause() {
    const a = this.audio;
    if (!a) return;
    this.fadeTo(0, 250, () => { try { a.pause(); } catch {} });
  }

  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }

  next() {
    if (!this.queue.length) return;
    this.loadIndex(this.index + 1, true);
  }

  prev() {
    const a = this.audio;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    if (!this.queue.length) return;
    this.loadIndex(this.index - 1, true);
  }

  seek(fraction) {
    const a = this.audio;
    if (a && isFinite(a.duration) && a.duration > 0) a.currentTime = Math.max(0, Math.min(1, fraction)) * a.duration;
  }

  onEnded() {
    const mode = this.settings.repeat;
    if (mode === "one") {
      const a = this.audio;
      try { a.currentTime = 0; a.play(); } catch {}
      return;
    }
    const last = this.index >= this.queue.length - 1;
    if (last && mode === "off") {
      this.patch({ playing: false });
      return;
    }
    if (last && this.settings.shuffle) this.queue = this.buildQueue(this.playlistId);
    this.loadIndex(this.index + 1, true);
  }

  onTrackError(msg) {
    this.failStreak += 1;
    const name = this.trackTitle(this.state.trackId) || "pista";
    this.patch({ playing: false, error: msg || `No se pudo reproducir "${name}"` });
    // Si fallan todas, paramos; si no, saltamos a la siguiente.
    if (this.failStreak >= Math.max(1, this.queue.length)) {
      this.stop();
      return;
    }
    setTimeout(() => this.loadIndex(this.index + 1, true), 400);
  }

  // ---------- ajustes ----------
  updateSettings(patch) {
    const prev = this.settings;
    this.settings = {
      ...prev,
      ...patch,
      assign: { ...prev.assign, ...(patch.assign || {}) },
    };
    saveSettings(this.settings);
    const a = this.audio;
    if (a) {
      if (!this.settings.enabled) {
        this.fadeTo(0, 250, () => { try { a.pause(); } catch {} });
      } else {
        a.volume = this.effectiveVolume();
        if (!prev.enabled && a.src) this.play();
      }
    }
    if (patch.shuffle !== undefined && this.queue.length) {
      const cur = this.queue[this.index];
      this.queue = this.buildQueue(this.playlistId);
      const i = this.queue.indexOf(cur);
      if (i >= 0) this.index = i;
    }
    this.patch({});
  }

  setSuspended(flag) {
    flag = !!flag;
    if (flag === this.suspended) return;
    this.suspended = flag;
    if (flag) {
      const a = this.audio;
      if (a && !a.paused) this.fadeTo(0, 300, () => { try { a.pause(); } catch {} });
    } else if (this.started && this.settings.enabled && this.audio?.src) {
      this.play();
    }
  }

  /** Cambia de situación (menu | combat). Respeta "mantener entre pantallas". */
  setContext(ctx) {
    if (ctx === this.context) return;
    this.context = ctx;
    const want = this.settings.assign?.[ctx] || "";
    if (!this.started || !this.settings.enabled) return;
    if (!want) return; // sin playlist asignada: sigue lo que haya
    if (want === this.playlistId && this.audio?.src) return; // ya es la misma
    if (this.settings.keepAcrossScreens && this.state.playing && !want) return;
    this.startPlaylist(want);
  }
}

let instance = null;
export function getMusicEngine() {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new MusicEngine();
  return instance;
}
