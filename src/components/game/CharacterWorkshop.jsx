// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Check,
  ImagePlus,
  Palette,
  Shuffle,
  Upload,
  Sparkles,
  Crosshair,
} from "lucide-react";
import { toast } from "sonner";
import { CHARACTERS, MOVE_KEYS } from "@/data/characters";
import { imageFileToDataUrl } from "@/lib/game/files";
import { makeCharacterTexture } from "@/lib/gameTexture";
import {
  ATTACK_SPRITE_PRESETS,
  DEFAULT_ATTACK_SPRITES,
  MOVE_CAT_UI,
  makeAttackSpriteCanvas,
} from "@/lib/game/attackSprites";

const CATS = ["m1", "special1", "special2", "special3", "ultimate"];
const CAT_LABELS = {
  m1: "M1 · Ataque básico",
  special1: "M2 · Especial 1",
  special2: "M3 · Especial 2",
  special3: "M4 · Especial 3",
  ultimate: "ULT · Ultimate",
};
const MOVES_BY_CAT = Object.fromEntries(
  CATS.map((cat) => [cat, CHARACTERS.map((c) => ({ ...c.moves[cat], charName: c.displayName }))])
);

const PARTS = [
  { key: "primary", label: "Torso / Cabeza" },
  { key: "secondary", label: "Brazos / Piernas" },
  { key: "accent", label: "Detalles / Visera" },
];

const TABS = [
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "moveset", label: "Moveset", icon: Crosshair },
  { id: "sprites", label: "Sprites FX", icon: Sparkles },
  { id: "ultimate", label: "Ultimate", icon: Sparkles },
];

