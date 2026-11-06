// @ts-nocheck
import { Component, useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, ListMusic, Music, Pause, Play, Plus, Repeat, Repeat1,
  Settings as SettingsIcon, Shuffle, SkipBack, SkipForward, Trash2, Upload, Volume2, VolumeX, X,
} from "lucide-react";
import { getMusicEngine } from "@/lib/game/musicEngine";
import {
  addTracksToPlaylist, createPlaylist, deletePlaylist, importFiles, loadLibrary, loadPlaylists, loadSettings,
  moveTrackInPlaylist, removeTrack, removeTrackFromPlaylist, renamePlaylist,
} from "@/lib/game/musicStore";

function fmt(s) {
  if (!isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function useEngine() {
  const [eng, setEng] = useState(null);
  const [state, setState] = useState(null);
  const [, force] = useState(0);
  useEffect(() => {
    const e = getMusicEngine();
    if (!e) return;
    e.refreshData();
    setEng(e);
    setState(e.state);
    const off = e.subscribe((s) => { setState(s); force((n) => n + 1); });
    return off;
  }, []);
  return { eng, state };
}

/**
 * Reproductor de música personalizable.
 * @param {"menu"|"select"|"workshop"|"play"} screen  pantalla actual del juego
 * @param {boolean} suspended  true si suena música de sala (YouTube) o el sonido global está apagado
 */
function MusicPlayerInner({ screen = "menu", suspended = false }) {
  const { eng, state } = useEngine();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("songs");
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activePl, setActivePl] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const inCombat = screen === "play";

  useEffect(() => {
    setLibrary(loadLibrary());
    setPlaylists(loadPlaylists());
  }, [open]);

  useEffect(() => {
    if (!eng) return;
    eng.setContext(inCombat ? "combat" : "menu");
  }, [eng, inCombat]);

  useEffect(() => {
    if (eng) eng.setSuspended(suspended);
  }, [eng, suspended]);

  // Primer gesto del usuario: permite iniciar audio y arranca la playlist del menú si hay una asignada.
  useEffect(() => {
    if (!eng) return;
    const first = () => {
      window.removeEventListener("pointerdown", first, true);
      window.removeEventListener("keydown", first, true);
      eng.unlock();
      const s = eng.settings;
      const want = s.assign?.[inCombat ? "combat" : "menu"] || "";
      if (s.enabled && want && !eng.audio?.src) eng.startPlaylist(want);
    };
    window.addEventListener("pointerdown", first, true);
    window.addEventListener("keydown", first, true);
    return () => {
      window.removeEventListener("pointerdown", first, true);
      window.removeEventListener("keydown", first, true);
    };
  }, [eng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!eng || !state) return null;
  const s = eng.settings;
  const progress = state.duration > 0 ? state.time / state.duration : 0;

  function refresh() {
    setLibrary(loadLibrary());
    setPlaylists(loadPlaylists());
  }

  async function onPick(e) {
    const files = e.target.files;
    if (!files || !files.length) return;
    setBusy(true);
    setNotice("");
    try {
      const { added, rejected } = await importFiles(files);
      if (added.length && activePl) addTracksToPlaylist(activePl, added.map((t) => t.id));
      refresh();
      const parts = [];
      if (added.length) parts.push(`${added.length} canción(es) importada(s)`);
      if (rejected.length) parts.push(rejected.map((r) => `${r.name}: ${r.reason}`).join(" · "));
      setNotice(parts.join(" — "));
    } catch {
      setNotice("No se pudieron importar los archivos.");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const btn = "flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 active:scale-95";
  const chip = (on) =>
    `rounded-md px-2 py-1 text-xs font-semibold ${on ? "bg-[#ff9620] text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`;

  // Posición: en combate queda en una esquina pequeña para no tapar la acción.
  const pos = inCombat ? "bottom-24 left-2 sm:bottom-3" : "bottom-3 left-3";

  return (
    <div className={`fixed z-[60] ${pos} text-white`} data-testid="music-player">
      <input ref={fileRef} type="file" accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg" multiple className="hidden" onChange={onPick} />

      {/* Barra compacta */}
      <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/70 p-1.5 backdrop-blur">
        <button className={btn} onClick={() => setOpen((v) => !v)} aria-label="Abrir música" title="Música">
          <Music size={15} />
        </button>
        {!inCombat && (
          <div className="hidden min-w-0 max-w-[140px] sm:block">
            <div className="truncate text-[11px] font-semibold">{state.title || "Sin canción"}</div>
            <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-white/15">
              <div className="h-full bg-[#ff9620]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        <button className={btn} onClick={() => eng.prev()} aria-label="Anterior"><SkipBack size={14} /></button>
        <button className={btn} onClick={() => { eng.unlock(); eng.toggle(); }} aria-label={state.playing ? "Pausar" : "Reproducir"}>
          {state.playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className={btn} onClick={() => eng.next()} aria-label="Siguiente"><SkipForward size={14} /></button>
      </div>

      {state.needsGesture && !open && (
        <div className="mt-1 rounded-md bg-black/80 px-2 py-1 text-[11px] text-white/80">Toca para activar la música</div>
      )}

      {/* Panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[min(92vw,360px)] rounded-2xl border border-white/10 bg-[#10101c]/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold"><Music size={15} className="text-[#ff9620]" /> MUSIC</div>
            <button className={btn} onClick={() => setOpen(false)} aria-label="Cerrar"><X size={14} /></button>
          </div>

          {/* Reproducción */}
          <div className="mb-2 rounded-xl bg-white/5 p-2">
            <div className="truncate text-sm font-semibold">{state.title || "Sin canción seleccionada"}</div>
            <input
              type="range" min="0" max="1" step="0.001" value={progress}
              onChange={(e) => eng.seek(parseFloat(e.target.value))}
              className="mt-1 w-full accent-[#ff9620]" aria-label="Progreso"
            />
            <div className="flex justify-between text-[10px] text-white/50"><span>{fmt(state.time)}</span><span>{fmt(state.duration)}</span></div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <button className={btn} onClick={() => eng.updateSettings({ muted: !s.muted })} aria-label="Silenciar">
                {s.muted || s.volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.01" value={s.volume}
                onChange={(e) => eng.updateSettings({ volume: parseFloat(e.target.value), muted: false })}
                className="w-full accent-[#ff9620]" aria-label="Volumen"
              />
              <button className={btn} onClick={() => eng.updateSettings({ shuffle: !s.shuffle })} aria-label="Aleatorio" style={s.shuffle ? { background: "#ff9620", color: "#000" } : undefined}>
                <Shuffle size={14} />
              </button>
              <button
                className={btn} aria-label="Repetir"
                onClick={() => eng.updateSettings({ repeat: s.repeat === "all" ? "one" : s.repeat === "one" ? "off" : "all" })}
                style={s.repeat !== "off" ? { background: "#ff9620", color: "#000" } : undefined}
              >
                {s.repeat === "one" ? <Repeat1 size={14} /> : <Repeat size={14} />}
              </button>
            </div>
          </div>

          {state.error && <div className="mb-2 rounded-md bg-red-500/15 px-2 py-1 text-[11px] text-red-300">{state.error}</div>}
          {notice && <div className="mb-2 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/80">{notice}</div>}

          {/* Pestañas */}
          <div className="mb-2 flex gap-1">
            <button className={chip(tab === "songs")} onClick={() => setTab("songs")}>Canciones</button>
            <button className={chip(tab === "lists")} onClick={() => setTab("lists")}><ListMusic size={11} className="mr-1 inline" />Playlists</button>
            <button className={chip(tab === "settings")} onClick={() => setTab("settings")}><SettingsIcon size={11} className="mr-1 inline" />Music Settings</button>
          </div>

          <div className="max-h-56 overflow-y-auto pr-1">
            {tab === "songs" && (
              <div className="space-y-1">
                <button disabled={busy} onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff9620] px-3 py-2 text-xs font-bold text-black disabled:opacity-60">
                  <Upload size={13} /> {busy ? "Importando…" : "Importar canciones (MP3 / WAV / OGG)"}
                </button>
                <p className="text-[10px] text-white/40">Se guardan solo en este navegador. No se suben a ningún servidor.</p>
                {library.length === 0 && <p className="py-2 text-center text-xs text-white/50">Aún no importaste canciones.</p>}
                {library.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
                    <button className="min-w-0 flex-1 truncate text-left text-xs hover:text-[#ff9620]" onClick={() => eng.startPlaylist("", t.id)}>
                      {state.trackId === t.id ? "▶ " : ""}{t.name}
                    </button>
                    {playlists.length > 0 && (
                      <select
                        className="max-w-[84px] rounded bg-white/10 px-1 py-0.5 text-[10px]" value=""
                        onChange={(e) => { if (e.target.value) { addTracksToPlaylist(e.target.value, [t.id]); refresh(); } }}
                        aria-label="Agregar a playlist"
                      >
                        <option value="">+ lista</option>
                        {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    <button className="p-1 text-white/50 hover:text-red-400" aria-label="Eliminar" onClick={async () => { await removeTrack(t.id); eng.refreshData(); refresh(); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "lists" && (
              <div className="space-y-2">
                <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                  onClick={() => {
                    const name = window.prompt("Nombre de la playlist (ej.: Main Menu, Combat, Boss Battle, Chill)");
                    if (name) { const r = createPlaylist(name); setActivePl(r.playlist.id); refresh(); }
                  }}>
                  <Plus size={13} /> Nueva playlist
                </button>
                {playlists.length === 0 && <p className="py-2 text-center text-xs text-white/50">Crea una playlist y añade canciones.</p>}
                {playlists.map((p) => (
                  <div key={p.id} className="rounded-lg bg-white/5 p-2">
                    <div className="flex items-center gap-1">
                      <button className="min-w-0 flex-1 truncate text-left text-xs font-bold" onClick={() => setActivePl(activePl === p.id ? "" : p.id)}>{p.name} <span className="font-normal text-white/40">({p.trackIds.length})</span></button>
                      <button className={btn} aria-label="Reproducir playlist" onClick={() => eng.startPlaylist(p.id)}><Play size={12} /></button>
                      <button className="p-1 text-white/50 hover:text-white" aria-label="Renombrar" onClick={() => { const n = window.prompt("Nuevo nombre", p.name); if (n) { renamePlaylist(p.id, n); refresh(); } }}>✎</button>
                      <button className="p-1 text-white/50 hover:text-red-400" aria-label="Eliminar playlist" onClick={() => { deletePlaylist(p.id); eng.settings = loadSettings(); eng.patch({}); refresh(); }}><Trash2 size={12} /></button>
                    </div>
                    {activePl === p.id && (
                      <div className="mt-1 space-y-1">
                        {p.trackIds.length === 0 && <p className="text-[11px] text-white/40">Vacía. Añade desde “Canciones” (+ lista) o importa con esta playlist abierta.</p>}
                        {p.trackIds.map((id, i) => {
                          const t = library.find((x) => x.id === id);
                          if (!t) return null;
                          return (
                            <div key={id} className="flex items-center gap-1 text-[11px]">
                              <button className="min-w-0 flex-1 truncate text-left hover:text-[#ff9620]" onClick={() => eng.startPlaylist(p.id, id)}>{i + 1}. {t.name}</button>
                              <button className="p-0.5 text-white/50 hover:text-white" aria-label="Subir" onClick={() => { moveTrackInPlaylist(p.id, id, -1); refresh(); }}><ArrowUp size={11} /></button>
                              <button className="p-0.5 text-white/50 hover:text-white" aria-label="Bajar" onClick={() => { moveTrackInPlaylist(p.id, id, 1); refresh(); }}><ArrowDown size={11} /></button>
                              <button className="p-0.5 text-white/50 hover:text-red-400" aria-label="Quitar" onClick={() => { removeTrackFromPlaylist(p.id, id); refresh(); }}><X size={11} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "settings" && (
              <div className="space-y-2 text-xs">
                <Row label="Música activada"><Toggle on={s.enabled} onChange={(v) => eng.updateSettings({ enabled: v })} /></Row>
                <Row label="Reproducción aleatoria"><Toggle on={s.shuffle} onChange={(v) => eng.updateSettings({ shuffle: v })} /></Row>
                <Row label="Repetición">
                  <select className="rounded bg-white/10 px-1 py-0.5" value={s.repeat} onChange={(e) => eng.updateSettings({ repeat: e.target.value })}>
                    <option value="all">Toda la playlist</option><option value="one">Una canción</option><option value="off">Sin repetir</option>
                  </select>
                </Row>
                <Row label="Seguir sonando al cambiar de pantalla"><Toggle on={s.keepAcrossScreens} onChange={(v) => eng.updateSettings({ keepAcrossScreens: v })} /></Row>
                <Row label="Playlist del menú">
                  <PlSelect value={s.assign.menu} playlists={playlists} onChange={(v) => eng.updateSettings({ assign: { menu: v } })} />
                </Row>
                <Row label="Playlist de combate">
                  <PlSelect value={s.assign.combat} playlists={playlists} onChange={(v) => eng.updateSettings({ assign: { combat: v } })} />
                </Row>
                <p className="text-[10px] text-white/40">Si hay música de sala (YouTube) activa en un combate, esa tiene prioridad y la tuya se pausa para no mezclarse.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5"><span>{label}</span>{children}</div>;
}
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} className={`h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-[#ff9620]" : "bg-white/20"}`} aria-pressed={on}>
      <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}
function PlSelect({ value, playlists, onChange }) {
  return (
    <select className="max-w-[130px] rounded bg-white/10 px-1 py-0.5" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">— ninguna —</option>
      {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

// Si el reproductor falla por cualquier motivo, NUNCA debe tumbar el juego: se oculta y ya.
class MusicBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    try { console.error("[MusicPlayer] desactivado por error:", error); } catch {}
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MusicPlayer(props) {
  return (
    <MusicBoundary>
      <MusicPlayerInner {...props} />
    </MusicBoundary>
  );
}
