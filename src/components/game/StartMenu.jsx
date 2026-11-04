// @ts-nocheck
import { motion } from "framer-motion";
import { Coins, Copy, Flame, Loader2, Play, ScrollText, Swords, Trophy, UserPlus, Users, Settings } from "lucide-react";
import DailyQuestsPanel from "@/components/game/DailyQuestsPanel";
import ControlsPanel from "@/components/game/ControlsPanel";
import LanguageSelector from "@/components/game/LanguageSelector";
// La sala secreta lleva el código fuente empaquetado: se carga solo al abrirla.
const SecretRoom = lazy(() => import("@/components/game/SecretRoom"));
import { useI18n } from "@/lib/i18n";
import { Suspense, lazy, useState } from "react";

const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 137) % 100}%`,
  bottom: `${(i * 61) % 100}%`,
  delay: `${(i % 8) * 0.9}s`,
  duration: `${7 + (i % 6)}s`,
  size: i % 4 === 0 ? 5 : 3,
}));

export default function StartMenu({
  matches,
  roomCode,
  onRoomCode,
  onCreateRoom,
  onPlay,
  onOpenQuests,
  claimable,
  savedCharacter,
  onContinue,
  quests,
  coins,
  questsLoading,
  claimingId,
  onClaim,
  showQuests,
  onCloseQuests,
  binds,
  audioOn,
  onSaveBinds,
  onToggleAudio,
}) {
  const { t, character: localChar } = useI18n();
  const [showSettings, setShowSettings] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretHits, setSecretHits] = useState(0);

  // Sala secreta: cinco toques en el número de versión.
  function tapVersion() {
    const next = secretHits + 1;
    setSecretHits(next);
    if (next >= 5) { setShowSecret(true); setSecretHits(0); }
  }
  const saved = savedCharacter ? localChar(savedCharacter) : null;

  return (
    <div className="dark absolute inset-0 overflow-y-auto bg-[#0a0a14] text-white">
      {/* ambiente de forja */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-24 h-[520px] w-[520px] rounded-full bg-[#ff9620]/20 blur-[150px]" />
        <div className="absolute -right-32 bottom-0 h-[460px] w-[460px] rounded-full bg-[#ff3b2f]/25 blur-[150px]" />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="ember-dot absolute rounded-full bg-[#ff9620]/80"
            style={{ left: e.left, bottom: e.bottom, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.duration }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_0%,#0a0a14_78%)]" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-7 px-5 py-14 text-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="flex items-center gap-2 rounded-full border border-[#ff9620]/30 bg-[#151523]/70 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#ff9620]">
            <Flame size={12} /> {t("menu.studio")}
          </span>

          <h1 className="font-heading text-[2.6rem] font-black uppercase leading-[0.92] tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-b from-white via-white to-[#ff9620] bg-clip-text text-transparent drop-shadow-[0_12px_45px_rgba(255,138,30,0.35)]">
              Resenha
            </span>
            <br />
            <span className="bg-gradient-to-b from-white via-white to-[#ff9620] bg-clip-text text-transparent drop-shadow-[0_12px_45px_rgba(255,138,30,0.35)]">
              Shenanigans
            </span>
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
            <span className="rounded-full border border-white/10 px-3 py-1">{t("menu.players")}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{t("menu.city")}</span>
            <button
              type="button"
              onClick={tapVersion}
              aria-label="v1.4"
              className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/25"
            >
              v1.4
            </button>
          </div>

          <p className="max-w-lg text-sm text-white/60">{t("menu.tagline")}</p>
        </motion.div>

        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151523]/80 p-4 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.95)] backdrop-blur-sm"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <button
            onClick={onPlay}
            className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#ff9620] to-[#ff3b2f] px-6 py-4 text-base font-black uppercase tracking-[0.12em] text-[#0a0a14] shadow-[0_12px_45px_-12px_rgba(255,150,31,0.9)] transition hover:brightness-110 active:scale-[0.99]"
          >
            <span className="shine pointer-events-none absolute inset-0" />
            <Play size={20} /> {roomCode ? t("menu.join", { code: roomCode }) : t("menu.play")}
          </button>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <Users size={16} className="shrink-0 text-[#ff9620]" />
            <input
              value={roomCode}
              onChange={(e) => onRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("menu.roomPlaceholder")}
              inputMode="numeric"
              className="w-full bg-transparent text-center text-sm tracking-[0.3em] text-white outline-none placeholder:tracking-normal placeholder:text-white/35"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={onCreateRoom}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[#ff9620]/50 hover:bg-white/10"
            >
              <UserPlus size={16} /> {t("menu.createRoom")}
            </button>
            <button
              onClick={onOpenQuests}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[#ff9620]/50 hover:bg-white/10"
            >
              <ScrollText size={16} /> {t("menu.quests")}
              {claimable > 0 && (
                <span className="rounded-full bg-[#ff9620] px-1.5 text-[10px] font-black text-[#0a0a14]">{claimable}</span>
              )}
            </button>
            {saved && (
              <button
                onClick={onContinue}
                className="col-span-1 flex items-center justify-center gap-2 rounded-xl border border-[#ff9620]/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#ff9620]/10 sm:col-span-2"
              >
                <Play size={16} /> {t("menu.continue", { name: saved.displayName })}
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="col-span-1 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[#ff9620]/50 hover:bg-white/10 sm:col-span-2"
            >
              <Settings size={16} /> {t("menu.settings")}
            </button>
          </div>

          <div className="mt-3 flex justify-center">
            <LanguageSelector />
          </div>

          {roomCode && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs">
              <span className="text-white/50">{t("menu.share")}</span>
              <span className="font-mono text-base font-bold tracking-[0.3em] text-[#ff9620]">{roomCode}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(roomCode)}
                className="rounded p-1 text-white/50 transition hover:text-[#ff9620]"
                aria-label={t("menu.copy")}
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          className="flex items-center gap-4 text-[11px] uppercase tracking-[0.25em] text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <span className="flex items-center gap-1.5">
            <Swords size={13} className="text-[#ff9620]" /> Feliforge
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <Coins size={13} /> {coins ?? 0}
          </span>
          {typeof matches === "number" && (
            <span className="flex items-center gap-1.5">
              <Trophy size={13} className="text-[#ff9620]" /> {t("menu.matches", { n: matches })}
            </span>
          )}
        </motion.div>
      </div>

      {showQuests && (
        <DailyQuestsPanel
          quests={quests}
          coins={coins}
          loading={questsLoading}
          claimingId={claimingId}
          onClaim={onClaim}
          onClose={onCloseQuests}
        />
      )}

      {showSecret && (
        <Suspense fallback={<div className="absolute inset-0 z-50 grid place-items-center bg-black/85"><Loader2 size={22} className="animate-spin text-[#ff9620]" /></div>}>
          <SecretRoom onClose={() => setShowSecret(false)} />
        </Suspense>
      )}

      {showSettings && binds && (
        <ControlsPanel
          binds={binds}
          audioOn={audioOn}
          onSave={onSaveBinds}
          onToggleAudio={onToggleAudio}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}