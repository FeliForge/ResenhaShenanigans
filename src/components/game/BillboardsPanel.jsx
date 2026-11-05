// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, ImagePlus, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { imageFileToDataUrl, resolveImageUrl, isValidImageUrl } from "@/lib/game/files";
import { useI18n } from "@/lib/i18n";

// Billboards: imagen equipada (archivo, URL o GIF) se guarda en el perfil
// y se sincroniza con la sala.
export default function BillboardsPanel({ url, onSave, onClose }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(url || "");
  const [urlInput, setUrlInput] = useState("");

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.gif$/i.test(file.name || "")) {
      toast.error(t("billboards.notImage") || "No es una imagen");
      return;
    }
    setBusy(true);
    try {
      const file_url = await imageFileToDataUrl(file);
      setPreview(file_url);
      await onSave(file_url);
      toast.success(t("billboards.done") || "Imagen guardada");
    } catch {
      toast.error(t("billboards.error") || "Error al cargar");
    }
    setBusy(false);
  }

  async function onUrlSave() {
    const raw = urlInput.trim();
    if (!raw) return;
    if (!isValidImageUrl(raw)) {
      toast.error("URL inválida (usa http/https o data:image)");
      return;
    }
    setBusy(true);
    try {
      const resolved = await resolveImageUrl(raw);
      setPreview(resolved);
      await onSave(resolved);
      toast.success(t("billboards.done") || "Imagen guardada");
      setUrlInput("");
    } catch {
      toast.error("No se pudo cargar la URL (CORS o enlace roto)");
    }
    setBusy(false);
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col bg-background/95 text-foreground backdrop-blur">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft size={18} /> {t("common.back") || "Atrás"}
        </button>
        <h1 className="font-heading text-lg font-bold tracking-tight">{t("billboards.title") || "Billboards"}</h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t("billboards.subtitle") || "PNG, JPG o GIF · archivo o URL"}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col gap-2 rounded-lg border-2 border-dashed border-border bg-card p-3 transition hover:border-primary">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("billboards.equipped") || "Imagen equipada"}</span>
            {busy && <span className="text-xs text-muted-foreground">{t("billboards.uploading") || "..."}</span>}
          </div>
          <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-md bg-muted/40">
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus size={28} />
                <span className="text-xs">{t("billboards.clickUpload") || "Subir imagen / GIF"}</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*,.gif,image/gif" onChange={onFile} className="hidden" />
          <span className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <Upload size={12} /> {preview ? (t("billboards.change") || "Cambiar") : (t("billboards.upload") || "Subir")}
          </span>
        </label>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link2 size={16} /> Pegar URL de imagen / GIF
          </div>
          <p className="text-xs text-muted-foreground">
            Acepta enlaces directos (https://…/foto.png o .gif). Si el servidor bloquea CORS, sube el archivo.
          </p>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://ejemplo.com/imagen.gif"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && onUrlSave()}
          />
          <button
            type="button"
            disabled={busy || !urlInput.trim()}
            onClick={onUrlSave}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Usar esta URL
          </button>
        </div>
      </div>
    </div>
  );
}
