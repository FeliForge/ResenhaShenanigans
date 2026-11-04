// @ts-nocheck
import { useI18n } from "@/lib/i18n";

// Selector de idioma (cambio inmediato, se guarda en el navegador).
export default function LanguageSelector({ compact = false }) {
  const { lang, setLang, t } = useI18n();
  const options = [
    { id: "pt", flag: "🇧🇷", label: t("settings.lang.pt") },
    { id: "en", flag: "🇺🇸", label: t("settings.lang.en") },
  ];

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "justify-between"}`}>
      {!compact && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.language")}</span>}
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1">
        {options.map((opt) => {
          const active = lang === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setLang(opt.id)}
              aria-pressed={active}
              title={opt.label}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                active ? "bg-[#ff9620] text-[#0a0a14]" : "text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="text-sm leading-none">{opt.flag}</span>
              <span className={compact ? "sr-only" : ""}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}