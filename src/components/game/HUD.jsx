// @ts-nocheck
import { useEffect, useState } from "react";
import {
  Activity, ChevronLeft, Gauge, Heart, Settings, Shield, Skull, Smile,
  Sparkles, Zap,
} from "lucide-react";
import { MOVE_KEYS } from "@/data/characters";
import { codeToLabel } from "@/lib/game/input";
import { useI18n } from "@/lib/i18n";
import ControlsPanel from "@/components/game/ControlsPanel";

const CLIP_CARD = "polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%)";

const DIRS = [
  { label: "N", deg: 0 }, { label: "NE", deg: 45 }, { label: "E", deg: 90 },
  { label: "SE", deg: 135 }, { label: "S", deg: 180 }, { label: "SW", deg: 225 },
  { label: "W", deg: 270 }, { label: "NW", deg: 315 },
];

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
        const value = getHeading();
        if (typeof value === "number" && !Number.isNaN(value)) {
          setH((current) => Math.abs(current - value) > 0.8 ? value : current);
        }
      } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getHeading]);

  const rotation = ((h % 360) + 360) % 360;
  const label = dirLabel(rotation);

  return (
    <div
      className="pointer-events-none relative flex h-[58px] w-[58px] shrink-0 items-center justify-center"
      title={String(Math.round(rotation)) + "° " + label}
      aria-label={"Compass " + label + " " + Math.round(rotation) + " degrees"}
    >
      <div className="absolute inset-0 rounded-full border border-cyan-200/30 bg-[#07111d]/90 shadow-[0_0_24px_rgba(34,211,238,.14),inset_0_0_18px_rgba(34,211,238,.08)]" />
      <div
        className="absolute inset-[5px] rounded-full border border-white/10"
        style={{ transform: "rotate(" + (-rotation) + "deg)", transition: "transform 80ms linear" }}
      >
        <div className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[8px] font-black text-rose-300">N</div>
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-white/35">S</div>
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-white/35">W</div>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-white/35">E</div>
        <div className="absolute left-1/2 top-1/2 h-[70%] w-0.5 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1/2 w-full rounded-t bg-rose-400 shadow-[0_0_7px_rgba(251,113,133,.8)]" />
          <div className="h-1/2 w-full rounded-b bg-cyan-100/80" />
        </div>
      </div>
      <div className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-200/15 bg-[#07111d]/95 px-2 py-0.5 text-[8px] font-black tracking-wider text-cyan-100">
        {label} {Math.round(rotation)}°
      </div>
    </div>
  );
}

