// @ts-nocheck
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { QUALITY_IDS, getGfxProfile, readSettings, saveSettings } from "@/lib/game/gfxProfile";

// Calidad gráfica + shaders. Se guarda en el navegador y se aplica en vivo al juego.
export default function GraphicsSelector() {
  const { t } = useI18n();
  const [s, setS] = useState({ quality: "auto", shaders: true });
  const [auto, setAuto] = useState("medium");
  const [device, setDevice] = useState("");

  useEffect(() => {
    setS(readSettings());
    try {
      const p = getGfxProfile();
      setAuto(p.auto);
      const e = p.env;
      setDevice(e.isChromeOS ? "ChromeOS" : e.isOperaGX ? "Opera GX" : e.isOpera ? "Opera" : "");
    } catch { /* sin WebGL */ }
  }, []);

  const update = (patch) => setS(saveSettings(patch));
  const options = ["auto", ...QUALITY_IDS];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("gfx.title")}{device ? ` · ${device}` : ""}
        </span>
        <select
          value={s.quality}
          onChange={(e) => update({ quality: e.target.value })}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          aria-label={t("gfx.quality")}
        >
          {options.map((q) => (
            <option key={q} value={q}>
              {q === "auto" ? `${t("gfx.auto")} (${t(`gfx.q.${auto}`)})` : t(`gfx.q.${q}`)}
            </option>
          ))}
        </select>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
        <span>{t("gfx.shaders")}</span>
        <input
          type="checkbox"
          checked={s.shaders}
          onChange={(e) => update({ shaders: e.target.checked })}
          className="h-4 w-4 accent-[#ff9620]"
        />
      </label>
    </div>
  );
}
