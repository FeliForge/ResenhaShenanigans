// @ts-nocheck
import { AnimatePresence, motion } from "framer-motion";
import { Skull, Swords } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Avisos de eliminación sincronizados desde la sala.
export default function KillFeed({ entries }) {
  const { t } = useI18n();
  const list = entries || [];

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex w-full max-w-xs -translate-x-1/2 flex-col items-center gap-1.5">
      <AnimatePresence initial={false}>
        {list.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${
              entry.mine
                ? "border-[#ff9620]/60 bg-[#2a1a08]/90 text-white"
                : "border-white/15 bg-black/70 text-white/85"
            }`}
          >
            <Skull size={12} className={entry.mine ? "text-[#ff9620]" : "text-white/60"} />
            <span className="truncate">
              {t("combat.kill", {
                killer: entry.killerName || t("combat.you"),
                victim: entry.victimName || t("combat.you"),
              })}
            </span>
            <Swords size={11} className="shrink-0 text-white/35" />
            <span className="shrink-0 text-white/45">{t(`arch.${entry.archetype || "balanced"}`)}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}