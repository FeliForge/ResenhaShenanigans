// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Settings, Smile, Zap, Shield, Skull, Swords, Flame, Hand } from "lucide-react";
import { MOVE_KEYS } from "@/data/characters";
import { codeToLabel } from "@/lib/game/input";
import { useI18n } from "@/lib/i18n";
import ControlsPanel from "@/components/game/ControlsPanel";

const CLIP_CARD = "polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%)";
const CLIP_BAR = "polygon(0 0, 100% 0, 97% 100%, 0 100%)";
const CLIP_BAR_R = "polygon(3% 0, 100% 0, 100% 100%, 0 100%)";
const CLIP_PANEL = "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)";

const DIRS = [
  { label: "N", deg: 0 },
  { label: "NE", deg: 45 },
  { label: "E", deg: 90 },
  { label: "SE", deg: 135 },
  { label: "S", deg: 180 },
  { label: "SW", deg: 225 },
  { label: "W", deg: 270 },
  { label: "NW", deg: 315 },
];

const MOVE_ICONS = { m1: Hand, special1: Swords, special2: Shield, special3: Flame };

function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return hex || `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function initialsOf(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function dirLabel(deg) {
  const d = ((deg % 360) + 360) % 360;
  let best = DIRS[0];
  let bestDiff = 999;
  for (const x of DIRS) {
    const diff = Math.min(Math.abs(d - x.deg), 360 - Math.abs(d - x.deg));
    if (diff < bestDiff) { bestDiff = diff; best = x; }
  }
  return best.label;
}

function Compass({ heading = 0, getHeading }) {
  const [h, setH] = useState(heading);

  useEffect(() => {
    if (typeof heading === "number" && !Number.isNaN(heading)) setH(heading);
  }, [heading]);

  useEffect(() => {
    if (typeof getHeading !== "function") return;
    let raf;
    const tick = () => {
      try {
        const v = getHeading();
        if (typeof v === "number" && !Number.isNaN(v)) setH(v);
      } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getHeading]);

  const rot = ((h % 360) + 360) % 360;
  const label = dirLabel(rot);

  return (
    <div
      className="pointer-events-none relative flex h-16 w-16 items-center justify-center"
      title={`${Math.round(rot)}° ${label}`}
      aria-label={`Compass ${label} ${Math.round(rot)} degrees`}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-black/80 to-[#0b0b18]/85 shadow-[0_0_16px_rgba(0,229,255,0.35)] ring-1 ring-cyan-400/50 backdrop-blur" />
      <div className="absolute inset-[3px] rounded-full ring-1 ring-white/10" />
      <div
        className="absolute inset-1 rounded-full"
        style={{ transform: `rotate(${-rot}deg)`, transition: "transform 80ms linear" }}
      >
        <div className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] font-black text-red-400">N</div>
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/50">S</div>
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-white/50">W</div>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-white/50">E</div>
        <div className="absolute left-1/2 top-1/2 h-[70%] w-0.5 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1/2 w-full rounded-t bg-red-500" style={{ boxShadow: "0 0 6px rgba(239,68,68,0.8)" }} />
          <div className="h-1/2 w-full rounded-b bg-white/80" />
        </div>
      </div>
      <div className="absolute bottom-[-2px] left-1/2 z-10 -translate-x-1/2 translate-y-full rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cyan-300">
        {label} {Math.round(rot)}°
      </div>
      <div className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#67e8f9]" />
    </div>
  );
}

// Retrato circular con anillo de carga del ultimate.
function Emblem({ name, colors, pct, full }) {
  const C = 2 * Math.PI * 28;
  const accent = colors?.accent || "#a855f7";
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="hudUltGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6b21a8" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r="28" fill="none"
          stroke={full ? accent : "url(#hudUltGrad)"}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 0.25s ease-out", filter: full ? `drop-shadow(0 0 6px ${accent})` : undefined }}
        />
      </svg>
      <div
        className={`absolute inset-[8px] flex items-center justify-center rounded-full text-sm font-black tracking-tight text-white ${full ? "hud-ring-pulse" : ""}`}
        style={{
          background: `linear-gradient(135deg, ${colors?.primary || "#7f1d1d"}, ${colors?.secondary || "#1f2937"})`,
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.22)",
          textShadow: "0 1px 2px rgba(0,0,0,0.7)",
        }}
      >
        {initialsOf(name)}
      </div>
    </div>
  );
}

function hpColors(pct) {
  if (pct > 60) return { bar: "linear-gradient(90deg,#15803d,#4ade80,#bef264)", glow: "rgba(74,222,128,0.55)" };
  if (pct > 30) return { bar: "linear-gradient(90deg,#b45309,#f59e0b,#fde047)", glow: "rgba(245,158,11,0.6)" };
  return { bar: "linear-gradient(90deg,#7f1d1d,#dc2626,#f87171)", glow: "rgba(239,68,68,0.75)" };
}

function Slot({ keyLabel, tag, name, Icon, cd, cooldown, disabled, locked, lockFill, isUlt, full, accent, amber, size, onClick }) {
  const ready = !disabled;
  const wasReady = useRef(ready);
  const [ping, setPing] = useState(0);
  useEffect(() => {
    if (ready && !wasReady.current) setPing((p) => p + 1);
    wasReady.current = ready;
  }, [ready]);

  const cdPct = cooldown > 0 ? Math.min(100, (cd / cooldown) * 100) : 0;
  const showSeconds = cd > 0 && cooldown > 1000;
  const edge = disabled
    ? "linear-gradient(135deg, rgba(120,120,140,0.55), rgba(70,70,90,0.45))"
    : isUlt
      ? `linear-gradient(135deg, #f43f5e, ${accent}, #a855f7)`
      : amber
        ? "linear-gradient(135deg, #fbbf24, #d97706)"
        : "linear-gradient(135deg, #c084fc, #7c3aed)";
  const glow = disabled
    ? "none"
    : isUlt
      ? `drop-shadow(0 0 ${full ? 12 : 7}px ${rgba(accent, 0.85)})`
      : amber
        ? "drop-shadow(0 0 6px rgba(245,158,11,0.6))"
        : "drop-shadow(0 0 6px rgba(168,85,247,0.55))";

  return (
    <div className="relative" style={{ width: size, height: size, filter: glow }}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={`${keyLabel} ${name}`}
        className={`group relative block h-full w-full text-left transition-transform active:scale-95 ${isUlt && full ? "hud-ult-ready" : ""}`}
        style={{ clipPath: CLIP_CARD, background: edge }}
      >
        <span
          className="absolute inset-[1.5px] block"
          style={{
            clipPath: CLIP_CARD,
            background: disabled
              ? "linear-gradient(160deg, rgba(24,24,36,0.92), rgba(12,12,20,0.94))"
              : isUlt && full
                ? `linear-gradient(160deg, ${rgba(accent, 0.55)}, rgba(127,29,29,0.9))`
                : "linear-gradient(160deg, rgba(34,26,56,0.92), rgba(12,10,24,0.95))",
          }}
        />
        {/* carga del ultimate (sube desde abajo) */}
        {isUlt && locked && (
          <span
            className="absolute inset-x-[1.5px] bottom-[1.5px] block"
            style={{ height: `${lockFill}%`, background: `linear-gradient(0deg, ${rgba(accent, 0.5)}, ${rgba(accent, 0.12)})`, clipPath: CLIP_CARD, transition: "height 0.25s ease-out" }}
          />
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-90">
          {isUlt ? (
            <svg viewBox="0 0 24 24" width={size * 0.42} height={size * 0.42} fill={disabled ? "rgba(255,255,255,0.35)" : "#fff"} style={{ filter: disabled ? "none" : "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }}>
              <path d="M12 2l2.6 6.6L21 9.5l-5 4.4 1.6 6.6L12 17l-5.6 3.5L8 13.9 3 9.5l6.4-.9z" />
            </svg>
          ) : (
            <Icon size={size * 0.34} className={disabled ? "text-white/30" : "text-violet-200"} />
          )}
        </span>
        <span className="absolute left-2 top-1 text-sm font-black text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{keyLabel}</span>
        <span className="absolute right-2 top-1.5 text-[8px] font-bold tracking-wider text-violet-300/90">{tag}</span>
        <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-center text-[9px] font-semibold text-white/85">{name}</span>
        {/* barrido radial de enfriamiento */}
        {disabled && !locked && cdPct > 0 && (
          <span className="absolute inset-0 block" style={{ background: `conic-gradient(rgba(0,0,0,0.7) ${cdPct * 3.6}deg, transparent 0)`, clipPath: CLIP_CARD }} />
        )}
        {showSeconds && !locked && (
          <span className="absolute inset-0 flex items-center justify-center text-base font-black text-white" style={{ textShadow: "0 0 6px rgba(0,0,0,0.9)" }}>
            {(cd / 1000).toFixed(cd < 10000 ? 1 : 0)}
          </span>
        )}
      </button>
      <AnimatePresence>
        {ping > 0 && (
          <motion.span
            key={ping}
            className="pointer-events-none absolute inset-0 block"
            style={{ clipPath: CLIP_CARD, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.9)" }}
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: 0.45 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HUD({ character, stats, binds, audioOn, isTouch, onMove, onDash, onBack, onSaveBinds, onToggleAudio, emote, onEmote, getHeading }) {
  const { t, character: localChar, move: localMove } = useI18n();
  const [showControls, setShowControls] = useState(false);

  const info = localChar(character) || character;
  const maxHp = character.stats.health;
  const healthPct = Math.max(0, Math.min(100, (stats.health / maxHp) * 100));
  const meterPct = Math.max(0, Math.min(100, stats.meter));
  const meterFull = meterPct >= 100;
  const dashCd = stats.cooldowns?.dash ?? 0;
  const dashReady = dashCd <= 0;
  const protectedNow = (stats.invuln || 0) > 0;
  const combo = stats.combo || 0;
  const emoteKey = codeToLabel(binds?.emote || "KeyF");
  const accent = character.colors?.accent || "#a855f7";
  const hp = hpColors(healthPct);
  const lowHp = healthPct > 0 && healthPct < 30 && !stats.dead;

  // Barra "fantasma": muestra cuánta vida se perdió y se vacía con retraso.
  const [ghost, setGhost] = useState(healthPct);
  useEffect(() => {
    if (healthPct >= ghost) { setGhost(healthPct); return undefined; }
    const id = setTimeout(() => setGhost(healthPct), 450);
    return () => clearTimeout(id);
  }, [healthPct]); // eslint-disable-line react-hooks/exhaustive-deps

  // Destello rojo al recibir daño.
  const prevHp = useRef(stats.health);
  const [hitFlash, setHitFlash] = useState(0);
  useEffect(() => {
    if (stats.health < prevHp.current - 1 && !stats.dead) setHitFlash((k) => k + 1);
    prevHp.current = stats.health;
  }, [stats.health, stats.dead]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 font-heading">
      {/* Efectos de pantalla */}
      {lowHp && (
        <div className="hud-lowhp absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(185,28,28,0.55) 100%)" }} />
      )}
      {hitFlash > 0 && (
        <motion.div
          key={hitFlash}
          className="absolute inset-0"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(220,38,38,0.8) 100%)" }}
        />
      )}
      {meterFull && !stats.dead && (
        <div className="hud-ult-edge absolute inset-0" style={{ boxShadow: `inset 0 0 90px ${rgba(accent, 0.4)}` }} />
      )}

      <div className="relative flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 self-start rounded bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur hover:bg-black/90"
            style={{ clipPath: CLIP_BAR }}
          >
            <ChevronLeft size={14} /> {t("hud.exit")}
          </button>

          <div
            className="flex w-[min(19rem,calc(100vw-1.5rem))] items-center gap-2.5 p-2 pr-3 backdrop-blur"
            style={{
              clipPath: CLIP_PANEL,
              background: "linear-gradient(135deg, rgba(20,14,36,0.82), rgba(8,8,16,0.78))",
              boxShadow: `0 0 20px ${rgba(accent, 0.25)}`,
            }}
          >
            <Emblem name={info.displayName} colors={character.colors} pct={meterPct} full={meterFull} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-black uppercase tracking-wide text-white">{info.displayName}</span>
                <span className="shrink-0 font-mono text-[10px] text-white/75">
                  <span className="font-bold text-white">{Math.ceil(stats.health)}</span>
                  <span className="text-white/40"> / {maxHp}</span>
                </span>
              </div>

              {/* Vida */}
              <div
                className="relative h-4 w-full bg-black/80"
                style={{ clipPath: CLIP_BAR }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={maxHp}
                aria-valuenow={Math.ceil(stats.health)}
              >
                <div className="absolute inset-y-0 left-0" style={{ width: `${ghost}%`, background: "rgba(255,255,255,0.75)", transition: "width 0.5s ease-out" }} />
                <div
                  className={`absolute inset-y-0 left-0 ${lowHp ? "hud-hp-low" : ""}`}
                  style={{ width: `${healthPct}%`, background: hp.bar, boxShadow: `0 0 10px ${hp.glow}`, transition: "width 0.18s ease-out" }}
                />
                <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))" }} />
                <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent 0,transparent calc(10% - 2px),rgba(0,0,0,0.4) calc(10% - 2px),rgba(0,0,0,0.4) 10%)" }} />
              </div>

              {/* Energía / ultimate */}
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <span className={`font-black tracking-widest ${meterFull ? "text-amber-300" : "text-violet-300"}`}>
                  {meterFull ? `★ ${t("hud.ultReady")}` : t("hud.energy")}
                </span>
                <span className="font-mono text-white/70">{Math.floor(meterPct)}% · {t("hud.hits", { n: stats.hits ?? 0 })}</span>
              </div>
              <div className="relative h-2 w-full bg-black/80" style={{ clipPath: CLIP_BAR_R }}>
                <div
                  className={`absolute inset-y-0 left-0 ${meterFull ? "hud-ring-pulse" : ""}`}
                  style={{
                    width: `${meterPct}%`,
                    background: meterFull ? `linear-gradient(90deg, #f43f5e, ${accent}, #22d3ee)` : "linear-gradient(90deg,#6b21a8,#a855f7,#06b6d4)",
                    boxShadow: meterFull ? `0 0 16px ${rgba(accent, 0.95)}` : "0 0 8px rgba(107,33,168,0.5)",
                    transition: "width 0.2s ease-out",
                  }}
                />
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  <Skull size={10} className="text-[#ff9620]" /> {t("hud.kos")} {stats.kills ?? 0}
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/60">{t("hud.deaths")} {stats.deaths ?? 0}</span>
                {protectedNow && (
                  <span className="flex items-center gap-1 rounded bg-cyan-400/20 px-1.5 py-0.5 text-cyan-200">
                    <Shield size={10} /> {t("hud.protected")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {combo > 1 && (
              <motion.div
                key={combo}
                initial={{ scale: 1.55, rotate: -4, opacity: 0.6 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
                className="flex w-fit items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white"
                style={{
                  clipPath: CLIP_BAR,
                  background: `linear-gradient(90deg, #7f1d1d, ${rgba(accent, 0.9)} 70%, #a855f7)`,
                  boxShadow: "0 0 18px rgba(168,85,247,0.7)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                }}
              >
                <Flame size={12} className="text-amber-200" /> {t("hud.combo", { n: combo })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="mb-1 mr-1">
            <Compass heading={stats.heading ?? 0} getHeading={getHeading} />
          </div>
          <div className="mt-6 flex items-center gap-2">
            {!isTouch && (
              <span className="rounded bg-black/70 px-3 py-1 text-[10px] font-semibold tracking-wide text-white/80 backdrop-blur">
                {t("hud.hint")}
              </span>
            )}
            {emote && (
              <button
                onClick={onEmote}
                title={`${t(`shop.item.${emote.id}`)} (${emoteKey})`}
                className="flex items-center gap-1 rounded bg-black/70 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur hover:bg-black/90"
                aria-label={t("hud.emoteAria")}
              >
                <Smile size={14} className="text-emerald-300" /> {t(`shop.item.${emote.id}`)}
                <span className="ml-0.5 rounded bg-white/15 px-1 text-[9px] font-black text-emerald-200">{emoteKey}</span>
              </button>
            )}
            <button onClick={() => setShowControls(true)} className="rounded bg-black/70 p-2 text-white backdrop-blur hover:bg-black/90" aria-label={t("hud.controls")}>
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {!isTouch && (
        <div className="pointer-events-auto relative flex flex-wrap items-end justify-start gap-2">
          {Object.entries(character.moves).map(([key, rawMove]) => {
            const move = localMove(character.id, key, rawMove);
            const cd = stats.cooldowns?.[key] ?? 0;
            const ready = cd <= 0;
            const cost = rawMove.meterCost ?? 0;
            const ultLocked = key === "ultimate" && meterPct < cost;
            const disabled = !ready || ultLocked;
            const isUlt = key === "ultimate";
            return (
              <Slot
                key={key}
                keyLabel={MOVE_KEYS[key]}
                tag={isUlt ? "ULT" : key.toUpperCase()}
                name={move.name}
                Icon={MOVE_ICONS[key] || Swords}
                cd={cd}
                cooldown={rawMove.cooldown}
                disabled={disabled}
                locked={ultLocked}
                lockFill={cost > 0 ? Math.min(100, (meterPct / cost) * 100) : 100}
                isUlt={isUlt}
                full={isUlt && !disabled}
                accent={accent}
                size={isUlt ? 76 : 64}
                onClick={() => onMove(key)}
              />
            );
          })}
          <Slot
            keyLabel={codeToLabel(binds.dash)}
            tag={t("hud.dash")}
            name={t("hud.dash")}
            Icon={Zap}
            cd={dashCd}
            cooldown={1100}
            disabled={!dashReady}
            locked={false}
            lockFill={100}
            isUlt={false}
            full={false}
            accent="#f59e0b"
            amber
            size={64}
            onClick={onDash}
          />
        </div>
      )}

      {showControls && (
        <ControlsPanel binds={binds} audioOn={audioOn} onSave={onSaveBinds} onToggleAudio={onToggleAudio} onClose={() => setShowControls(false)} />
      )}
    </div>
  );
}
