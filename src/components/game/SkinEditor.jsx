// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Check, Shuffle, Palette } from "lucide-react";
import { CHARACTERS } from "@/data/characters";
import { makeCharacterTexture } from "@/lib/gameTexture";

const PARTS = [
  { key: "primary", label: "Torso / Cabeza" },
  { key: "secondary", label: "Brazos / Piernas" },
  { key: "accent", label: "Detalles / Visera" },
];

export default function SkinEditor({ onConfirm, onCancel }) {
  const [baseId, setBaseId] = useState(CHARACTERS[0].id);
  const [colors, setColors] = useState({ ...CHARACTERS[0].colors });
  const [name, setName] = useState(CHARACTERS[0].displayName);
  const [previewUrl, setPreviewUrl] = useState("");
  const base = CHARACTERS.find((c) => c.id === baseId);

  useEffect(() => {
    const tex = makeCharacterTexture({ ...base, colors });
    setPreviewUrl(tex.image.toDataURL());
  }, [colors, baseId, base]);

  function pickBase(c) {
    setBaseId(c.id);
    setColors({ ...c.colors });
    setName(c.displayName);
  }

  function randomize() {
    const rand = () => "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    setColors({ primary: rand(), secondary: rand(), accent: rand() });
  }

  function confirm() {
    onConfirm({
      ...base,
      id: base.id + "-skin-" + Date.now(),
      baseId: base.id,
      displayName: name.trim() || base.displayName,
      colors: { ...colors },
    });
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onCancel} className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent">
          <ChevronLeft size={18} /> Atrás
        </button>
        <h1 className="font-heading text-lg font-bold tracking-tight">Personalizar skin</h1>
        <Palette size={18} className="text-accent" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 lg:flex-row">
        {/* Vista previa + nombre */}
        <div className="flex flex-col gap-3 lg:w-72">
          <h3 className="text-sm font-semibold text-muted-foreground">Vista previa</h3>
          <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,#1a1a2e,#16213e)]">
            {previewUrl && <img src={previewUrl} alt="preview" className="h-full w-full object-contain" />}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={randomize}
            className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            <Shuffle size={14} /> Colores aleatorios
          </button>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Vida" value={base.stats.health} />
            <Stat label="Velocidad" value={base.stats.speed} />
            <Stat label="Salto" value={base.stats.jumpForce} />
            <Stat label="Peso" value={base.stats.weight} />
          </div>
        </div>

        {/* Base + colores */}
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Personaje base (skin)</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHARACTERS.map((c) => {
                const active = c.id === baseId;
                return (
                  <button
                    key={c.id}
                    onClick={() => pickBase(c)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${active ? "border-primary bg-accent" : "border-border hover:bg-accent/60"}`}
                  >
                    <span className="h-7 w-7 shrink-0 rounded" style={{ background: `linear-gradient(135deg, ${c.colors.primary}, ${c.colors.secondary})`, boxShadow: `inset 0 0 0 2px ${c.colors.accent}` }} />
                    <span className="truncate text-xs font-semibold">{c.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Color de armadura por partes</h3>
            <div className="flex flex-col gap-3">
              {PARTS.map((p) => (
                <div key={p.key} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span
                    className="h-10 w-10 shrink-0 rounded-md border border-border"
                    style={{ background: colors[p.key], boxShadow: `0 0 10px ${colors[p.key]}66` }}
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
          </div>

          <button
            onClick={confirm}
            className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
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