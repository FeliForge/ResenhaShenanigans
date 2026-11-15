// @ts-nocheck
import { useI18n } from "@/lib/i18n";

const OPTIONS = [
  { id: "pt", flag: "🇧🇷", label: "Português" },
  { id: "en", flag: "🇺🇸", label: "English" },
  { id: "es", flag: "🇪🇸", label: "Español" },
  { id: "fr", flag: "🇫🇷", label: "Français" },
  { id: "de", flag: "🇩🇪", label: "Deutsch" },
  { id: "zh", flag: "🇨🇳", label: "中文" },
];

export default function LanguageSelector({ compact = false }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={"flex items-center gap-2 " + (compact ? "" : "justify-between")}>
      {!compact && (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("settings.language")}
        </span>
      )}
      <label className="relative">
        <span className="sr-only">{t("settings.language")}</span>
        <select
          value={lang}
          onChange={(event) => setLang(event.target.value)}
          aria-label={t("settings.language")}
          className="min-w-[142px] appearance-none rounded-full border border-white/15 bg-black/50 py-2 pl-3 pr-8 text-xs font-bold text-white outline-none transition hover:border-orange-300/50 focus:border-orange-300"
        >
          {OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-slate-950 text-white">
              {option.flag} {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/60"
        >
          ▼
        </span>
      </label>
    </div>
  );
}
