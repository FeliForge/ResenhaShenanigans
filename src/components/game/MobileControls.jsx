// @ts-nocheck
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Controles táctiles para móvil: joystick virtual (izquierda) + botones de acción (derecha).
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
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
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
  const btn = "pointer-events-auto flex select-none items-center justify-center rounded-full font-bold text-white touch-none active:scale-90 transition shadow-lg";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Joystick */}
      <div
        className="pointer-events-auto absolute bottom-8 left-6 flex h-32 w-32 touch-none items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm"
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        onTouchCancel={end}
      >
        <span className="absolute text-[10px] font-bold tracking-widest text-white/40">{t("mobile.move")}</span>
        <div
          className="h-14 w-14 rounded-full border border-white/50 bg-white/40 shadow-lg"
          style={{ transform: `translate(${stick.x * 38}px, ${-stick.y * 38}px)` }}
        />
      </div>

      {/* Botones de acción */}
      <div className="absolute bottom-8 right-6 grid grid-cols-3 gap-2">
        <button className={`${btn} h-14 w-14 bg-cyan-600/80`} onTouchStart={tap(() => onMoveKey("m1"))}>1</button>
        <button className={`${btn} h-14 w-14 bg-violet-600/80`} onTouchStart={tap(() => onMoveKey("special1"))}>2</button>
        <button className={`${btn} h-14 w-14 bg-sky-600/80 text-lg`} onTouchStart={tap(onJump)}>↑</button>
        <button className={`${btn} h-14 w-14 bg-violet-600/80`} onTouchStart={tap(() => onMoveKey("special2"))}>3</button>
        <button className={`${btn} h-14 w-14 bg-violet-600/80`} onTouchStart={tap(() => onMoveKey("special3"))}>4</button>
        <button className={`${btn} h-14 w-14 bg-amber-500/90`} onTouchStart={tap(onDash)}>⚡</button>
        <button className={`${btn} col-span-3 h-11 bg-red-700/85 text-sm tracking-widest`} onTouchStart={tap(() => onMoveKey("ultimate"))}>
          {t("mobile.ultimate")}
        </button>
      </div>
    </div>
  );
}