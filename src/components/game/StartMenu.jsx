// @ts-nocheck
import { motion } from "framer-motion";
import { Coins, Copy, Flame, Loader2, Play, ScrollText, Swords, Trophy, UserPlus, Users, Settings, Music, Radio } from "lucide-react";
import DailyQuestsPanel from "@/components/game/DailyQuestsPanel";
import ControlsPanel from "@/components/game/ControlsPanel";
import LanguageSelector from "@/components/game/LanguageSelector";
import BoomboxPanel from "@/components/game/BoomboxPanel";
import { lazy, Suspense, useState } from "react";
import { useI18n } from "@/lib/i18n";

const SecretRoom = lazy(() => import("@/components/game/SecretRoom"));

export default function StartMenu({
  matches,
  roomCode,
  onRoomCode,
  onCreateRoom,
  musicUrl,
  onMusicUrl,
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
  binds,
  onSaveBinds,
  audioOn,
  onToggleAudio,
}) {
  const { t } = useI18n();
  const [showQuests, setShowQuests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showBoombox, setShowBoombox] = useState(false);
  const saved = savedCharacter;

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-[#0a0a14] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,150,32,0.18),_transparent_55%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-[#ff9620]">
            <Swords size={22} />
            <Flame size={18} />
          </div>
          <h1 className="font-heading text-3xl font-black tracking-tight sm:text-4xl">
            Resenha <span className="text-[#ff9620]">Shenanigans</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">{t("menu.subtitle") || "Arena urbana"}</p>
          {matches != null && (
            <p className="mt-2 text-xs text-white/40">
              <Trophy size={12} className="mr-1 inline" />
              {matches} {t("menu.matches") || "partidas"}
            </p>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <button
            onClick={onPlay}
            className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#ff9620] to-[#ff3b2f] px-6 py-4 text-base font-black uppercase tracking-[0.12em] text-[#0a0a14] shadow-[0_12px_45px_-12px_rgba(255,150,31,0.9)] transition hover:brightness-110 active:scale-[0.99]"
          >
            <Play size={20} /> {roomCode ? (t("menu.join", { code: roomCode }) || `Unirse ${roomCode}`) : (t("menu.play") || "Jugar")}
          </button>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <Users size={16} className="shrink-0 text-[#ff9620]" />
            <input
              value={roomCode}
              onChange={(e) => onRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("menu.roomPlaceholder") || "Código de sala"}
              inputMode="numeric"
              className="w-full bg-transparent text-center text-sm tracking-[0.3em] text-white outline-none placeholder:tracking-normal placeholder:text-white/35"
            />
          </div>

          {roomCode && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Music size={14} className="text-[#ff9620]" />
                <span>Música del server (YouTube)</span>
              </div>
              <input
                value={musicUrl || ""}
                onChange={(e) => onMusicUrl?.(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <p className="text-[10px] text-white/35">Se reproduce en bucle para todos en la sala</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={onCreateRoom}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[#ff9620]/50 hover:bg-white/10"
            >
              <UserPlus size={16} /> {t("menu.createRoom") || "Crear sala"}
            </button>
            <button
              onClick={() => { setShowQuests(true); onOpenQuests?.(); }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[#ff9620]/50 hover:bg-white/10"
            >
              <ScrollText size={16} /> {t("menu.quests") || "Misiones"}
              {claimable > 0 && (
                <span className="rounded-full bg-[#ff9620] px-1.5 text-[10px] font-black text-[#0a0a14]">{claimable}</span>
              )}
            </button>
            {saved && (
              <button
                onClick={onContinue}
                className="col-span-1 flex items-center justify-center gap-2 rounded-xl border border-[#ff9620]/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#ff9620]/10 sm:col-span-2"
              >
                <Play size={16} /> {t("menu.continue", { name: saved.displayName }) || `Continuar (${saved.displayName})`}
              </button>
            )}
            <button
              onClick={() => setShowBoombox(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#ff9620]/35 bg-[#ff9620]/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#ff9620] transition hover:bg-[#ff9620]/20"
            >
              <Radio size={16} /> Boombox
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-[#ff9620]/50 hover:bg-white/10"
            >
              <Settings size={16} /> {t("menu.settings") || "Ajustes"}
            </button>
          </div>

          <div className="mt-3 flex justify-center">
            <LanguageSelector />
          </div>

          {roomCode && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs">
              <span className="text-white/50">{t("menu.share") || "Código"}</span>
              <span className="font-mono text-base font-bold tracking-[0.3em] text-[#ff9620]">{roomCode}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(roomCode)}
                className="rounded p-1 text-white/50 transition hover:text-[#ff9620]"
                aria-label={t("menu.copy") || "Copiar"}
              >
                <Copy size={14} />
              </button>
            </div>
          )}

          {coins != null && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/60">
              <Coins size={16} className="text-[#ff9620]" /> {coins}
            </div>
          )}
        </motion.div>
      </motion.div>

      {showQuests && (
        <DailyQuestsPanel
          quests={quests}
          coins={coins}
          loading={questsLoading}
          claimingId={claimingId}
          onClaim={onClaim}
          onClose={() => setShowQuests(false)}
        />
      )}
      {showSettings && (
        <ControlsPanel
          binds={binds}
          onSave={onSaveBinds}
          audioOn={audioOn}
          onToggleAudio={onToggleAudio}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showBoombox && (
        <BoomboxPanel
          roomCode={roomCode}
          onUseInRoom={(url) => {
            onMusicUrl?.(url);
            setShowBoombox(false);
          }}
          onClose={() => setShowBoombox(false)}
        />
      )}
      {showSecret && (
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <SecretRoom onClose={() => setShowSecret(false)} />
        </Suspense>
      )}
    </div>
  );
}
