// @ts-nocheck
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { QUICK_CHAT } from "@/data/quickChat";
import { useI18n } from "@/lib/i18n";

export default function QuickChat({ onPhrase }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(null);

  function send(phrase) {
    onPhrase({ id: phrase.id, text: t(`chat.p.${phrase.id}`) });
    setOpen(false);
    setCategory(null);
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{t("chat.title")}</span>
            <button onClick={() => { setOpen(false); setCategory(null); }} className="text-muted-foreground hover:text-foreground" aria-label={t("common.close")}>
              <X size={16} />
            </button>
          </div>

          {!category ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.values(QUICK_CHAT).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  {t(`chat.cat.${cat.id}`)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setCategory(null)}
                className="mb-1 self-start text-xs text-muted-foreground hover:text-foreground"
              >
                {t("chat.back")}
              </button>
              {QUICK_CHAT[category].phrases.map((p) => (
                <button
                  key={p.id}
                  onClick={() => send(p)}
                  className="rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {t(`chat.p.${p.id}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
      >
        <MessageCircle size={18} /> {t("chat.title")}
      </button>
    </div>
  );
}