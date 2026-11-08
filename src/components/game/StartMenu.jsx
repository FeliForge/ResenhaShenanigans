// @ts-nocheck
import { motion } from "framer-motion";
import {
  Coins, Copy, Flame, Loader2, Music, Play, Radio, ScrollText, Swords,
  Trophy, UserPlus, Users, Settings, Wrench, Store, UserRound, ChevronRight,
  Sparkles, Zap,
} from "lucide-react";
import ShopPanel from "@/components/game/ShopPanel";
import DailyQuestsPanel from "@/components/game/DailyQuestsPanel";
import ControlsPanel from "@/components/game/ControlsPanel";
import LanguageSelector from "@/components/game/LanguageSelector";
import BoomboxPanel from "@/components/game/BoomboxPanel";
import AccountPanel from "@/components/game/AccountPanel";
import { useI18n } from "@/lib/i18n";
import { Suspense, lazy, useState } from "react";

const SecretRoom = lazy(() => import("@/components/game/SecretRoom"));

const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: String((i * 137) % 100) + "%",
  bottom: String((i * 61) % 100) + "%",
  delay: String((i % 8) * 0.9) + "s",
  duration: String(7 + (i % 6)) + "s",
  size: i % 4 === 0 ? 5 : 3,
}));

export default function StartMenu({
  matches, roomCode, onRoomCode, onCreateRoom, musicUrl, onMusicUrl, onPlay,
  onOpenQuests, claimable, savedCharacter, onContinue, quests, coins,
  questsLoading, claimingId, onClaim, binds, audioOn, onSaveBinds,
  onToggleAudio, onOpenWorkshop, shop, shopLoading, shopBusy,
  onBuyShopItem, onEquipShopItem, onImportMoves, savedMoves,
}) {
  const { t, character: localChar } = useI18n();
  const [showQuests, setShowQuests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBoombox, setShowBoombox] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [secretHits, setSecretHits] = useState(0);

  function tapVersion() {
    const next = secretHits + 1;
    setSecretHits(next);
    if (next >= 5) {
      setShowSecret(true);
      setSecretHits(0);
    }
  }

  const saved = savedCharacter ? localChar(savedCharacter) : null;

  return (
    <div className="dark absolute inset-0 overflow-x-hidden overflow-y-auto bg-[#060812] text-white selection:bg-orange-400/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-36 h-[560px] w-[560px] rounded-full bg-orange-500/20 blur-[150px]" />
        <div className="absolute left-[38%] top-[8%] h-[520px] w-[620px] rounded-full bg-cyan-500/[0.10] blur-[160px]" />
        <div className="absolute -bottom-48 -right-28 h-[560px] w-[560px] rounded-full bg-rose-600/15 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="ember-dot absolute rounded-full bg-orange-300/90"
            style={{
              left: e.left, bottom: e.bottom, width: e.size, height: e.size,
              animationDelay: e.delay, animationDuration: e.duration,
              boxShadow: "0 0 12px rgba(251,146,60,.65)",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_0%,rgba(5,8,18,.58)_72%,#050711_100%)]" />
      </div>

      <main className="relative mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,.95fr)] lg:gap-10 lg:px-10 lg:py-8">
        <motion.section
          className="relative flex min-w-0 flex-col justify-center py-3 sm:py-6 lg:py-10"
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-300/35 bg-orange-400/10 text-orange-300 shadow-[0_0_35px_rgba(249,115,22,.18)]">
              <Flame size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-200">FeliForge Studios</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Independent game division</p>
            </div>
            <button
              type="button"
              onClick={tapVersion}
              aria-label="v1.4"
              className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] text-white/45 transition hover:border-orange-300/40 hover:text-orange-200"
            >
              BUILD 1.4
            </button>
          </div>

          <div className="mt-9 sm:mt-12">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/25 bg-orange-300/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-orange-200">
                <Sparkles size={11} /> {t("menu.players")}
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
                {t("menu.city")}
              </span>
            </div>

            <h1 className="font-heading text-[clamp(2.65rem,6.8vw,5.8rem)] font-black uppercase leading-[0.79] tracking-[-0.075em]">
              <span className="block bg-gradient-to-b from-white via-white to-slate-300 bg-clip-text pb-1 text-transparent drop-shadow-[0_10px_45px_rgba(255,255,255,.13)]">
                Resenha
              </span>
              <span className="mt-2 block bg-gradient-to-r from-orange-200 via-orange-400 to-rose-500 bg-clip-text pb-2 text-transparent drop-shadow-[0_12px_42px_rgba(249,115,22,.22)]">
                Shenanigans
              </span>
            </h1>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-[2px] w-14 rounded-full bg-gradient-to-r from-orange-300 to-rose-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.34em] text-white/40">Enter the city. Make your name.</span>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300/65 sm:text-base">
              {t("menu.tagline")}
            </p>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3.5 backdrop-blur-xl sm:p-4">
              <div className="mb-2 flex items-center gap-1.5 text-orange-200/70">
                <Trophy size={13} />
                <span className="text-[9px] font-black uppercase tracking-[0.16em]">Matches</span>
              </div>
              <div className="font-mono text-2xl font-black tabular-nums text-white sm:text-3xl">
                {typeof matches === "number" ? matches : "—"}
              </div>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">Played</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3.5 backdrop-blur-xl sm:p-4">
              <div className="mb-2 flex items-center gap-1.5 text-amber-200/80">
                <Coins size={13} />
                <span className="text-[9px] font-black uppercase tracking-[0.16em]">Credits</span>
              </div>
              <div className="font-mono text-2xl font-black tabular-nums text-white sm:text-3xl">{coins ?? 0}</div>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">In wallet</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3.5 backdrop-blur-xl sm:p-4">
              <div className="mb-2 flex items-center gap-1.5 text-cyan-200/80">
                <ScrollText size={13} />
                <span className="text-[9px] font-black uppercase tracking-[0.16em]">Rewards</span>
              </div>
              <div className="font-mono text-2xl font-black tabular-nums text-white sm:text-3xl">{claimable ?? 0}</div>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">Ready to claim</p>
            </div>
          </div>

          <div className="relative mt-6 hidden max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#101827]/90 via-[#111322]/80 to-[#25120f]/75 p-4 sm:block">
            <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-orange-300/10" />
            <div className="absolute -right-1 -top-5 h-28 w-28 rounded-full border border-orange-300/15" />
            <div className="relative flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-orange-300/25 bg-orange-400/10 text-orange-200">
                <Swords size={23} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-200/80">Street arena // online</p>
                <p className="mt-1 text-xs font-semibold text-white/75">Create a room, invite your crew, and take over the block.</p>
              </div>
              <Zap size={18} className="ml-auto shrink-0 text-orange-300/70" />
            </div>
          </div>
        </motion.section>

        <motion.section
          className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[1.8rem] border border-white/15 bg-[#0b1120]/85 p-4 shadow-[0_32px_110px_-35px_rgba(0,0,0,.95)] ring-1 ring-orange-300/[0.08] backdrop-blur-2xl sm:p-6"
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-orange-500/[0.10] blur-[90px]" />

          <div className="relative mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-orange-200/80">Main terminal</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">Ready up</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.9)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/80">System online</span>
            </div>
          </div>

          <button
            onClick={onPlay}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-orange-200/50 bg-gradient-to-r from-orange-300 via-orange-400 to-rose-500 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#180d0a] shadow-[0_13px_38px_-12px_rgba(249,115,22,.7)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99] sm:py-[18px]"
          >
            <span className="shine pointer-events-none absolute inset-0" />
            <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-black/10">
              <Play size={18} fill="currentColor" />
            </span>
            <span className="relative">{roomCode ? t("menu.join", { code: roomCode }) : t("menu.play")}</span>
            <ChevronRight size={19} className="relative ml-auto opacity-70 transition group-hover:translate-x-1" />
          </button>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/55">
                <Users size={13} className="text-cyan-200" /> Private room code
              </label>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">6 digits</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-3 transition focus-within:border-cyan-300/50 focus-within:ring-2 focus-within:ring-cyan-300/10">
              <Users size={16} className="shrink-0 text-cyan-200/70" />
              <input
                value={roomCode}
                onChange={(e) => onRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("menu.roomPlaceholder")}
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-transparent text-center font-mono text-base font-bold tracking-[0.48em] text-white outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-white/30"
              />
              {roomCode && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.8)]" />}
            </div>
          </div>

          {roomCode && (
            <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-100/80">
                <Music size={14} /> Server music · YouTube
              </div>
              <input
                value={musicUrl || ""}
                onChange={(e) => onMusicUrl?.(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/40"
              />
              <p className="mt-1.5 text-[9px] text-white/35">Se reproduce en bucle para todos en la sala</p>
            </div>
          )}

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">Customize your session</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowAccount(true)}
              className="group col-span-2 flex items-center gap-3 rounded-xl border border-sky-300/20 bg-sky-300/[0.055] p-3 text-left transition hover:border-sky-200/50 hover:bg-sky-300/[0.10]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200 transition group-hover:bg-sky-300/20">
                <UserRound size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-sky-100">Cuenta / Nombre de usuario</span>
                <span className="mt-1 block text-[9px] text-white/40">Manage your player identity</span>
              </span>
              <ChevronRight size={16} className="text-sky-200/50 transition group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={onOpenWorkshop}
              className="group flex min-h-[76px] items-center gap-2.5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.045] p-3 text-left transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.09]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200"><Wrench size={17} /></span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-cyan-100">Custom Moveset</span>
                <span className="mt-1 block text-[9px] leading-tight text-white/35">Build your fighter</span>
              </span>
            </button>

            <button
              onClick={() => setShowStore(true)}
              className="group flex min-h-[76px] items-center gap-2.5 rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-3 text-left transition hover:border-amber-200/45 hover:bg-amber-300/[0.09]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><Store size={17} /></span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-100">Tienda</span>
                <span className="mt-1 block text-[9px] leading-tight text-white/35">Items & emotes</span>
              </span>
            </button>

            <button
              onClick={onCreateRoom}
              className="group flex min-h-[70px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-orange-300/40 hover:bg-orange-300/[0.07]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-300/10 text-orange-200"><UserPlus size={17} /></span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-white/85">{t("menu.createRoom")}</span>
                <span className="mt-1 block text-[9px] leading-tight text-white/35">Generate an invite code</span>
              </span>
            </button>

            <button
              onClick={() => { setShowQuests(true); onOpenQuests?.(); }}
              className="group relative flex min-h-[70px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-orange-300/40 hover:bg-orange-300/[0.07]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-300/10 text-orange-200"><ScrollText size={17} /></span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-white/85">{t("menu.quests")}</span>
                <span className="mt-1 block text-[9px] leading-tight text-white/35">Daily objectives</span>
              </span>
              {claimable > 0 && <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-orange-300 px-1 text-[9px] font-black text-[#211006]">{claimable}</span>}
            </button>

            {saved && (
              <button
                onClick={onContinue}
                className="group col-span-2 flex items-center gap-3 rounded-xl border border-orange-300/30 bg-gradient-to-r from-orange-400/[0.12] to-rose-400/[0.06] p-3 text-left transition hover:border-orange-200/60 hover:from-orange-400/[0.18]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-300/15 text-orange-200"><Play size={17} fill="currentColor" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-orange-200/80">Saved fighter</span>
                  <span className="mt-1 block truncate text-xs font-bold text-white">{t("menu.continue", { name: saved.displayName })}</span>
                </span>
                <ChevronRight size={17} className="text-orange-200/60 transition group-hover:translate-x-1" />
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
            >
              <Settings size={15} /> {t("menu.settings")}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
            <LanguageSelector />
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Local profile
            </div>
          </div>

          {roomCode && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-orange-300/20 bg-orange-300/[0.06] px-3 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/45">{t("menu.share")}</span>
              <span className="font-mono text-lg font-black tracking-[0.28em] text-orange-200">{roomCode}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(roomCode)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-white/55 transition hover:bg-orange-300/15 hover:text-orange-100"
                aria-label={t("menu.copy")}
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </motion.section>

        <motion.footer
          className="col-span-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 pb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/35 lg:col-span-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <span className="flex items-center gap-2"><Swords size={13} className="text-orange-300" /> FeliForge Studios</span>
          <span className="flex items-center gap-2 text-amber-200/80"><Coins size={13} /> {coins ?? 0} credits</span>
          {typeof matches === "number" && <span className="flex items-center gap-2"><Trophy size={13} className="text-orange-300" /> {t("menu.matches", { n: matches })}</span>}
          <button
            type="button"
            onClick={() => setShowBoombox(true)}
            className="flex items-center gap-2 transition hover:text-orange-200"
          >
            <Radio size={13} className="text-orange-300" /> Boombox
          </button>
        </motion.footer>
      </main>

      {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}

      {showStore && (
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
        <Suspense fallback={<div className="absolute inset-0 z-50 grid place-items-center bg-black/85"><Loader2 size={22} className="animate-spin text-orange-300" /></div>}>
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
