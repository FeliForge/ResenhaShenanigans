// @ts-nocheck
import { forwardRef, useEffect, useImperativeHandle } from "react";

/** Safe boot stub. scripts/prebuild.mjs replaces this with the full GameCanvas from d599d4d at build time. */
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
    console.warn("[GameCanvas] stub active — full canvas should be restored by prebuild");
  }, []);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a14] text-white">
      <p className="text-lg font-bold text-[#ff9620]">Cargando combate…</p>
      <p className="max-w-sm text-center text-sm text-white/50">
        El menú debería funcionar. Si el combate no carga, revisa el log de prebuild en Vercel.
      </p>
    </div>
  );
});

export default GameCanvas;
export const BILLBOARD_COUNT = 4;
