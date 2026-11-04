// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, Settings, Image, Smile, Zap, Shield, Skull } from "lucide-react";
import { MOVE_KEYS } from "@/data/characters";
import { codeToLabel } from "@/lib/game/input";
import { useI18n } from "@/lib/i18n";
import ControlsPanel from "@/components/game/ControlsPanel";
import BillboardsPanel from "@/components/game/BillboardsPanel";

const CLIP_CARD = "polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%)";
const CLIP_BAR = "polygon(0 0, 100% 0, 97% 100%, 0 100%)";
const CLIP_BAR_R = "polygon(3% 0, 100% 0, 100% 100%, 0 100%)";

export default function HUD({ character, stats, binds, audioOn, isTouch, onMove, onDash, onBack, onSaveBinds, onToggleAudio, billboardUrl, onSaveBillboard, emote, onEmote }) {
  const { t, character: localChar, move: localMove } = useI18n();
  const [showControls, setShowControls] = useState(false);
  const [showBillboards, setShowBillboards] = useState(false);

  const info = localChar(character) || character;
  const healthPct = Math.max(0, (stats.health / character.stats.health) * 100);
  const meterPct = Math.max(0, Math.min(100, stats.meter));
  const meterFull = meterPct >= 100;
  const dashCd = stats.cooldowns?.dash ?? 0;
  const dashReady = dashCd <= 0;
  const protectedNow = (stats.invuln || 0) > 0;
  const combo = stats.combo || 0;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 font-heading">
      {/* Top-left: status */}
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 self-start rounded bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur hover:bg-black/90"
            style={{ clipPath: CLIP_BAR }}
          >
            <ChevronLeft size={14} /> {t("hud.exit")}
          </button>
          <div className="w-72 rounded bg-black/65 p-2 backdrop-blur" style={{ clipPath: CLIP_CARD, boxShadow: "0 0 18px rgba(168,85,247,0.25)" }}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-bold tracking-wide text-white">{info.displayName}</span>
              <span className="shrink-0 font-mono text-[10px] text-white/70">{Math.ceil(stats.health)} HP</span>
            </div>
            {/* HP bar */}
            <div className="relative h-4 w-full bg-black/80" style={{ clipPath: CLIP_BAR }}>
              <div
                className="absolute inset-y-0 left-0 transition-all"
                style={{ width: `${healthPct}%`, background: "linear-gradient(90deg,#7f1d1d,#dc2626,#f59e0b)", boxShadow: "0 0 10px rgba(220,38,38,0.7)" }}
              />
              <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent 0,transparent 22px,rgba(0,0,0,0.35) 22px,rgba(0,0,0,0.35) 24px)" }} />
            </div>
            {/* Meter bar */}
            <div className="mt-1.5 flex items-center justify-between text-[10px]">
              <span className="font-bold tracking-widest text-violet-300">{t("hud.energy")}</span>
              <span className="font-mono text-white/70">{Math.floor(meterPct)}% · {t("hud.hits", { n: stats.hits ?? 0 })}</span>
            </div>
            <div className="relative h-2.5 w-full bg-black/80" style={{ clipPath: CLIP_BAR_R }}>
              <div
                className={`absolute inset-y-0 left-0 transition-all ${meterFull ? "animate-pulse" : ""}`}
                style={{ width: `${meterPct}%`, background: "linear-gradient(90deg,#6b21a8,#a855f7,#06b6d4)", boxShadow: meterFull ? "0 0 16px rgba(168,85,247,0.95)" : "0 0 8px rgba(107,33,168,0.5)" }}
              />
            </div>

            {/* KOs / muertes / protección */}
            <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white/80">
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

          {combo > 1 && (
            <div className="w-fit rounded bg-gradient-to-r from-[#7f1d1d] to-[#a855f7] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_0_18px_rgba(168,85,247,0.7)]">
              {t("hud.combo", { n: combo })}
            </div>
          )}
        </div>

        {/* Top-right: hint + buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {!isTouch && (
            <span className="rounded bg-black/70 px-3 py-1 text-[10px] font-semibold tracking-wide text-white/80 backdrop-blur">
              {t("hud.hint")}
            </span>
          )}
          {emote && (
            <button
              onClick={onEmote}
              title={`${t(`shop.item.${emote.id}`) } (E)`}
              className="flex items-center gap-1 rounded bg-black/70 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur hover:bg-black/90"
              aria-label={t("hud.emoteAria")}
            >
              <Smile size={14} className="text-emerald-300" /> {t(`shop.item.${emote.id}`)}
            </button>
          )}
          <button onClick={() => setShowBillboards(true)} className="rounded bg-black/70 p-2 text-white backdrop-blur hover:bg-black/90" aria-label={t("hud.billboards")}>
            <Image size={16} />
          </button>
          <button onClick={() => setShowControls(true)} className="rounded bg-black/70 p-2 text-white backdrop-blur hover:bg-black/90" aria-label={t("hud.controls")}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Bottom: move cards + dash (hidden on touch — MobileControls covers them) */}
      {!isTouch && (
        <div className="pointer-events-auto flex flex-wrap items-end justify-start gap-2">
          {Object.entries(character.moves).map(([key, rawMove]) => {
            const move = localMove(character.id, key, rawMove);
            const cd = stats.cooldowns?.[key] ?? 0;
            const ready = cd <= 0;
            const ultLocked = key === "ultimate" && meterPct < (rawMove.meterCost ?? 0);
            const disabled = !ready || ultLocked;
            const cdPct = rawMove.cooldown > 0 ? Math.min(100, (cd / rawMove.cooldown) * 100) : 0;
            const isUlt = key === "ultimate";
            return (
              <button
                key={key}
                onClick={() => onMove(key)}
                disabled={disabled}
                className="relative h-16 w-16 text-left transition"
                style={{
                  clipPath: CLIP_CARD,
                  background: disabled ? "rgba(20,20,30,0.7)" : isUlt && meterFull ? "linear-gradient(135deg,#7f1d1d,#a855f7)" : "rgba(15,15,25,0.85)",
                  border: `1.5px solid ${disabled ? "rgba(100,100,120,0.4)" : isUlt ? "rgba(244,63,94,0.9)" : "rgba(168,85,247,0.7)"}`,
                  boxShadow: disabled ? "none" : isUlt && meterFull ? "0 0 18px rgba(244,63,94,0.8)" : "0 0 10px rgba(168,85,247,0.4)",
                }}
              >
                <span className="absolute left-1.5 top-1 text-base font-extrabold text-white">{MOVE_KEYS[key]}</span>
                <span className="absolute right-1.5 top-1.5 text-[8px] font-bold tracking-wider text-violet-300">{key === "ultimate" ? "ULT" : key.toUpperCase()}</span>
                <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] font-semibold text-white/80">{move.name}</span>
                {disabled && <span className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${cdPct}%` }} />}
              </button>
            );
          })}
          <button
            onClick={onDash}
            disabled={!dashReady}
            className="relative h-16 w-16 text-left transition"
            style={{
              clipPath: CLIP_CARD,
              background: dashReady ? "rgba(15,15,25,0.85)" : "rgba(20,20,30,0.7)",
              border: `1.5px solid ${dashReady ? "rgba(245,158,11,0.9)" : "rgba(100,100,120,0.4)"}`,
              boxShadow: dashReady ? "0 0 12px rgba(245,158,11,0.5)" : "none",
            }}
          >
            <Zap size={16} className="absolute left-1.5 top-1 text-amber-400" />
            <span className="absolute right-1.5 top-1.5 text-[8px] font-bold tracking-wider text-amber-300">{t("hud.dash")}</span>
            <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] font-semibold text-white/80">{codeToLabel(binds.dash)}</span>
            {!dashReady && <span className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${Math.min(100, (dashCd / 1100) * 100)}%` }} />}
          </button>
        </div>
      )}

      {showControls && (
        <ControlsPanel binds={binds} audioOn={audioOn} onSave={onSaveBinds} onToggleAudio={onToggleAudio} onClose={() => setShowControls(false)} />
      )}
      {showBillboards && (
        <BillboardsPanel url={billboardUrl} onSave={onSaveBillboard} onClose={() => setShowBillboards(false)} />
      )}
    </div>
  );
}