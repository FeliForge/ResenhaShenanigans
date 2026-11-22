// @ts-nocheck
import { useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Mobile controls — left joystick + right action pad.
 * Axes: stick-up = forward, stick-right = strafe right.
 * Improved touch targets, safe-area, visual feedback, deadzone.
 */
export default function MobileControls({ onMove, onJump, onDash, onMoveKey }) {
  const { t } = useI18n();
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const origin = useRef(null);
  const touchId = useRef(null);
  const active = useRef(false);

  const emit = useCallback(
    (x, y) => {
      onMove?.(x, y);
    },
    [onMove]
  );

  function start(e) {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!touch) return;
    origin.current = { x: touch.clientX, y: touch.clientY };
    touchId.current = touch.identifier;
    active.current = true;
  }

  function move(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!active.current || origin.current == null) return;
    const touch = [...e.touches].find((it) => it.identifier === touchId.current);
    if (!touch) return;

    let dx = touch.clientX - origin.current.x;
    let dy = touch.clientY - origin.current.y;
    const max = 58;
    const length = Math.hypot(dx, dy) || 1;
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }

    // Deadzone to reduce jitter
    const dead = 0.12;
    let nx = -(dx / max);
    let ny = -(dy / max);
    if (Math.abs(nx) < dead) nx = 0;
    if (Math.abs(ny) < dead) ny = 0;

    setStick({ x: nx, y: ny });
    emit(nx, ny);
  }

  function end(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.changedTouches && touchId.current != null) {
      const ended = [...e.changedTouches].some((t) => t.identifier === touchId.current);
      if (!ended) return;
    }
    origin.current = null;
    touchId.current = null;
    active.current = false;
    setStick({ x: 0, y: 0 });
    emit(0, 0);
  }

  const tap = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn?.();
  };

  const btnBase =
    "pointer-events-auto flex select-none items-center justify-center rounded-2xl border border-white/25 font-black text-white touch-manipulation shadow-[0_6px_18px_rgba(0,0,0,.45)] backdrop-blur-md transition active:scale-90 active:brightness-125";

  const knobX = stick.x * 46;
  const knobY = -stick.y * 46;
  const stickActive = stick.x !== 0 || stick.y !== 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        touchAction: "none",
      }}
    >
      {/* Joystick */}
      <div
        className={
          "pointer-events-auto absolute bottom-[max(1.1rem,env(safe-area-inset-bottom))] left-[max(0.6rem,env(safe-area-inset-left))] flex h-[160px] w-[160px] touch-none items-center justify-center rounded-full border backdrop-blur-xl transition " +
          (stickActive
            ? "border-cyan-300/50 bg-[#07111d]/85 shadow-[0_0_36px_rgba(34,211,238,.28)]"
            : "border-cyan-100/30 bg-[#07111d]/75 shadow-[0_0_28px_rgba(34,211,238,.12)]")
        }
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        onTouchCancel={end}
      >
        <div className="absolute inset-3 rounded-full border border-white/10" />
        <div className="absolute h-px w-[72%] bg-white/10" />
        <div className="absolute h-[72%] w-px bg-white/10" />
        <span className="pointer-events-none absolute top-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/45">
          {t("mobile.move")}
        </span>
        <div
          className="pointer-events-none relative h-[68px] w-[68px] rounded-full border border-cyan-100/55 bg-gradient-to-br from-cyan-100/45 to-slate-200/15 shadow-[0_0_22px_rgba(34,211,238,.32),inset_0_1px_10px_rgba(255,255,255,.28)]"
          style={{ transform: `translate(${knobX}px, ${knobY}px)` }}
        />
      </div>

      {/* Action pad */}
      <div
        className="pointer-events-none absolute bottom-[max(1.1rem,env(safe-area-inset-bottom))] right-[max(0.45rem,env(safe-area-inset-right))] grid grid-cols-3 gap-2"
        style={{ width: "min(12.2rem, 46vw)" }}
      >
        <button
          type="button"
          className={btnBase + " aspect-square min-h-[3.4rem] bg-gradient-to-br from-cyan-500/95 to-blue-700/95 text-base"}
          onTouchStart={tap(() => onMoveKey("m1"))}
          aria-label="Attack 1"
        >
          1
        </button>
        <button
          type="button"
          className={btnBase + " aspect-square min-h-[3.4rem] bg-gradient-to-br from-violet-500/95 to-indigo-800/95 text-base"}
          onTouchStart={tap(() => onMoveKey("special1"))}
          aria-label="Attack 2"
        >
          2
        </button>
        <button
          type="button"
          className={btnBase + " aspect-square min-h-[3.4rem] bg-gradient-to-br from-sky-500/95 to-cyan-800/95 text-xl"}
          onTouchStart={tap(onJump)}
          aria-label="Jump"
        >
          ↑
        </button>
        <button
          type="button"
          className={btnBase + " aspect-square min-h-[3.4rem] bg-gradient-to-br from-violet-500/95 to-indigo-800/95 text-base"}
          onTouchStart={tap(() => onMoveKey("special2"))}
          aria-label="Attack 3"
        >
          3
        </button>
        <button
          type="button"
          className={btnBase + " aspect-square min-h-[3.4rem] bg-gradient-to-br from-fuchsia-500/95 to-purple-900/95 text-base"}
          onTouchStart={tap(() => onMoveKey("special3"))}
          aria-label="Attack 4"
        >
          4
        </button>
        <button
          type="button"
          className={btnBase + " aspect-square min-h-[3.4rem] border-amber-200/55 bg-gradient-to-br from-amber-400/95 to-orange-700/95 text-lg text-black"}
          onTouchStart={tap(onDash)}
          aria-label="Dash"
        >
          ⚡
        </button>
        <button
          type="button"
          className={
            btnBase +
            " col-span-3 min-h-[2.9rem] border-rose-200/45 bg-gradient-to-r from-rose-600/95 to-red-800/95 text-[11px] uppercase tracking-[0.18em]"
          }
          onTouchStart={tap(() => onMoveKey("ultimate"))}
        >
          {t("mobile.ultimate")}
        </button>
      </div>
    </div>
  );
}
