// @ts-nocheck
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Skull } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Secuencia cinematográfica de derrota (inspiración estética JJK, recursos propios).
// Se ejecuta en el cliente del derrotado y, en versión corta, en los demás clientes.
export default function DefeatOverlay({ open, character, archetype, respawnIn, kills, deaths, canvasFlashes }) {
  const { t } = useI18n();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 320);
    return () => clearTimeout(id);
  }, [open, canvasFlashes]);

  if (!open || !character) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
      {/* flash de impacto */}
      {flash && <div className="absolute inset-0 animate-[defeat-flash_0.32s_ease-out]" style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.95), rgba(255,255,255,0) 62%)" }} />}

      {/* oscurecimiento + viñeta */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(6,6,12,0.35) 0%, rgba(4,4,9,0.92) 78%)" }} />
      <div className="absolute inset-0 opacity-70" style={{ boxShadow: "inset 0 0 200px 80px rgba(0,0,0,0.95)" }} />

      {/* líneas de energía del estilo */}
      <div className="absolute inset-0 opacity-60">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-px origin-left"
            style={{
              width: `${30 + (i % 5) * 18}vw`,
              rotate: `${(i * 360) / 14}deg`,
              background: `linear-gradient(90deg, rgba(255,255,255,0.75), transparent)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 0.7], opacity: [0, 0.85, 0] }}
            transition={{ duration: 0.9, delay: i * 0.03, ease: "easeOut" }}
          />
        ))}
      </div>

      {/* distorsión de bandas */}
      <div className="absolute inset-0 opacity-25 mix-blend-screen" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 5px)" }} />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        initial={{ opacity: 0, scale: 1.12 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <motion.span
          className="flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-1 text-[10px] font-black uppercase tracking-[0.45em] text-white/80"
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <Skull size={12} /> {t(`arch.${archetype || "balanced"}`)}
        </motion.span>

        <motion.h2
          className="mt-4 font-heading text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-7xl"
          style={{ textShadow: "0 0 40px rgba(239,68,68,0.75), 0 10px 60px rgba(0,0,0,0.9)" }}
          initial={{ letterSpacing: "0.35em", opacity: 0 }}
          animate={{ letterSpacing: "0.02em", opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {t("combat.defeated")}
        </motion.h2>

        <motion.p
          className="mt-2 font-heading text-lg font-bold uppercase tracking-[0.2em] text-[#ff9620]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
        >
          {character.displayName}
        </motion.p>

        <motion.p
          className="mt-3 max-w-sm text-sm text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {t(`combat.styled.${archetype || "balanced"}`)}
        </motion.p>

        <div className="mt-7 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
          <span>{t("hud.kos")} {kills ?? 0}</span>
          <span className="h-3 w-px bg-white/25" />
          <span>{t("hud.deaths")} {deaths ?? 0}</span>
        </div>

        <motion.div
          className="mt-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white/80"
          key={respawnIn}
          initial={{ opacity: 0.4, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {t("combat.respawnIn", { n: Math.max(0, respawnIn ?? 0) })}
        </motion.div>
      </motion.div>
    </div>
  );
}