export default function HUD({
  character, stats, binds, audioOn, isTouch, onMove, onDash, onBack,
  onSaveBinds, onToggleAudio, emote, onEmote, getHeading,
}) {
  const { t, character: localChar, move: localMove } = useI18n();
  const [showControls, setShowControls] = useState(false);

  const info = localChar(character) || character || {};
  const maxHealth = Math.max(1, Number(character?.stats?.health) || 1000);
  const currentHealth = Math.max(0, Number(stats?.health) || 0);
  const healthPct = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
  const meterPct = Math.max(0, Math.min(100, Number(stats?.meter) || 0));
  const meterFull = meterPct >= 100;
  const dashCd = stats?.cooldowns?.dash ?? 0;
  const dashReady = dashCd <= 0;
  const protectedNow = (stats?.invuln || 0) > 0;
  const healthCritical = healthPct <= 25;
  const combo = stats?.combo || 0;
  const emoteKey = codeToLabel(binds?.emote || "KeyF");
  const playerInitial = String(info.displayName || "P").slice(0, 1).toUpperCase();
  const playerColor = character?.colors?.primary || "#f97316";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 font-heading sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-2.5">
          <button
            onClick={onBack}
            className="group flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-[#070b15]/85 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/75 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:border-orange-300/40 hover:bg-[#101827] hover:text-white"
          >
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[0.07] text-orange-200 transition group-hover:bg-orange-300/15">
              <ChevronLeft size={15} />
            </span>
            {t("hud.exit")}
          </button>

          <section className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/12 bg-[#080d19]/85 p-3 shadow-[0_18px_55px_-24px_rgba(0,0,0,.95)] ring-1 ring-white/[0.04] backdrop-blur-xl sm:p-3.5">
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 text-sm font-black text-white shadow-lg"
                style={{ background: "linear-gradient(145deg, " + playerColor + ", #151525)" }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" />
                <span className="relative">{playerInitial}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-white">{info.displayName || "Player"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-200/65">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_7px_rgba(110,231,183,.8)]" />
                  {protectedNow ? t("hud.protected") : "In the arena"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-right">
                <p className="text-[8px] font-black uppercase tracking-wider text-white/35">K / D</p>
                <p className="font-mono text-xs font-black tabular-nums text-white">
                  {stats?.kills ?? 0}<span className="px-1 text-white/25">/</span>{stats?.deaths ?? 0}
                </p>
              </div>
            </div>

            <div className="mb-1.5 flex items-end justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-rose-200">
                <Heart size={11} /> Vitality
              </span>
              <span className="font-mono text-[10px] font-bold tabular-nums text-white/80">
                {Math.ceil(currentHealth)} <span className="text-white/30">/ {maxHealth} HP</span>
              </span>
            </div>
            <div className="relative h-3.5 overflow-hidden rounded-md border border-white/10 bg-black/60">
              <div
                className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-200"
                style={{
                  width: healthPct + "%",
                  background: healthCritical ? "linear-gradient(90deg,#be123c,#fb7185)" : "linear-gradient(90deg,#ea580c,#fb923c,#fbbf24)",
                  boxShadow: healthCritical ? "0 0 14px rgba(244,63,94,.65)" : "0 0 14px rgba(249,115,22,.45)",
                }}
              />
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent 0,transparent 21px,rgba(0,0,0,.65) 21px,rgba(0,0,0,.65) 23px)" }} />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            </div>

            <div className="mb-1.5 mt-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100">
                <Gauge size={11} /> {t("hud.energy")}
              </span>
              <span className="font-mono text-[10px] font-bold tabular-nums text-white/75">
                {Math.floor(meterPct)}% <span className="text-white/30">· {t("hud.hits", { n: stats?.hits ?? 0 })}</span>
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-md border border-white/10 bg-black/60">
              <div
                className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-200"
                style={{
                  width: meterPct + "%",
                  background: "linear-gradient(90deg,#0891b2,#22d3ee,#a5f3fc)",
                  boxShadow: meterFull ? "0 0 16px rgba(34,211,238,.9)" : "0 0 10px rgba(34,211,238,.35)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
              {meterFull && <div className="absolute inset-0 animate-pulse bg-cyan-100/15" />}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg border border-orange-300/15 bg-orange-300/[0.07] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-orange-100/80">
                <Skull size={10} /> {t("hud.kos")} {stats?.kills ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white/50">
                <Activity size={10} /> {t("hud.deaths")} {stats?.deaths ?? 0}
              </span>
              {protectedNow && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-cyan-100">
                  <Shield size={10} /> {t("hud.protected")}
                </span>
              )}
            </div>
          </section>

          {combo > 1 && (
            <div className="flex w-fit items-center gap-2 rounded-xl border border-orange-200/30 bg-gradient-to-r from-orange-500/90 to-rose-500/90 px-3.5 py-2 text-white shadow-[0_8px_30px_rgba(249,115,22,.28)]">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">{t("hud.combo", { n: combo })}</span>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#080d19]/80 px-3 py-2.5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="hidden text-right sm:block">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/35">Navigation</p>
              <p className="mt-1 text-[10px] font-bold text-cyan-100/80">Heading</p>
            </div>
            <Compass heading={stats?.heading ?? 0} getHeading={getHeading} />
          </div>

          <div className="flex items-center gap-2">
            {!isTouch && (
              <span className="hidden rounded-lg border border-white/10 bg-[#080d19]/75 px-3 py-2 text-[9px] font-semibold text-white/45 backdrop-blur-xl xl:block">
                {t("hud.hint")}
              </span>
            )}
            {emote && (
              <button
                onClick={onEmote}
                title={t("shop.item." + emote.id) + " (" + emoteKey + ")"}
                className="flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-[#07150f]/85 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-emerald-100 shadow-lg backdrop-blur-xl transition hover:border-emerald-200/50 hover:bg-emerald-300/10"
                aria-label={t("hud.emoteAria")}
              >
                <Smile size={14} className="text-emerald-200" />
                <span className="hidden sm:inline">{t("shop.item." + emote.id)}</span>
                <span className="rounded-md bg-white/10 px-1.5 py-1 font-mono text-[9px]">{emoteKey}</span>
              </button>
            )}
            <button
              onClick={() => setShowControls(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#080d19]/85 text-white/70 shadow-lg backdrop-blur-xl transition hover:border-orange-300/35 hover:text-orange-100"
              aria-label={t("hud.controls")}
              title={t("hud.controls")}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </div>

      {!isTouch && (
        <div className="pointer-events-auto flex max-w-full flex-wrap items-end gap-2.5">
          {Object.entries(character.moves).map(([key, rawMove]) => {
            const move = localMove(character.id, key, rawMove);
            const cooldown = stats?.cooldowns?.[key] ?? 0;
            const ready = cooldown <= 0;
            const isUlt = key === "ultimate";
            const ultLocked = isUlt && meterPct < (rawMove.meterCost ?? 0);
            const disabled = !ready || ultLocked;
            const cooldownPct = rawMove.cooldown > 0 ? Math.min(100, (cooldown / rawMove.cooldown) * 100) : 0;

            return (
              <button
                key={key}
                onClick={() => onMove(key)}
                disabled={disabled}
                aria-label={move.name}
                title={move.name + " · " + (MOVE_KEYS[key] || "")}
                className="group relative flex h-[76px] w-[82px] flex-col justify-between overflow-hidden border p-2 text-left shadow-[0_8px_24px_rgba(0,0,0,.35)] transition duration-150 hover:-translate-y-1 disabled:translate-y-0"
                style={{
                  clipPath: CLIP_CARD,
                  borderColor: disabled ? "rgba(148,163,184,.16)" : isUlt ? "rgba(251,146,60,.8)" : "rgba(103,232,249,.32)",
                  background: disabled ? "rgba(8,13,25,.82)" : isUlt && meterFull ? "linear-gradient(145deg,rgba(194,65,12,.95),rgba(159,18,57,.95))" : "rgba(8,18,31,.92)",
                  boxShadow: disabled ? "none" : isUlt && meterFull ? "0 0 22px rgba(249,115,22,.35)" : "0 0 18px rgba(34,211,238,.08)",
                  opacity: disabled ? 0.65 : 1,
                }}
              >
                {!disabled && <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/60 to-transparent" />}
                <span className="relative z-10 flex w-full items-center justify-between">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-white">
                    {isUlt ? <Sparkles size={13} /> : <Zap size={13} />}
                  </span>
                  <span className="rounded bg-black/25 px-1.5 py-1 font-mono text-[8px] font-black tracking-wider text-white/75">
                    {isUlt ? "ULT" : key.toUpperCase()}
                  </span>
                </span>
                <span className="relative z-10 min-w-0">
                  <span className="block truncate text-[9px] font-black uppercase tracking-wider text-white/90">{move.name}</span>
                  <span className="mt-1 block font-mono text-[8px] font-bold text-white/45">{MOVE_KEYS[key] || ""}</span>
                </span>
                {disabled && (
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-black/65"
                    style={{ height: cooldownPct + "%" }}
                  />
                )}
              </button>
            );
          })}

          <button
            onClick={onDash}
            disabled={!dashReady}
            title={t("hud.dash")}
            className="group relative flex h-[76px] w-[82px] flex-col justify-between overflow-hidden border p-2 text-left shadow-[0_8px_24px_rgba(0,0,0,.35)] transition duration-150 hover:-translate-y-1 disabled:translate-y-0"
            style={{
              clipPath: CLIP_CARD,
              borderColor: dashReady ? "rgba(251,191,36,.65)" : "rgba(148,163,184,.16)",
              background: dashReady ? "linear-gradient(145deg,rgba(61,34,9,.95),rgba(18,18,28,.95))" : "rgba(8,13,25,.82)",
              boxShadow: dashReady ? "0 0 18px rgba(251,191,36,.12)" : "none",
              opacity: dashReady ? 1 : 0.65,
            }}
          >
            <span className="relative z-10 flex w-full items-center justify-between">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-300/15 text-amber-200"><Zap size={14} /></span>
              <span className="rounded bg-black/25 px-1.5 py-1 text-[8px] font-black uppercase tracking-wider text-amber-100">Dash</span>
            </span>
            <span className="relative z-10">
              <span className="block text-[9px] font-black uppercase tracking-wider text-white/90">{t("hud.dash")}</span>
              <span className="mt-1 block font-mono text-[8px] font-bold text-white/45">{codeToLabel(binds?.dash || "Space")}</span>
            </span>
            {!dashReady && (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-black/65"
                style={{ height: Math.min(100, (dashCd / 1100) * 100) + "%" }}
              />
            )}
          </button>
        </div>
      )}

      {showControls && (
        <ControlsPanel
          binds={binds}
          audioOn={audioOn}
          onSave={onSaveBinds}
          onToggleAudio={onToggleAudio}
          onClose={() => setShowControls(false)}
        />
      )}
    </div>
  );
}
