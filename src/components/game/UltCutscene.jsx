// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { ULT_CUTSCENE_EVENT } from "@/lib/game/ultCutscene";

let cutKey = 0;

function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return hex || `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function Cutscene({ cut }) {
  const { t, character: localChar, move: localMove } = useI18n();
  const character = cut.character;
  const info = localChar(character) || character;
  const rawMove = cut.move;
  const move = (rawMove && localMove(character.id, "ultimate", rawMove)) || rawMove || {};
  const primary = character.colors?.primary || "#a855f7";
  const accent = character.colors?.accent || "#ffffff";
  const calm = !!cut.reducedMotion;
  const dur = cut.duration || 1.65;

  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      {/* Viñeta con borde de color del personaje */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(0,0,0,0.72) 100%)",
          boxShadow: `inset 0 0 150px ${rgba(accent, 0.35)}`,
        }}
      />

      {/* Líneas de velocidad */}
      {!calm && (
        <motion.div
          className="cut-speed absolute inset-[-25%]"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: [0, 0.75, 0.55, 0], rotate: 18 }}
          transition={{ duration: dur, ease: "easeOut" }}
          style={{
            background: `repeating-conic-gradient(from 0deg, transparent 0deg 4.2deg, ${rgba(accent, 0.28)} 4.2deg 5deg)`,
            WebkitMaskImage: "radial-gradient(circle, transparent 28%, #000 72%)",
            maskImage: "radial-gradient(circle, transparent 28%, #000 72%)",
          }}
        />
      )}

      {/* Barras de cine */}
      <motion.div
        className="absolute inset-x-0 top-0 bg-black"
        initial={{ height: 0 }}
        animate={{ height: "11vh" }}
        exit={{ height: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-black"
        initial={{ height: 0 }}
        animate={{ height: "11vh" }}
        exit={{ height: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      />

      {/* Banner del ultimate */}
      <motion.div
        className="absolute left-0 right-0"
        style={{ top: "55%" }}
        initial={calm ? { opacity: 0 } : { x: "-105%", opacity: 0 }}
        animate={calm ? { opacity: 1 } : { x: 0, opacity: 1 }}
        exit={calm ? { opacity: 0 } : { x: "105%", opacity: 0 }}
        transition={{ duration: 0.34, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative -skew-x-12 py-2 pl-[8vw] pr-24"
          style={{
            background: `linear-gradient(90deg, ${rgba(primary, 0.95)} 0%, ${rgba(accent, 0.8)} 62%, rgba(0,0,0,0) 100%)`,
            boxShadow: `0 0 40px ${rgba(accent, 0.45)}`,
          }}
        >
          <div className="skew-x-12">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-white/85 sm:text-xs">
              {t("cut.ultimate")} · {info.displayName}
            </div>
            <div
              className="text-3xl font-black uppercase italic leading-none tracking-wide text-white sm:text-5xl"
              style={{ textShadow: `0 2px 0 rgba(0,0,0,0.55), 0 0 22px ${rgba(accent, 0.9)}` }}
            >
              {move.name}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Destello del impacto */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at center, ${rgba("#ffffff", 0.85)}, ${rgba(accent, 0.7)} 55%, rgba(0,0,0,0) 100%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: calm ? 0 : [0, 0, 0.6, 0] }}
        transition={{ duration: 0.8, times: [0, 0.55, 0.62, 1] }}
      />
    </motion.div>
  );
}

// Overlay de cutscene del ultimate. Escucha el evento que lanza el motor de juego.
export default function UltCutscene() {
  const [cut, setCut] = useState(null);
  const timer = useRef(0);

  useEffect(() => {
    const onUlt = (e) => {
      const d = e.detail;
      if (!d?.character) return;
      clearTimeout(timer.current);
      cutKey += 1;
      setCut({ ...d, key: cutKey });
      timer.current = window.setTimeout(() => setCut(null), (d.duration || 1.65) * 1000);
    };
    window.addEventListener(ULT_CUTSCENE_EVENT, onUlt);
    return () => {
      window.removeEventListener(ULT_CUTSCENE_EVENT, onUlt);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden="true">
      <AnimatePresence>{cut && <Cutscene key={cut.key} cut={cut} />}</AnimatePresence>
    </div>
  );
}
