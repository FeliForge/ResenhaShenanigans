// @ts-nocheck
// Música de sala vía YouTube. URL por código de sala + sync P2P.

const STORAGE_PREFIX = "resenha_room_music_";

export function extractYouTubeId(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/");
      const emb = parts.indexOf("embed");
      if (emb >= 0 && parts[emb + 1] && /^[\w-]{11}$/.test(parts[emb + 1])) return parts[emb + 1];
      const shorts = parts.indexOf("shorts");
      if (shorts >= 0 && parts[shorts + 1] && /^[\w-]{11}$/.test(parts[shorts + 1])) return parts[shorts + 1];
    }
  } catch {
    /* no URL */
  }
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function saveRoomMusic(roomCode, url) {
  const code = String(roomCode || "").trim();
  if (!code) return;
  try {
    if (url) localStorage.setItem(STORAGE_PREFIX + code, String(url).trim());
    else localStorage.removeItem(STORAGE_PREFIX + code);
  } catch {}
}

export function loadRoomMusic(roomCode) {
  const code = String(roomCode || "").trim();
  if (!code) return "";
  try {
    return localStorage.getItem(STORAGE_PREFIX + code) || "";
  } catch {
    return "";
  }
}

export function youtubeEmbedSrc(urlOrId, { muted = false } = {}) {
  const id = extractYouTubeId(urlOrId);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: "1",
    loop: "1",
    playlist: id,
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    mute: muted ? "1" : "0",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
