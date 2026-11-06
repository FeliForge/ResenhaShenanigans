// @ts-nocheck
// Almacenamiento LOCAL de la música del jugador.
// Archivos (blobs) -> IndexedDB del navegador. Metadatos, playlists y ajustes -> localStorage.
// Nada se sube a Vercel ni a ningún servidor.

const DB_NAME = "resenha_music_db";
const DB_STORE = "tracks";
const LIB_KEY = "resenha_music_lib_v1";
const PL_KEY = "resenha_music_playlists_v1";
const SET_KEY = "resenha_music_settings_v1";

export const ACCEPTED_EXT = ["mp3", "wav", "ogg"];
export const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40 MB por canción

export const DEFAULT_SETTINGS = {
  enabled: true,
  volume: 0.5,
  muted: false,
  shuffle: false,
  repeat: "all", // "off" | "all" | "one"
  keepAcrossScreens: true, // la música continúa al cambiar de menú / entrar en combate
  assign: { menu: "", combat: "" }, // playlistId por situación ("" = sin asignar)
  lastPlaylistId: "",
};

function uid(p) {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readJson(key, fallback) {
  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---------- Ajustes ----------
export function loadSettings() {
  const s = readJson(SET_KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...(s && typeof s === "object" ? s : {}),
    assign: { ...DEFAULT_SETTINGS.assign, ...(s?.assign || {}) },
  };
}

export function saveSettings(settings) {
  writeJson(SET_KEY, settings);
}

// ---------- IndexedDB ----------
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("No se pudo abrir IndexedDB"));
  });
}

async function dbTx(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const store = tx.objectStore(DB_STORE);
      let result;
      try {
        result = fn(store);
      } catch (e) {
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(result?.result !== undefined ? result.result : undefined);
      tx.onerror = () => reject(tx.error || new Error("Error de IndexedDB"));
      tx.onabort = () => reject(tx.error || new Error("Transacción cancelada"));
    });
  } finally {
    db.close();
  }
}

export async function getTrackBlob(id) {
  const rec = await dbTx("readonly", (s) => s.get(id));
  return rec?.blob || null;
}

// ---------- Biblioteca ----------
export function loadLibrary() {
  const lib = readJson(LIB_KEY, []);
  return Array.isArray(lib) ? lib.filter((t) => t && t.id) : [];
}

function saveLibrary(lib) {
  writeJson(LIB_KEY, lib);
}

function extOf(name) {
  const m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function cleanName(name) {
  return String(name || "Canción").replace(/\.[a-z0-9]+$/i, "").slice(0, 80) || "Canción";
}

/**
 * Importa archivos desde el dispositivo.
 * Devuelve { added: [...], rejected: [{ name, reason }] } — nunca lanza por un archivo malo.
 */
export async function importFiles(fileList) {
  const files = Array.from(fileList || []);
  const added = [];
  const rejected = [];
  const probe = typeof document !== "undefined" ? document.createElement("audio") : null;
  const lib = loadLibrary();

  for (const file of files) {
    const ext = extOf(file.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      rejected.push({ name: file.name, reason: "Formato no compatible (usa MP3, WAV u OGG)" });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ name: file.name, reason: "Archivo demasiado grande (máx. 40 MB)" });
      continue;
    }
    const mime = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : "audio/ogg";
    if (probe && !probe.canPlayType(mime)) {
      rejected.push({ name: file.name, reason: "Tu navegador no puede reproducir este formato" });
      continue;
    }
    const id = uid("trk");
    try {
      await dbTx("readwrite", (s) => s.put({ id, name: file.name, type: file.type || mime, blob: file }));
      const meta = { id, name: cleanName(file.name), size: file.size, addedAt: Date.now() };
      lib.push(meta);
      added.push(meta);
    } catch (e) {
      rejected.push({ name: file.name, reason: "No se pudo guardar en el navegador (¿almacenamiento lleno?)" });
    }
  }
  if (added.length) saveLibrary(lib);
  return { added, rejected };
}

export async function removeTrack(id) {
  try {
    await dbTx("readwrite", (s) => s.delete(id));
  } catch {}
  const lib = loadLibrary().filter((t) => t.id !== id);
  saveLibrary(lib);
  const pls = loadPlaylists().map((p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== id) }));
  savePlaylists(pls);
  return { library: lib, playlists: pls };
}

// ---------- Playlists ----------
export function loadPlaylists() {
  const pls = readJson(PL_KEY, []);
  return Array.isArray(pls)
    ? pls.filter((p) => p && p.id).map((p) => ({ ...p, trackIds: Array.isArray(p.trackIds) ? p.trackIds : [] }))
    : [];
}

export function savePlaylists(list) {
  writeJson(PL_KEY, Array.isArray(list) ? list : []);
}

export function createPlaylist(name) {
  const list = loadPlaylists();
  const pl = {
    id: uid("pl"),
    name: String(name || "Nueva playlist").trim().slice(0, 40) || "Nueva playlist",
    trackIds: [],
  };
  list.push(pl);
  savePlaylists(list);
  return { playlist: pl, playlists: list };
}

export function deletePlaylist(id) {
  const list = loadPlaylists().filter((p) => p.id !== id);
  savePlaylists(list);
  const s = loadSettings();
  const assign = { ...s.assign };
  for (const k of Object.keys(assign)) if (assign[k] === id) assign[k] = "";
  saveSettings({ ...s, assign, lastPlaylistId: s.lastPlaylistId === id ? "" : s.lastPlaylistId });
  return list;
}

export function renamePlaylist(id, name) {
  const list = loadPlaylists().map((p) =>
    p.id === id ? { ...p, name: String(name || p.name).trim().slice(0, 40) || p.name } : p,
  );
  savePlaylists(list);
  return list;
}

export function addTracksToPlaylist(id, trackIds) {
  const list = loadPlaylists().map((p) => {
    if (p.id !== id) return p;
    const have = new Set(p.trackIds);
    const next = [...p.trackIds];
    for (const t of trackIds) if (!have.has(t)) next.push(t);
    return { ...p, trackIds: next };
  });
  savePlaylists(list);
  return list;
}

export function removeTrackFromPlaylist(id, trackId) {
  const list = loadPlaylists().map((p) =>
    p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
  );
  savePlaylists(list);
  return list;
}

export function moveTrackInPlaylist(id, trackId, delta) {
  const list = loadPlaylists().map((p) => {
    if (p.id !== id) return p;
    const arr = [...p.trackIds];
    const i = arr.indexOf(trackId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= arr.length) return p;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...p, trackIds: arr };
  });
  savePlaylists(list);
  return list;
}
