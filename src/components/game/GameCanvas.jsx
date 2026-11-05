// @ts-nocheck
import { forwardRef, useEffect, useImperativeHandle } from "react";

// Safe stub so the route loads. scripts/prebuild.mjs replaces this with the full canvas at build time.
const GameCanvas = forwardRef(function GameCanvas(_props, ref) {
  useImperativeHandle(ref, () => ({
    triggerMove() {},
    triggerDash() {},
    triggerJump() {},
    setMobileMove() {},
    showQuickChat() {},
    showEmote() {},
  }));
  useEffect(() => {
    console.warn("[GameCanvas] stub — prebuild should replace this file before vite build");
  }, []);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a14] text-white">
      <p className="text-lg font-bold text-[#ff9620]">Cargando combate…</p>
      <p className="max-w-sm text-center text-sm text-white/50">
        Si esto no cambia, el prebuild no restauró el canvas. Revisa el deploy en Vercel.
      </p>
    </div>
  );
});

export default GameCanvas;
