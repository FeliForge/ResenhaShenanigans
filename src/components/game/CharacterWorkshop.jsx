// @ts-nocheck
import { useEffect, useState } from "react";
import { ChevronLeft, Check, ImagePlus, Palette, Shuffle, Upload } from "lucide-react";
import { toast } from "sonner";
import { CHARACTERS, MOVE_KEYS } from "@/data/characters";
import { imageFileToDataUrl } from "@/lib/game/files";
import { makeCharacterTexture } from "@/lib/gameTexture";

const CATS = ["m1", "special1", "special2", "special3", "ultimate"];
const CAT_LABELS = {
  m1: "Primary Attack",
  special1: "Special Ability 1",
  special2: "Special Ability 2",
  special3: "Special Ability 3",
  ultimate: "Ultimate",
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
  { id: "appearance", label: "Appearance" },
  { id: "moveset", label: "Moveset" },
  { id: "ultimate", label: "Ultimate Preview" },
];

export default function CharacterWorkshop({ onConfirm, onCancel }) {
  const [tab, setTab] = useState("appearance");
  const [mode, setMode] = useState("skin"); // skin | image
  const [baseId, setBaseId] = useState(CHARACTERS[0].id);
  const [colors, setColors] = useState({ ...CHARACTERS[0].colors });
  const [name, setName] = useState(CHARACTERS[0].displayName);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [picks, setPicks] = useState({ m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0 });

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

  function confirm() {
    const moves = {};
    for (const cat of CATS) moves[cat] = MOVES_BY_CAT[cat][picks[cat]];

    if (mode === "image") {
      if (!image) {
        toast.error("Sube una imagen o cambia a Custom Skin");
        return;
      }
      onConfirm({
        id: "custom",
        name: "Custom",
        displayName: name.trim() || "Personalizado",
        bio: "Luchador personalizado con moveset a medida.",
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
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft size={18} /> Atrás
        </button>
        <h1 className="font-heading text-lg font-bold tracking-tight">Character Workshop</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-4 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "border border-b-0 border-border bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: character list */}
        <div className="border-b border-border p-3 lg:w-56 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Base
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {CHARACTERS.map((c) => {
              const active = c.id === baseId;
              return (
                <button
                  key={c.id}
                  onClick={() => pickBase(c)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${
                    active ? "border-primary bg-accent" : "border-border hover:bg-accent/60"
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

        {/* Center: preview */}
        <div className="flex flex-col items-center gap-3 border-b border-border p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <h3 className="w-full text-sm font-semibold text-muted-foreground">Vista previa</h3>
          <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,#1a1a2e,#16213e)]">
            {mode === "image" && image ? (
              <img src={image} alt="preview" className="h-full w-full object-contain" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">Sin vista previa</span>
            )}
          </div>
          <div className="w-full">
            <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 text-xs">
            <Stat label="Vida" value={base.stats.health} />
            <Stat label="Velocidad" value={base.stats.speed} />
            <Stat label="Salto" value={base.stats.jumpForce} />
            <Stat label="Peso" value={base.stats.weight} />
          </div>
        </div>

        {/* Right: options by tab */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          {tab === "appearance" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("skin")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    mode === "skin" ? "border-primary bg-accent" : "border-border hover:bg-accent/60"
                  }`}
                >
                  <Palette size={16} /> Custom Skin
                </button>
                <button
                  onClick={() => setMode("image")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    mode === "image" ? "border-primary bg-accent" : "border-border hover:bg-accent/60"
                  }`}
                >
                  <ImagePlus size={16} /> Image Customization
                </button>
              </div>

              {mode === "skin" && (
                <>
                  <div className="flex flex-col gap-3">
                    {PARTS.map((p) => (
                      <div
                        key={p.key}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <span
                          className="h-10 w-10 shrink-0 rounded-md border border-border"
                          style={{
                            background: colors[p.key],
                            boxShadow: `0 0 10px ${colors[p.key]}66`,
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{p.label}</div>
                          <div className="font-mono text-xs text-muted-foreground">{colors[p.key]}</div>
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
                    className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Shuffle size={14} /> Colores aleatorios
                  </button>
                </>
              )}

              {mode === "image" && (
                <div className="flex flex-col gap-3">
                  <label className="relative flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-card transition hover:border-primary">
                    {image ? (
                      <img src={image} alt="upload" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus size={32} />
                        <span className="text-sm">
                          {uploading ? "Subiendo..." : "Haz clic para subir imagen"}
                        </span>
                        <span className="text-xs">PNG / JPG · solo en este dispositivo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={onFile} className="hidden" />
                  </label>
                  {image && (
                    <button
                      onClick={() => setImage(null)}
                      className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
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
              <p className="text-sm text-muted-foreground">
                Elige un movimiento por categoría. El moveset es independiente del personaje base.
              </p>
              {CATS.map((cat) => {
                const move = MOVES_BY_CAT[cat][picks[cat]];
                return (
                  <div key={cat} className="rounded-lg border border-border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">{CAT_LABELS[cat]}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Tecla: {MOVE_KEYS[cat]}
                      </span>
                    </div>
                    <select
                      value={picks[cat]}
                      onChange={(e) =>
                        setPicks((p) => ({ ...p, [cat]: Number(e.target.value) }))
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {MOVES_BY_CAT[cat].map((m, i) => (
                        <option key={m.id} value={i}>
                          {m.charName} — {m.name} ({m.damage} dmg)
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">{move.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "ultimate" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
                  Ultimate equipado
                </div>
                <h3 className="font-heading text-xl font-bold">{ultMove.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{ultMove.desc}</p>
                <div className="mt-3 flex gap-3 text-xs">
                  <span className="rounded bg-muted px-2 py-1">
                    Daño: <strong>{ultMove.damage}</strong>
                  </span>
                  <span className="rounded bg-muted px-2 py-1">
                    Origen: <strong>{ultMove.charName}</strong>
                  </span>
                  <span className="rounded bg-muted px-2 py-1">
                    Tecla: <strong>{MOVE_KEYS.ultimate}</strong>
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                La cinemática cinematográfica del Ultimate se activará en combate cuando el medidor
                esté lleno. Cambia el Ultimate en la pestaña Moveset.
              </p>
            </div>
          )}

          <button
            onClick={confirm}
            disabled={mode === "image" && !image}
            className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Check size={18} /> Confirmar y entrar a la arena
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-base font-bold">{value}</div>
    </div>
  );
}
