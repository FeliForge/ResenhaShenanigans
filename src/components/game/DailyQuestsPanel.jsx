// @ts-nocheck
import {
  Coins, Check, X, Loader2, ScrollText, ArrowUp, Footprints, Zap, Flame, Target,
  Skull, Sparkles, Swords, Gamepad2, Users, Clock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ICONS = { ArrowUp, Footprints, Zap, Flame, Target, Skull, Sparkles, Swords, Gamepad2, Users, Clock };

const TONE = {
  easy: "border-emerald-500/50 text-emerald-400",
  normal: "border-sky-500/50 text-sky-400",
  hard: "border-amber-500/50 text-amber-400",
};

const BAR = {
  easy: "bg-emerald-500",
  normal: "bg-sky-500",
  hard: "bg-amber-500",
};

export default function DailyQuestsPanel({ quests, coins, loading, claimingId, onClaim, onClose }) {
  const { t } = useI18n();
  const list = quests || [];

  // Los títulos viven en i18n; si falta una clave se usa el texto guardado.
  function text(id, field, fallback) {
    const key = `quests.q.${id}.${field}`;
    const value = t(key);
    return value === key ? fallback : value;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-primary" />
            <h2 className="font-heading text-base font-bold">{t("quests.title")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full border border-amber-500/50 px-2 py-0.5 text-xs font-semibold text-amber-400">
              <Coins size={13} /> {coins ?? 0}
            </span>
            <button onClick={onClose} aria-label={t("quests.close")} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> {t("quests.loading")}
            </div>
          )}

          {!loading && list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("quests.login")}</p>
          )}

          <div className="flex flex-col gap-2">
            {list.map((q) => {
              const Icon = ICONS[q.icon] || Target;
              const pct = Math.min(100, Math.round(((q.progress || 0) / q.target) * 100));
              const complete = (q.progress || 0) >= q.target;
              const title = text(q.id, "title", q.title);
              const desc = text(q.id, "desc", q.description).split("{n}").join(String(q.target));
              return (
                <div key={q.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    <span className={`rounded-lg border p-1.5 ${TONE[q.difficulty] || TONE.normal}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">{title}</h3>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t(`quests.diff.${q.difficulty}`)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${BAR[q.difficulty] || BAR.normal}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{Math.min(q.progress || 0, q.target)} / {q.target}</span>
                        <span className="flex items-center gap-1 font-semibold text-amber-400">
                          <Coins size={11} /> {q.reward}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end">
                    {q.claimed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <Check size={13} /> {t("quests.claimed")}
                      </span>
                    ) : complete ? (
                      <button
                        onClick={() => onClaim(q.id)}
                        disabled={claimingId === q.id}
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        {claimingId === q.id ? <Loader2 size={13} className="animate-spin" /> : <Coins size={13} />}
                        {t("quests.claim")}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("quests.progress")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">{t("quests.footer")}</p>
      </div>
    </div>
  );
}