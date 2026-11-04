// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { imageFileToDataUrl } from "@/lib/game/files";
import { useI18n } from "@/lib/i18n";

// Billboards: la imagen equipada se guarda en el perfil del jugador y se
// sincroniza con todos los jugadores de la sala (cada uno ve la del otro).
export default function BillboardsPanel({ url, onSave, onClose }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(url || "");

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("billboards.notImage"));
      return;
    }
    setBusy(true);
    try {
      const file_url = await imageFileToDataUrl(file);
      setPreview(file_url);
      await onSave(file_url);
      toast.success(t("billboards.done"));
    } catch {
      toast.error(t("billboards.error"));
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
          <ChevronLeft size={18} /> {t("common.back")}
        </button>
        <h1 className="font-heading text-lg font-bold tracking-tight">{t("billboards.title")}</h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">{t("billboards.subtitle")}</span>
      </header>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col gap-2 rounded-lg border-2 border-dashed border-border bg-card p-3 transition hover:border-primary">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t("billboards.equipped")}</span>
            {busy && <span className="text-xs text-muted-foreground">{t("billboards.uploading")}</span>}
          </div>
          <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-md bg-muted/40">
            {preview ? (
              <img src={preview} alt={t("billboards.equipped")} className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus size={28} />
                <span className="text-xs">{t("billboards.clickUpload")}</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          <span className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <Upload size={12} /> {preview ? t("billboards.change") : t("billboards.upload")}
          </span>
        </label>
      </div>
    </div>
  );
}