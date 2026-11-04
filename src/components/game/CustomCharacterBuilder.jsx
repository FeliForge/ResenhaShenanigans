// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, Check, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { imageFileToDataUrl } from "@/lib/game/files";
import { CHARACTERS, MOVE_KEYS } from "@/data/characters";

const CATS = ["m1", "special1", "special2", "special3", "ultimate"];
const CAT_LABELS = { m1: "Básico (M1)", special1: "Especial 1", special2: "Especial 2", special3: "Especial 3", ultimate: "Ultimate" };
const MOVES_BY_CAT = Object.fromEntries(
  CATS.map((cat) => [cat, CHARACTERS.map((c) => ({ ...c.moves[cat], charName: c.displayName }))])
);

export default function CustomCharacterBuilder({ onConfirm, onCancel }) {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("Mi luchador");
  const [picks, setPicks] = useState({ m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0 });

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sube un archivo de imagen"); return; }
    setUploading(true);
    try {
      const file_url = await imageFileToDataUrl(file);
      setImage(file_url);
    } catch {
      toast.error("No se pudo subir la imagen");
    }
    setUploading(false);
  }

  function confirm() {
    const moves = {};
    for (const cat of CATS) moves[cat] = MOVES_BY_CAT[cat][picks[cat]];
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
  }

  const ready = !!image && !uploading;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onCancel} className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent">
          <ChevronLeft size={18} /> Atrás
        </button>
        <h1 className="font-heading text-lg font-bold tracking-tight">Personaje personalizado</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 lg:flex-row">
        {/* Imagen */}
        <div className="flex flex-col gap-3 lg:w-72">
          <h3 className="text-sm font-semibold text-muted-foreground">Imagen del personaje</h3>
          <label className="relative flex h-72 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-card transition hover:border-primary">
            {image ? (
              <img src={image} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus size={36} />
                <span className="text-sm">{uploading ? "Subiendo..." : "Haz clic para subir una imagen"}</span>
                <span className="text-xs">PNG / JPG · se guarda solo en este dispositivo</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
          {image && (
            <button onClick={() => setImage(null)} className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              <Upload size={14} /> Cambiar imagen
            </button>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Vida" value={1000} />
            <Stat label="Velocidad" value={7.5} />
            <Stat label="Salto" value={11} />
            <Stat label="Peso" value={1.0} />
          </div>
        </div>

        {/* Moveset */}
        <div className="flex flex-1 flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Elige 5 movimientos (uno por categoría)</h3>
          {CATS.map((cat) => {
            const move = MOVES_BY_CAT[cat][picks[cat]];
            return (
              <div key={cat} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{CAT_LABELS[cat]}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Tecla: {MOVE_KEYS[cat]}</span>
                </div>
                <select
                  value={picks[cat]}
                  onChange={(e) => setPicks((p) => ({ ...p, [cat]: Number(e.target.value) }))}
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

          <button
            onClick={confirm}
            disabled={!ready}
            className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Check size={18} /> {ready ? "Confirmar y entrar a la arena" : "Sube una imagen para continuar"}
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