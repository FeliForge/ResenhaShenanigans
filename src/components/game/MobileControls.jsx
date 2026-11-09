// @ts-nocheck
import { useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Mobile controls — left joystick + right action pad.
 * Axes oriented so stick-up = forward, stick-right = strafe right.
 */
export default function MobileControls({ onMove, onJump, onDash, onMoveKey }) {
  const { t } = useI18n();
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const origin = useRef(null);
  const touchId = useRef(null);
  const active = useRef(false);

  const emit = useCallback((x, y) => {
    onMove?.(x, y);
  }, [onMove]);

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
    const max = 56;
    const length = Math.hypot(dx, dy) || 1;
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }

    // Flip both axes vs previous mapping (was fully inverted in-game).
    // +x = right, +y = forward (screen-up).
    const nx = -(dx / max);
    const ny = -(dy / max);

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

  const btn =
    "pointer-events-auto flex select-none items-center justify-center rounded-2xl border border-white/20 font-black text-white touch-manipulation shadow-[0_6px_20px_rgba(0,0,0,.4)] backdrop-blur-md transition active:scale-95 active:brightness-110";

  const knobX = stick.x * 44;
  const knobY = -stick.y * 44;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div
        className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] flex h-[152px] w-[152px] touch-none items-center justify-center rounded-full border border-cyan-100/30 bg-[#07111d]/75 shadow-[0_0_32px_rgba(34,211,238,.15)] backdrop-blur-xl"
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        onTouchCancel={end}
      >
        <div className="absolute inset-3 rounded-full border border-white/10" />
        <div className="absolute h-px w-[70%] bg-white/10" />
        <div className="absolute h-[70%] w-px bg-white/10" />
        <span className="pointer-events-none absolute top-3 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/40">
          {t("mobile.move")}
        </span>
        <div
          className="pointer-events-none relative h-[64px] w-[64px] rounded-full border border-cyan-100/50 bg-gradient-to-br from-cyan-100/40 to-slate-200/15 shadow-[0_0_24px_rgba(34,211,238,.28),inset_0_1px_10px_rgba(255,255,255,.25)]"
          style={{ transform: `translate(${knobX}px, ${knobY}px)` }}
        />
      </div>

      <div
        className="pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(0.5rem,env(safe-area-inset-right))] grid grid-cols-3 gap-2.5"
        style={{ width: "min(11.5rem, 42vw)" }}
      >
        <button type="button" className={btn + " aspect-square min-h-[3.25rem] bg-gradient-to-br from-cyan-500/90 to-blue-700/90 text-base"} onTouchStart={tap(() => onMoveKey("m1"))} aria-label="Attack 1">1</button>
        <button type="button" className={btn + " aspect-square min-h-[3.25rem] bg-gradient-to-br from-violet-500/90 to-indigo-800/90 text-base"} onTouchStart={tap(() => onMoveKey("special1"))} aria-label="Attack 2">2</button>
        <button type="button" className={btn + " aspect-square min-h-[3.25rem] bg-gradient-to-br from-sky-500/90 to-cyan-800/90 text-xl"} onTouchStart={tap(onJump)} aria-label="Jump">↑</button>
        <button type="button" className={btn + " aspect-square min-h-[3.25rem] bg-gradient-to-br from-violet-500/90 to-indigo-800/90 text-base"} onTouchStart={tap(() => onMoveKey("special2"))} aria-label="Attack 3">3</button>
        <button type="button" className={btn + " aspect-square min-h-[3.25rem] bg-gradient-to-br from-fuchsia-500/90 to-purple-900/90 text-base"} onTouchStart={tap(() => onMoveKey("special3"))} aria-label="Attack 4">4</button>
        <button type="button" className={btn + " aspect-square min-h-[3.25rem] border-amber-200/50 bg-gradient-to-br from-amber-400/95 to-orange-700/95 text-lg text-black"} onTouchStart={tap(onDash)} aria-label="Dash">⚡</button>
        <button
          type="button"
          className={btn + " col-span-3 min-h-[2.75rem] border-rose-200/40 bg-gradient-to-r from-rose-600/95 to-red-800/95 text-[11px] uppercase tracking-[0.2em]"}
          onTouchStart={tap(() => onMoveKey("ultimate"))}
        >
          {t("mobile.ultimate")}
        </button>
      </div>
    </div>
  );
}
