// @ts-nocheck
// Stub replaced by scripts/prebuild.mjs at build time with the full GameCanvas.
import { forwardRef, useImperativeHandle } from "react";

const GameCanvas = forwardRef(function GameCanvas(_props, ref) {
  useImperativeHandle(ref, () => ({
    triggerMove() {},
    triggerDash() {},
    triggerJump() {},
    setMobileMove() {},
    showEmote() {},
    showQuickChat() {},
    getHeading() { return 0; },
  }));
  return (
    <div className="flex h-full w-full items-center justify-center bg-black text-white/70">
      Loading city…
    </div>
  );
});

export default GameCanvas;
