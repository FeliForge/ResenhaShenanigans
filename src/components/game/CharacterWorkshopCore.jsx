// @ts-nocheck
// Core workshop — prebuild may overwrite with full version from history if this is stub.
import { useEffect, useState } from "react";
import { ChevronLeft, Check, ImagePlus, Palette, Shuffle, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { CHARACTERS, MOVE_KEYS } from "@/data/characters";
import { imageFileToDataUrl, resolveImageUrl } from "@/lib/game/files";
import { makeCharacterTexture } from "@/lib/gameTexture";

const CATS = ["m1", "special1", "special2", "special3", "ultimate"];
const CAT_LABELS = {
  m1: "Ataque básico",
  special1: "Especial 1",
  special2: "Especial 2",
  special3: "Especial 3",
  ultimate: "Ultimate",
};
const MOVES_BY_CAT = Object.fromEntries(
  CATS.map((cat) => [cat, CHARACTERS.map((c) => ({ ...c.moves[cat], charName: c.displayName }))])
);

const PARTS = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
];

export default function CharacterWorkshopCore({ onConfirm, onBack }) {
  const [tab, setTab] = useState("appearance");
  const [mode, setMode] = useState("skin");
  const [colors, setColors] = useState({ primary: "#00e5ff", secondary: "#d500f9", accent: "#ffea00" });
  const [displayName, setDisplayName] = useState("Custom");
  const [image, setImage] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [picks, setPicks] = useState({ m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0 });

  useEffect(() => {
    if (mode !== "skin") return;
    try {
      const tex = makeCharacterTexture({ colors, name: displayName });
      const img = tex?.image;
      if (img && img.toDataURL) setPreviewUrl(img.toDataURL());
    } catch {
      setPreviewUrl("");
    }
  }, [colors, mode, displayName]);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.gif$/i.test(file.name || "")) {
      toast.error("Sube imagen o GIF");
      return;
    }
    setUploading(true);
    try {
      setImage(await imageFileToDataUrl(file));
      setMode("image");
    } catch {
      toast.error("No se pudo cargar");
    }
    setUploading(false);
  }

  async function applyUrl() {
    try {
      setUploading(true);
      const u = await resolveImageUrl(urlInput.trim());
      setImage(u);
      setMode("image");
      setUrlInput("");
    } catch {
      toast.error("URL inválida o bloqueada por CORS");
    }
    setUploading(false);
  }

  function confirm() {
    const moves = {};
    for (const cat of CATS) {
      const list = MOVES_BY_CAT[cat];
      moves[cat] = { ...list[picks[cat]] };
      delete moves[cat].charName;
    }
    if (mode === "image") {
      if (!image) {
        toast.error("Sube imagen/GIF o pega URL");
        return;
      }
      onConfirm?.({
        id: "custom",
        name: "Custom",
        displayName: displayName.slice(0, 24) || "Custom",
        bio: "Personalizado",
        colors: { ...colors },
        stats: { health: 1000, speed: 7.5, jumpForce: 11, weight: 1 },
        customImage: image,
        moves,
      });
      return;
    }
    onConfirm?.({
      id: "custom",
      name: "Custom",
      displayName: displayName.slice(0, 24) || "Custom",
      bio: "Personalizado",
      colors: { ...colors },
      stats: { health: 1000, speed: 7.5, jumpForce: 11, weight: 1 },
      moves,
    });
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent">
          <ChevronLeft size={18} /> Atrás
        </button>
        <h1 className="font-heading text-lg font-bold">Character Workshop</h1>
        <div className="ml-auto flex gap-1 rounded-lg border border-border p-0.5 text-xs">
          {["appearance", "moveset", "ultimate"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 font-semibold ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {t === "appearance" ? "Apariencia" : t === "moveset" ? "Moveset" : "Ultimate"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col items-center justify-center border-b border-border bg-muted/20 p-6 md:border-b-0 md:border-r">
          <div className="relative h-48 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {mode === "image" && image ? (
              <img src={image} alt="preview" className="h-full w-full object-contain" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">…</div>
            )}
          </div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={24}
            className="mt-4 w-48 rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-bold outline-none focus:border-primary"
          />
        </div>

        <div className="overflow-y-auto p-4">
          {tab === "appearance" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("skin")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    mode === "skin" ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <Palette size={16} /> Skin
                </button>
                <button
                  onClick={() => setMode("image")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    mode === "image" ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <ImagePlus size={16} /> Image / GIF
                </button>
              </div>

              {mode === "skin" && (
                <div className="flex flex-col gap-3">
                  {PARTS.map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <input
                        type="color"
                        value={colors[key]}
                        onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                        className="h-9 w-16 cursor-pointer rounded border border-border"
                      />
                    </label>
                  ))}
                  <button
                    onClick={() => {
                      const r = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
                      setColors({ primary: r(), secondary: r(), accent: r() });
                    }}
                    className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <Shuffle size={14} /> Aleatorio
                  </button>
                </div>
              )}

              {mode === "image" && (
                <div className="flex flex-col gap-3">
                  <label className="flex cursor-pointer flex-col gap-2 rounded-lg border-2 border-dashed border-border p-4">
                    <div className="flex h-32 items-center justify-center overflow-hidden rounded bg-muted/40">
                      {image ? (
                        <img src={image} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{uploading ? "…" : "Subir PNG/JPG/GIF"}</span>
                      )}
                    </div>
                    <input type="file" accept="image/*,.gif,image/gif" onChange={onFile} className="hidden" />
                  </label>
                  <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Link2 size={12} /> URL de imagen / GIF
                    </label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://…/skin.gif"
                      className="rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                      onKeyDown={(e) => e.key === "Enter" && applyUrl()}
                    />
                    <button
                      type="button"
                      disabled={!urlInput.trim() || uploading}
                      onClick={applyUrl}
                      className="rounded bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
                    >
                      Usar URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "moveset" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Cada movimiento tiene tipo real: melee, proyectil, pared, trampa, beam, dash, nova…
              </p>
              {CATS.map((cat) => {
                const move = MOVES_BY_CAT[cat][picks[cat]];
                return (
                  <div key={cat} className="rounded-lg border border-border p-3">
                    <div className="mb-1 flex justify-between text-sm font-bold">
                      <span>{CAT_LABELS[cat]}</span>
                      <span className="text-xs text-muted-foreground">{move?.charName}</span>
                    </div>
                    <div className="text-xs font-semibold text-primary">{move?.name}</div>
                    <p className="mb-2 text-xs text-muted-foreground">{move?.desc}</p>
                    <input
                      type="range"
                      min={0}
                      max={MOVES_BY_CAT[cat].length - 1}
                      value={picks[cat]}
                      onChange={(e) => setPicks({ ...picks, [cat]: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {tab === "ultimate" && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-lg font-bold">{MOVES_BY_CAT.ultimate[picks.ultimate]?.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{MOVES_BY_CAT.ultimate[picks.ultimate]?.desc}</p>
            </div>
          )}

          <button
            onClick={confirm}
            disabled={mode === "image" && !image}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Check size={18} /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