export default function CharacterWorkshop({ onConfirm, onCancel }) {
  const [tab, setTab] = useState("appearance");
  const [mode, setMode] = useState("skin");
  const [baseId, setBaseId] = useState(CHARACTERS[0].id);
  const [colors, setColors] = useState({ ...CHARACTERS[0].colors });
  const [name, setName] = useState(CHARACTERS[0].displayName);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [picks, setPicks] = useState({ m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0 });
  const [sprites, setSprites] = useState({ ...DEFAULT_ATTACK_SPRITES });
  const [spritePreview, setSpritePreview] = useState({});
  const [customFx, setCustomFx] = useState({});
  const [fxUploading, setFxUploading] = useState(null);

  const base = CHARACTERS.find((c) => c.id === baseId) || CHARACTERS[0];

  useEffect(() => {
    if (mode !== "skin") return;
    try {
      const tex = makeCharacterTexture({ ...base, colors });
      setPreviewUrl(tex.image.toDataURL());
    } catch {
      setPreviewUrl("");
    }
  }, [mode, colors, baseId, base]);

  useEffect(() => {
    const next = {};
    for (const cat of CATS) {
      const id = sprites[cat] || DEFAULT_ATTACK_SPRITES[cat] || "slash";
      try {
        if (customFx[cat]) { next[cat] = customFx[cat]; continue; }
        const canvas = makeAttackSpriteCanvas(id, colors.accent || "#ffffff");
        next[cat] = canvas ? canvas.toDataURL() : "";
      } catch {
        next[cat] = "";
      }
    }
    setSpritePreview(next);
  }, [sprites, colors.accent, customFx]);

  function pickBase(c) {
    setBaseId(c.id);
    setColors({ ...c.colors });
    if (!name || name === base.displayName) setName(c.displayName);
  }

  function randomize() {
    const rand = () => "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    setColors({ primary: rand(), secondary: rand(), accent: rand() });
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sube un archivo de imagen");
      return;
    }
    setUploading(true);
    try {
      const url = await imageFileToDataUrl(file);
      setImage(url);
      setMode("image");
    } catch {
      toast.error("No se pudo cargar la imagen");
    }
    setUploading(false);
  }

  async function onFxFile(cat, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecciona una imagen PNG, JPG o WebP"); return; }
    if (file.size > 512 * 1024) { toast.error("La imagen debe pesar 512 KB o menos"); return; }
    setFxUploading(cat);
    try {
      const dataUrl = await imageFileToDataUrl(file);
      setCustomFx((prev) => ({ ...prev, [cat]: dataUrl }));
      toast.success("Sprite FX personalizado cargado");
    } catch { toast.error("No se pudo cargar el Sprite FX"); }
    finally { setFxUploading(null); }
  }

  function buildMoves() {
    const moves = {};
    for (const cat of CATS) {
      const src = MOVES_BY_CAT[cat][picks[cat]];
      moves[cat] = {
        ...src,
        attackSprite: customFx[cat] || sprites[cat] || DEFAULT_ATTACK_SPRITES[cat] || "slash",
        attackSpriteDuration: cat === "ultimate" ? 0.42 : 0.22,
      };
    }
    return moves;
  }

  function confirm() {
    const moves = buildMoves();

    if (mode === "image") {
      if (!image) {
        toast.error("Sube una imagen o cambia a Custom Skin");
        return;
      }
      onConfirm({
        id: "custom",
        name: "Custom",
        displayName: name.trim() || "Personalizado",
        bio: "Luchador personalizado con moveset y sprites a medida.",
        colors: { primary: "#00e5ff", secondary: "#d500f9", accent: "#ffea00" },
        stats: { health: 1000, speed: 7.5, jumpForce: 11, weight: 1.0 },
        moves,
        customImage: image,
      });
      return;
    }

    onConfirm({
      ...base,
      id: base.id + "-skin-" + Date.now(),
      baseId: base.id,
      displayName: name.trim() || base.displayName,
      colors: { ...colors },
      moves,
    });
  }

  const ultMove = MOVES_BY_CAT.ultimate[picks.ultimate];

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#080b15] text-white">
      <header className="relative flex items-center gap-3 border-b border-cyan-300/15 bg-gradient-to-r from-[#151d30] via-[#101827] to-[#21162c] px-4 py-4 shadow-lg shadow-black/20 backdrop-blur-xl">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={18} /> Atrás
        </button>
        <div className="min-w-0"><h1 className="font-heading text-lg font-black uppercase tracking-[0.08em] text-white sm:text-xl">Character Workshop</h1><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/55">Create · Customize · Battle</p></div>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#0d1320] px-3 pt-2 scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? "border border-b-0 border-cyan-300/30 bg-gradient-to-b from-cyan-300/15 to-white/[0.04] text-cyan-100 shadow-[0_-4px_22px_rgba(34,211,238,0.08)]"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.07),transparent_48%)] lg:flex-row">
        <div className="border-b border-white/10 bg-black/15 p-3 lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">Base</p>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {CHARACTERS.map((c) => {
              const active = c.id === baseId;
              return (
                <button
                  key={c.id}
                  onClick={() => pickBase(c)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${
                    active ? "border-white/35 bg-white/10" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded"
                    style={{
                      background: `linear-gradient(135deg, ${c.colors.primary}, ${c.colors.secondary})`,
                      boxShadow: `inset 0 0 0 2px ${c.colors.accent}`,
                    }}
                  />
                  <span className="truncate text-xs font-semibold">{c.displayName}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 border-b border-white/10 bg-gradient-to-b from-[#111d30] to-[#0b101b] p-4 lg:w-80 lg:border-b-0 lg:border-r">
          <h3 className="w-full text-xs font-bold uppercase tracking-wider text-white/40">Vista previa</h3>
          <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-cyan-200/20 bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,0.22),transparent_48%),linear-gradient(145deg,#1b2940,#101522_65%,#21152d)] shadow-[inset_0_0_35px_rgba(0,0,0,0.35),0_15px_40px_rgba(0,0,0,0.2)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] before:bg-[size:22px_22px]">
            {mode === "image" && image ? (
              <img src={image} alt="preview" className="h-full w-full object-contain" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-white/40">Sin vista previa</span>
            )}
          </div>
          <div className="w-full">
            <label className="text-[11px] font-semibold text-white/45">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 text-xs">
            <MiniStat label="Vida" value={base.stats.health} />
            <MiniStat label="Velocidad" value={base.stats.speed} />
            <MiniStat label="Salto" value={base.stats.jumpForce} />
            <MiniStat label="Peso" value={base.stats.weight} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0b101b]/80 p-4 sm:p-5">
          {tab === "appearance" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("skin")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    mode === "skin" ? "border-white/35 bg-white/10" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <Palette size={16} /> Custom Skin
                </button>
                <button
                  onClick={() => setMode("image")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    mode === "image" ? "border-white/35 bg-white/10" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <ImagePlus size={16} /> Imagen
                </button>
              </div>

              {mode === "skin" && (
                <>
                  <div className="flex flex-col gap-2.5">
                    {PARTS.map((p) => (
                      <div
                        key={p.key}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                      >
                        <span
                          className="h-10 w-10 shrink-0 rounded-lg border border-white/15"
                          style={{
                            background: colors[p.key],
                            boxShadow: `0 0 12px ${colors[p.key]}66`,
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{p.label}</div>
                          <div className="font-mono text-xs text-white/40">{colors[p.key]}</div>
                        </div>
                        <input
                          type="color"
                          value={colors[p.key]}
                          onChange={(e) => setColors((s) => ({ ...s, [p.key]: e.target.value }))}
                          className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={randomize}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                  >
                    <Shuffle size={14} /> Colores aleatorios
                  </button>
                </>
              )}

              {mode === "image" && (
                <div className="flex flex-col gap-3">
                  <label className="relative flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] transition hover:border-white/40">
                    {image ? (
                      <img src={image} alt="upload" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-white/50">
                        <ImagePlus size={32} />
                        <span className="text-sm">{uploading ? "Subiendo..." : "Haz clic para subir imagen"}</span>
                        <span className="text-xs">PNG / JPG · solo en este dispositivo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={onFile} className="hidden" />
                  </label>
                  {image && (
                    <button
                      onClick={() => setImage(null)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <Upload size={14} /> Cambiar / eliminar imagen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "moveset" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-white/50">
                Elige un movimiento por categoría. El moveset es independiente del personaje base.
              </p>
              {CATS.map((cat) => {
                const move = MOVES_BY_CAT[cat][picks[cat]];
                return (
                  <div key={cat} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">{CAT_LABELS[cat]}</span>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">
                        Tecla: {MOVE_KEYS[cat]}
                      </span>
                    </div>
                    <select
                      value={picks[cat]}
                      onChange={(e) => setPicks((p) => ({ ...p, [cat]: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-white/15 bg-[#12131a] px-3 py-2 text-sm outline-none focus:border-white/40"
                    >
                      {MOVES_BY_CAT[cat].map((m, i) => (
                        <option key={m.id} value={i}>
                          {m.charName} — {m.name} ({m.damage} dmg)
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-white/45">{move.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "sprites" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/50">
                Sprite de ataque corto (≈0.2s) que aparece al lanzar cada movimiento. Elige un preset por
                categoría — se tiñe con el color de acento del personaje.
              </p>
              {MOVE_CAT_UI.map(({ id: cat, short, label }) => (
                <div key={cat} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-white/70">
                      {short}
                    </span>
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <div className="mb-2 flex items-center gap-3">
                    {spritePreview[cat] ? (
                      <img
                        src={spritePreview[cat]}
                        alt={sprites[cat]}
                        className="h-14 w-14 rounded-lg border border-white/15 bg-black/40 object-contain"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg border border-white/15 bg-black/40" />
                    )}
                    <select
                      value={sprites[cat] || DEFAULT_ATTACK_SPRITES[cat]}
                      onChange={(e) => setSprites((s) => ({ ...s, [cat]: e.target.value }))}
                      className="flex-1 rounded-lg border border-white/15 bg-[#12131a] px-3 py-2 text-sm outline-none focus:border-white/40"
                    >
                      {ATTACK_SPRITE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} — {p.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20">
                      <Upload size={14} />
                      {fxUploading === cat ? "Cargando..." : customFx[cat] ? "Cambiar imagen FX" : "Subir mi imagen FX"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={fxUploading !== null} onChange={(e) => onFxFile(cat, e)} />
                    </label>
                    {customFx[cat] && <button type="button" onClick={() => setCustomFx((prev) => { const next = { ...prev }; delete next[cat]; return next; })} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/10">Usar preset</button>}
                    {customFx[cat] && <span className="text-[10px] font-semibold text-emerald-300">Imagen personalizada</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ATTACK_SPRITE_PRESETS.map((p) => {
                      const active = (sprites[cat] || DEFAULT_ATTACK_SPRITES[cat]) === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSprites((s) => ({ ...s, [cat]: p.id }))}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                            active
                              ? "bg-white text-black"
                              : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "ultimate" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-500/15 to-fuchsia-500/10 p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Ultimate equipado
                </div>
                <h3 className="font-heading text-xl font-bold">{ultMove.name}</h3>
                <p className="mt-1 text-sm text-white/55">{ultMove.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    Daño: <strong>{ultMove.damage}</strong>
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    Origen: <strong>{ultMove.charName}</strong>
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    Tecla: <strong>{MOVE_KEYS.ultimate}</strong>
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    Sprite: <strong>{sprites.ultimate || DEFAULT_ATTACK_SPRITES.ultimate}</strong>
                  </span>
                </div>
              </div>
              <p className="text-sm text-white/50">
                La cinemática del Ultimate se activa en combate cuando el medidor está lleno. Cambia el
                movimiento en Moveset y el FX en Sprites FX.
              </p>
            </div>
          )}

          <button
            onClick={confirm}
            disabled={mode === "image" && !image}
            className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 px-4 py-3.5 font-black uppercase tracking-[0.08em] text-[#07111d] shadow-[0_10px_35px_rgba(34,211,238,0.18)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-40"
          >
            <Check size={18} /> Confirmar y entrar a la arena
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
      <div className="text-[10px] text-white/40">{label}</div>
      <div className="font-heading text-sm font-bold">{value}</div>
    </div>
  );
}
