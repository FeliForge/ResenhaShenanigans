// @ts-nocheck
// Playlists locales para el Boombox. Solo localStorage — no toca red ni combate.

import { extractYouTubeId } from "@/lib/game/roomMusic";

const KEY = "resenha_boombox_playlists_v1";

function uid() {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeRead() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function safeWrite(list) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function loadPlaylists() {
  return safeRead();
}

export function savePlaylists(list) {
  safeWrite(Array.isArray(list) ? list : []);
}

export function createPlaylist(name) {
  const list = safeRead();
  const pl = {
    id: uid(),
    name: String(name || "Mi playlist").trim().slice(0, 48) || "Mi playlist",
    tracks: [],
    createdAt: Date.now(),
  };
  list.unshift(pl);
  safeWrite(list);
  return pl;
}

export function deletePlaylist(id) {
  const list = safeRead().filter((p) => p.id !== id);
  safeWrite(list);
  return list;
}

export function renamePlaylist(id, name) {
  const list = safeRead().map((p) =>
    p.id === id ? { ...p, name: String(name || p.name).trim().slice(0, 48) || p.name } : p,
  );
  safeWrite(list);
  return list;
}

/**
 * Agrega un track por link de YouTube o por nombre (búsqueda).
 * @param {string} playlistId
 * @param {{ title?: string, input: string }} opts
 */
export function addTrack(playlistId, { title, input }) {
  const raw = String(input || "").trim();
  if (!raw) return safeRead();

  const ytId = extractYouTubeId(raw);
  const track = ytId
    ? {
        id: `t_${ytId}_${Date.now().toString(36)}`,
        title: String(title || `YouTube ${ytId}`).trim().slice(0, 80),
        type: "url",
        videoId: ytId,
        url: `https://www.youtube.com/watch?v=${ytId}`,
      }
    : {
        id: `t_s_${Date.now().toString(36)}`,
        title: String(title || raw).trim().slice(0, 80),
        type: "search",
        query: raw.slice(0, 120),
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}`,
      };

  const list = safeRead().map((p) => {
    if (p.id !== playlistId) return p;
    const tracks = [...(p.tracks || []), track].slice(0, 50);
    return { ...p, tracks };
  });
  safeWrite(list);
  return list;
}

export function removeTrack(playlistId, trackId) {
  const list = safeRead().map((p) => {
    if (p.id !== playlistId) return p;
    return { ...p, tracks: (p.tracks || []).filter((t) => t.id !== trackId) };
  });
  safeWrite(list);
  return list;
}

/** Primera URL reproducible de la playlist (video id o null). */
export function firstPlayableUrl(playlist) {
  const tracks = playlist?.tracks || [];
  for (const t of tracks) {
    if (t.type === "url" && t.videoId) return t.url || `https://www.youtube.com/watch?v=${t.videoId}`;
  }
  return "";
}

/** IDs de YouTube en orden (solo tracks tipo url). */
export function playlistVideoIds(playlist) {
  return (playlist?.tracks || [])
    .filter((t) => t.type === "url" && t.videoId)
    .map((t) => t.videoId);
}
