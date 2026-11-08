// @ts-nocheck
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Touch layout: virtual joystick on the left and action cluster on the right.
export default function MobileControls({ onMove, onJump, onDash, onMoveKey }) {
  const { t } = useI18n();
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const origin = useRef(null);
  const touchId = useRef(null);

  function start(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    origin.current = { x: touch.clientX, y: touch.clientY };
    touchId.current = touch.identifier;
  }

  function move(e) {
    e.preventDefault();
    const touch = [...e.touches].find((it) => it.identifier === touchId.current);
    if (!touch || !origin.current) return;
    let dx = touch.clientX - origin.current.x;
    let dy = touch.clientY - origin.current.y;
    const max = 48;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    setStick({ x: dx / max, y: -dy / max });
    onMove(dx / max, -dy / max);
  }

  function end(e) {
    e.preventDefault();
    origin.current = null;
    touchId.current = null;
    setStick({ x: 0, y: 0 });
    onMove(0, 0);
  }

  const tap = (fn) => (e) => { e.preventDefault(); fn(); };
  const btn = "pointer-events-auto flex select-none items-center justify-center rounded-2xl border border-white/25 font-black text-white touch-none shadow-[0_8px_24px_rgba(0,0,0,.35)] backdrop-blur-xl transition active:scale-90";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <div className="pointer-events-auto absolute bottom-7 left-5 flex h-[138px] w-[138px] touch-none items-center justify-center rounded-full border border-cyan-100/25 bg-[#07111d]/65 shadow-[0_0_28px_rgba(34,211,238,.12)] backdrop-blur-xl sm:bottom-8 sm:left-8">
        <div className="absolute inset-2 rounded-full border border-white/10" />
        <div className="absolute h-px w-[78%] bg-white/10" />
        <div className="absolute h-[78%] w-px bg-white/10" />
        <span className="absolute top-4 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100/35">{t("mobile.move")}</span>
        <div
          className="relative h-[58px] w-[58px] rounded-full border border-cyan-100/45 bg-gradient-to-br from-cyan-100/35 to-slate-200/10 shadow-[0_0_22px_rgba(34,211,238,.22),inset_0_1px_8px_rgba(255,255,255,.22)]"
          style={{ transform: "translate(" + (stick.x * 38) + "px, " + (-stick.y * 38) + "px)" }}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onTouchCancel={end}
        />
        <div
          className="absolute inset-0 rounded-full"
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onTouchCancel={end}
        />
      </div>

      <div className="absolute bottom-7 right-4 grid grid-cols-3 gap-2 sm:bottom-8 sm:right-8">
        <button className={btn + " h-14 w-14 bg-gradient-to-br from-cyan-500/85 to-blue-700/85"} onTouchStart={tap(() => onMoveKey("m1"))} aria-label="Attack 1">1</button>
        <button className={btn + " h-14 w-14 bg-gradient-to-br from-violet-500/85 to-indigo-800/85"} onTouchStart={tap(() => onMoveKey("special1"))} aria-label="Attack 2">2</button>
        <button className={btn + " h-14 w-14 bg-gradient-to-br from-sky-500/85 to-cyan-800/85 text-xl"} onTouchStart={tap(onJump)} aria-label="Jump">↑</button>
        <button className={btn + " h-14 w-14 bg-gradient-to-br from-violet-500/85 to-indigo-800/85"} onTouchStart={tap(() => onMoveKey("special2"))} aria-label="Attack 3">3</button>
        <button className={btn + " h-14 w-14 bg-gradient-to-br from-fuchsia-500/85 to-purple-900/85"} onTouchStart={tap(() => onMoveKey("special3"))} aria-label="Attack 4">4</button>
        <button className={btn + " h-14 w-14 border-amber-200/50 bg-gradient-to-br from-amber-400/95 to-orange-700/95 text-lg text-black"} onTouchStart={tap(onDash)} aria-label="Dash">⚡</button>
        <button className={btn + " col-span-3 h-11 border-rose-200/35 bg-gradient-to-r from-rose-600/95 to-red-800/95 text-[10px] uppercase tracking-[0.22em]"} onTouchStart={tap(() => onMoveKey("ultimate"))}>
          {t("mobile.ultimate")}
        </button>
      </div>
    </div>
  );
}
