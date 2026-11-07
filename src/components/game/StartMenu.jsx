// @ts-nocheck
import { motion } from "framer-motion";
import { Coins, Copy, Flame, Loader2, Music, Play, Radio, ScrollText, Swords, Trophy, UserPlus, Users, Settings, Wrench, Store } from "lucide-react";
import ShopPanel from "@/components/game/ShopPanel";
import DailyQuestsPanel from "@/components/game/DailyQuestsPanel";
import ControlsPanel from "@/components/game/ControlsPanel";
import LanguageSelector from "@/components/game/LanguageSelector";
import BoomboxPanel from "@/components/game/BoomboxPanel";
import AccountPanel from "@/components/game/AccountPanel";
import { UserRound } from "lucide-react";
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
  audioOn,
  onSaveBinds,
  onToggleAudio,
  onOpenWorkshop,
  shop,
  shopLoading,
  shopBusy,
  onBuyShopItem,
  onEquipShopItem,
  onImportMoves,
  savedMoves,
}) {
  const { t, character: localChar } = useI18n();
  const [showQuests, setShowQuests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBoombox, setShowBoombox] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [secretHits, setSecretHits] = useState(0);

  // Sala secreta: cinco toques en el número de versión.
  function tapVersion() {
    const next = secretHits + 1;
    setSecretHits(next);
    if (next >= 5) { setShowSecret(true); setSecretHits(0); }
  }
  const saved = savedCharacter ? localChar(savedCharacter) : null;

  return (
    <div className="dark absolute inset-0 overflow-y-auto bg-[#070912] text-white">
      {/* ambiente de forja */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-24 h-[520px] w-[520px] rounded-full bg-[#ff9620]/25 blur-[145px]" />
        <div className="absolute left-1/2 top-1/3 h-[440px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-[150px]" />
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

      <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 px-5 py-10 text-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="flex items-center gap-2 rounded-full border border-[#ff9620]/30 bg-[#151523]/70 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#ff9620]">
            <Flame size={12} /> {t("menu.studio")}
          </span>

          <h1 className="font-heading text-[2.8rem] font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-7xl">
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
          className="relative w-full max-w-xl overflow-hidden rounded-[1.65rem] border border-white/15 bg-gradient-to-b from-[#1b2030]/95 to-[#10121d]/95 p-5 shadow-[0_28px_100px_-30px_rgba(0,0,0,1)] ring-1 ring-orange-300/10 backdrop-blur-xl sm:p-6"
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

          {roomCode && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left">
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
              onClick={onOpenWorkshop}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.08] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/60 hover:bg-cyan-300/15"
            >
              <Wrench size={16} /> Custom Moveset
            </button>
            <button
              onClick={() => setShowStore(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/[0.08] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-200/60 hover:bg-amber-300/15"
            >
              <Store size={16} /> Tienda
            </button>
            <button
              onClick={onCreateRoom}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.045] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/85 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-300/50 hover:bg-orange-400/10 hover:text-white"
            >
              <UserPlus size={16} /> {t("menu.createRoom")}
            </button>
            <button
              onClick={() => { setShowQuests(true); onOpenQuests?.(); }}
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
                className="col-span-1 flex items-center justify-center gap-2 rounded-xl border border-orange-300/45 bg-orange-400/[0.07] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-orange-400/15 sm:col-span-2"
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
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.25em] text-white/40"
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
          <button
            type="button"
            onClick={() => setShowBoombox(true)}
            className="flex items-center gap-1.5 transition hover:text-[#ff9620]"
          >
            <Radio size={13} className="text-[#ff9620]" /> Boombox
          </button>
        </motion.div>
      </div>

      {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}\n\n      {showStore && (
        <ShopPanel
          coins={coins}
          owned={shop?.owned || []}
          dash={shop?.dash || ""}
          emote={shop?.emote || ""}
          loading={shopLoading}
          busyId={shopBusy}
          moves={savedMoves || {}}
          onBuy={onBuyShopItem}
          onEquip={onEquipShopItem}
          onImport={onImportMoves}
          onClose={() => setShowStore(false)}
        />
      )}

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