// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  Music2,
  Plus,
  Trash2,
  X,
  Play,
  Link2,
  Search,
  Radio,
  ListMusic,
  SkipForward,
} from "lucide-react";
import {
  loadPlaylists,
  createPlaylist,
  deletePlaylist,
  addTrack,
  removeTrack,
  firstPlayableUrl,
  playlistVideoIds,
} from "@/lib/game/playlists";
import { extractYouTubeId, youtubeEmbedSrc } from "@/lib/game/roomMusic";
import { inputState } from "@/lib/game/input";

function trackEmbedSrc(track) {
  if (!track) return null;
  if (track.type === "url" && track.videoId) {
    return youtubeEmbedSrc(track.videoId, { muted: false });
  }
  if (track.type === "search" && track.query) {
    const q = encodeURIComponent(track.query);
    return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&controls=1&rel=0`;
  }
  return null;
}

export default function BoomboxPanel({ onClose, onUseInRoom, roomCode }) {
  const [playlists, setPlaylists] = useState(() => loadPlaylists());
  const [activeId, setActiveId] = useState(() => loadPlaylists()[0]?.id || null);
  const [newName, setNewName] = useState("");
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("link"); // link | search
  const [playingIdx, setPlayingIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    inputState.blocked = true;
    try { document.exitPointerLock?.(); } catch {}
    return () => { inputState.blocked = false; };
  }, []);

  const active = useMemo(
    () => playlists.find((p) => p.id === activeId) || playlists[0] || null,
    [playlists, activeId],
  );

  const tracks = active?.tracks || [];
  const current = tracks[playingIdx] || null;
  const embed = playing ? trackEmbedSrc(current) : null;

  useEffect(() => {
    setPlayingIdx(0);
    setPlaying(false);
  }, [activeId]);

  function refresh(list) {
    setPlaylists(list);
    if (list.length && !list.find((p) => p.id === activeId)) {
      setActiveId(list[0].id);
    }
    if (!list.length) setActiveId(null);
  }

  function handleCreate() {
    const pl = createPlaylist(newName || "Mi mixtape");
    refresh(loadPlaylists());
    setActiveId(pl.id);
    setNewName("");
  }

  function handleAdd() {
    if (!active) return;
    const value = input.trim();
    if (!value) return;
    if (mode === "link" && !extractYouTubeId(value)) {
      refresh(addTrack(active.id, { title: title || value, input: value }));
    } else {
      refresh(
        addTrack(active.id, {
          title: title || (mode === "search" ? value : undefined),
          input: value,
        }),
      );
    }
    setInput("");
    setTitle("");
  }

  function handlePlayTrack(idx) {
    setPlayingIdx(idx);
    setPlaying(true);
  }

  function handleNext() {
    if (!tracks.length) return;
    setPlayingIdx((i) => (i + 1) % tracks.length);
    setPlaying(true);
  }

  function handleUseInRoom() {
    if (!active || !onUseInRoom) return;
    const url = firstPlayableUrl(active);
    if (url) onUseInRoom(url);
  }

  const ids = active ? playlistVideoIds(active) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#ff9620]/30 bg-gradient-to-b from-[#1a1520] to-[#0d0a12] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div className="relative px-4 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#ff9620]">
              <Radio size={20} />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Boombox</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-[1fr_1.4fr_1fr] items-center gap-2">
            <div className="aspect-square rounded-full border-4 border-[#2a2430] bg-[radial-gradient(circle_at_center,#333_0%,#111_55%,#000_100%)] shadow-inner" />
            <div className="rounded-xl border border-white/10 bg-black/60 p-2">
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40">
                <span>Now playing</span>
                <span className="text-[#ff9620]">{playing ? "ON AIR" : "STANDBY"}</span>
              </div>
              <p className="truncate text-xs font-semibold text-white">
                {current?.title || "— sin pista —"}
              </p>
              <p className="truncate text-[10px] text-white/40">{active?.name || "Sin playlist"}</p>
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => (playing ? setPlaying(false) : handlePlayTrack(playingIdx))}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#ff9620] py-1.5 text-[11px] font-bold text-[#0a0a14]"
                >
                  <Play size={12} /> {playing ? "Pausar" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-md border border-white/15 px-2 text-white/70 hover:bg-white/10"
                  title="Siguiente"
                >
                  <SkipForward size={14} />
                </button>
              </div>
            </div>
            <div className="aspect-square rounded-full border-4 border-[#2a2430] bg-[radial-gradient(circle_at_center,#333_0%,#111_55%,#000_100%)] shadow-inner" />
          </div>

          {embed && (
            <div className="mb-3 overflow-hidden rounded-lg border border-white/10">
              <iframe
                key={embed}
                title="boombox-player"
                src={embed}
                className="h-40 w-full bg-black"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}

          <div className="mb-2 flex items-center gap-2">
            <ListMusic size={14} className="text-[#ff9620]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Playlists</span>
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  p.id === active?.id
                    ? "border-[#ff9620] bg-[#ff9620]/15 text-[#ff9620]"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                }`}
              >
                {p.name}
                <span className="ml-1 text-[10px] opacity-60">({(p.tracks || []).length})</span>
              </button>
            ))}
          </div>

          <div className="mb-3 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de playlist"
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#ff9620]/50"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-3 text-xs font-bold uppercase text-white hover:bg-white/15"
            >
              <Plus size={14} /> Nueva
            </button>
            {active && (
              <button
                type="button"
                onClick={() => refresh(deletePlaylist(active.id))}
                className="rounded-lg border border-red-500/30 px-2 text-red-400 hover:bg-red-500/10"
                title="Borrar playlist"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {active && (
            <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode("link")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold uppercase ${
                    mode === "link" ? "bg-[#ff9620] text-[#0a0a14]" : "bg-white/5 text-white/60"
                  }`}
                >
                  <Link2 size={12} /> Link YT
                </button>
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold uppercase ${
                    mode === "search" ? "bg-[#ff9620] text-[#0a0a14]" : "bg-white/5 text-white/60"
                  }`}
                >
                  <Search size={12} /> Nombre / búsqueda
                </button>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre visible (opcional)"
                className="mb-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "link"
                    ? "https://youtube.com/watch?v=..."
                    : "Ej: Bad Bunny Tití Me Preguntó"
                }
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                type="button"
                onClick={handleAdd}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff9620]/90 py-2 text-xs font-black uppercase tracking-wider text-[#0a0a14] hover:brightness-110"
              >
                <Plus size={14} /> Agregar a {active.name}
              </button>
            </div>
          )}

          <div className="max-h-40 space-y-1 overflow-y-auto">
            {tracks.length === 0 && (
              <p className="py-4 text-center text-xs text-white/35">
                {active ? "Agregá temas con link o nombre" : "Creá una playlist para empezar"}
              </p>
            )}
            {tracks.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  i === playingIdx && playing ? "bg-[#ff9620]/15" : "hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handlePlayTrack(i)}
                  className="rounded p-1 text-[#ff9620] hover:bg-white/10"
                >
                  <Play size={14} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{t.title}</p>
                  <p className="truncate text-[10px] text-white/35">
                    {t.type === "url" ? "YouTube" : `Búsqueda: ${t.query}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refresh(removeTrack(active.id, t.id))}
                  className="rounded p-1 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {roomCode && onUseInRoom && ids.length > 0 && (
            <button
              type="button"
              onClick={handleUseInRoom}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff9620]/40 bg-[#ff9620]/10 py-2.5 text-xs font-bold uppercase tracking-wider text-[#ff9620] hover:bg-[#ff9620]/20"
            >
              <Music2 size={14} /> Usar 1ª pista en la sala {roomCode}
            </button>
          )}

          <p className="mt-2 text-center text-[10px] text-white/30">
            Links de YouTube o nombre de canción. Las playlists se guardan en este dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
}
