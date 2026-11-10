// @ts-nocheck
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ACTIONS, codeToLabel, DEFAULT_BINDS, inputState } from "@/lib/game/input";
import { useI18n } from "@/lib/i18n";
import LanguageSelector from "@/components/game/LanguageSelector";
import GraphicsSelector from "@/components/game/GraphicsSelector";

export default function ControlsPanel({ binds, audioOn, onSave, onToggleAudio, onClose }) {
  const { t } = useI18n();
  const [local, setLocal] = useState(binds);
  const [armed, setArmed] = useState(null);

  useEffect(() => {
    inputState.blocked = true;
    try { document.exitPointerLock?.(); } catch {}
    return () => { inputState.blocked = false; };
  }, []);

  useEffect(() => {
    if (!armed) return;
    const onKey = (e) => {
      e.preventDefault();
      const next = { ...local, [armed]: e.code };
      setLocal(next);
      onSave(next);
      setArmed(null);
    };
    const onMouse = (e) => {
      e.preventDefault();
      const code = "Mouse" + e.button;
      const next = { ...local, [armed]: code };
      setLocal(next);
      onSave(next);
      setArmed(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouse);
    };
  }, [armed, local, onSave]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{t("settings.title")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-border px-3 py-2">
          <LanguageSelector />
        </div>

        <div className="mb-3 rounded-lg border border-border px-3 py-2">
          <GraphicsSelector />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.subtitle")}</p>
          {ACTIONS.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <span>{t(`action.${a.id}`)}</span>
              <button
                onClick={() => setArmed(a.id)}
                className={`min-w-20 rounded border px-2 py-1 text-xs font-mono ${
                  armed === a.id ? "border-primary bg-primary text-primary-foreground animate-pulse" : "border-border"
                }`}
              >
                {armed === a.id ? t("settings.press") : codeToLabel(local[a.id])}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => { setLocal(DEFAULT_BINDS); onSave(DEFAULT_BINDS); }}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            {t("settings.reset")}
          </button>
          <button
            onClick={onToggleAudio}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            {audioOn ? t("settings.audioOn") : t("settings.audioOff")}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
