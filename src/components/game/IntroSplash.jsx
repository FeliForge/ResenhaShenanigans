// @ts-nocheck
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Hammer, Swords } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DURATION = 4600;

export default function IntroSplash({ onDone }) {
  const { t } = useI18n();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      doneRef.current?.();
    };
    const timer = setTimeout(finish, DURATION);
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const skip = () => doneRef.current?.();

  return (
    <div
      className="dark absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#0a0a14]"
      onClick={skip}
    >
      {/* halo de la forja */}
      <motion.div
        className="absolute h-[460px] w-[460px] rounded-full bg-[#ff9620]/25 blur-[130px]"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.9, 0.55], scale: [0.5, 1.15, 1] }}
        transition={{ duration: 2.4, ease: "easeOut" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_0%,#0a0a14_72%)]" />

      <div className="relative flex flex-col items-center px-6">
        {/* yunque */}
        <motion.div
          className="relative mb-8 grid h-16 w-16 place-items-center rounded-full border border-[#ff9620]/40 bg-[#151523]/80 shadow-[0_0_50px_-6px_rgba(255,150,31,0.9)]"
          initial={{ opacity: 0, y: 18, rotate: -18 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <Hammer size={30} className="text-[#ff9620]" />
          <motion.span
            className="absolute inset-0 rounded-full border border-[#ff9620]/50"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.9 }}
            transition={{ duration: 1.8, repeat: 1, ease: "easeOut", delay: 0.4 }}
          />
        </motion.div>

        <motion.h1
          className="font-heading text-3xl font-black uppercase leading-none text-white sm:text-5xl"
          initial={{ opacity: 0, letterSpacing: "0.7em", y: 10 }}
          animate={{ opacity: 1, letterSpacing: "0.24em", y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.25 }}
          style={{ textShadow: "0 0 34px rgba(255,150,31,0.55)" }}
        >
          Feliforge
        </motion.h1>

        <motion.div
          className="my-4 h-px bg-gradient-to-r from-transparent via-[#ff9620] to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          transition={{ duration: 1, ease: "easeInOut", delay: 1.1 }}
        />

        <motion.p
          className="text-[11px] font-semibold uppercase tracking-[0.75em] text-white/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.35 }}
        >
          Studios
        </motion.p>

        <motion.div
          className="mt-10 flex items-center gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.2 }}
        >
          <Swords size={16} className="text-[#ff9620]" />
          <span className="text-xs font-bold uppercase tracking-[0.5em] text-white/80">{t("intro.presents")}</span>
          <Swords size={16} className="text-[#ff9620]" />
        </motion.div>
      </div>

      <motion.button
        onClick={(e) => { e.stopPropagation(); skip(); }}
        className="absolute bottom-6 right-6 rounded-full border border-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50 transition hover:border-[#ff9620]/60 hover:text-[#ff9620]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.6 }}
      >
        {t("intro.skip")}
      </motion.button>

      {/* fundido final */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: DURATION / 1000, times: [0, 0.84, 1] }}
      />
    </div>
  );
}