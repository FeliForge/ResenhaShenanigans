// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from "react";
import { countMatches, recordMatch } from "@/lib/game/records";
import GameCanvas from "@/components/game/GameCanvas";
import CharacterSelect from "@/components/game/CharacterSelect";
import HUD from "@/components/game/HUD";
import QuickChat from "@/components/game/QuickChat";
import MobileControls from "@/components/game/MobileControls";
import ShopPanel from "@/components/game/ShopPanel";
import IntroSplash from "@/components/game/IntroSplash";
import StartMenu from "@/components/game/StartMenu";
import CharacterWorkshop from "@/components/game/CharacterWorkshop";
import DefeatOverlay from "@/components/game/DefeatOverlay";
import KillFeed from "@/components/game/KillFeed";
import RoomMusicPlayer from "@/components/game/RoomMusicPlayer";
import MusicPlayer from "@/components/game/MusicPlayer";
import ControlsPanel from "@/components/game/ControlsPanel";
import BoomboxPanel from "@/components/game/BoomboxPanel";
import { loadQuests, sendProgress, claimReward } from "@/lib/game/quests";
import { loadShop, buyItem, equipItem, openGoofyBox, redeemCode } from "@/lib/game/shop";
import { getShopItem } from "@/data/shop";
import { CHARACTERS } from "@/data/characters";
import { loadBinds, saveBinds, inputState, DEFAULT_BINDS } from "@/lib/game/input";
import { audio } from "@/lib/game/audio";
import { loadRoomMusic, saveRoomMusic } from "@/lib/game/roomMusic";
import { loadMyLoadout, saveMyLoadout, toLoadout, characterFromLoadout } from "@/lib/game/loadout";
import { supabase } from "@/integrations/supabase/client";

const zeroCooldowns = { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 };
const OWNER_EMAIL = "felipejerezgatti@gmail.com";

export default function GameApp() {
  const [screen, setScreen] = useState("intro");
  const [character, setCharacter] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [roomMuted, setRoomMuted] = useState(false);
  const [stats, setStats] = useState({ health: 1000, meter: 0, cooldowns: zeroCooldowns, hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false, heading: 0 });
  const [defeat, setDefeat] = useState(null);
  const [feed, setFeed] = useState([]);
  const feedIdRef = useRef(0);
  const [binds, setBinds] = useState(DEFAULT_BINDS);
  const [audioOn, setAudioOn] = useState(true);
  const [matches, setMatches] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBoombox, setShowBoombox] = useState(false);
  const [showCharacterHub, setShowCharacterHub] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [nearShop, setNearShop] = useState(false);
  const [nearHub, setNearHub] = useState(null);
  const [quests, setQuests] = useState([]);
  const [coins, setCoins] = useState(0);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [shop, setShop] = useState({ owned: [], dash: "", emote: "", cosmetic: "" });
  const [shopLoading, setShopLoading] = useState(false);
  const [shopBusy, setShopBusy] = useState(null);
  const [billboardUrl, setBillboardUrl] = useState("");
  const [savedCharacter, setSavedCharacter] = useState(null);
  const [isTouch, setIsTouch] = useState(false);
  const canvasRef = useRef(null);
  const dashItem = getShopItem(shop.dash);
  const emoteItem = getShopItem(shop.emote);
  const cosmeticItem = getShopItem(shop.cosmetic);

  useEffect(() => {
    setBinds(loadBinds());
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const lo = loadMyLoadout();
    if (lo) {
      const ch = characterFromLoadout(lo);
      if (ch) setSavedCharacter(ch);
      if (lo.billboard) setBillboardUrl(lo.billboard);
    }
  }, []);

  useEffect(() => {
    loadQuests().then((q) => { setQuests(q.quests); setCoins(q.coins); }).catch(() => {});
    loadShop().then(setShop).catch(() => {});
    countMatches().then(setMatches).catch(() => {});
  }, []);

  const handleStats = useCallback((s) => setStats((prev) => ({ ...prev, ...s })), []);
  const handleDefeat = useCallback((info) => setDefeat(info), []);
  const handleRespawn = useCallback(() => {
    setDefeat(null);
    canvasRef.current?.respawn?.();
  }, []);
  const handleFeed = useCallback((entry) => {
    const id = ++feedIdRef.current;
    setFeed((f) => [...f.slice(-8), { ...entry, id }]);
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 4000);
  }, []);

  async function handleBuyShopItem(id) {
    setShopBusy(id);
    try {
      const next = await buyItem(id);
      setShop(next);
      if (typeof next.coins === "number") setCoins(next.coins);
    } catch {}
    setShopBusy(null);
  }

  async function handleEquipShopItem(id) {
    try {
      const next = await equipItem(id);
      setShop(next);
      const item = getShopItem(id);
      if (item?.kind === "cosmetic") canvasRef.current?.setCosmetic?.(item);
    } catch {}
  }

  async function handleRedeemCode(code) {
    setShopBusy("redeem_code");
    try {
      const result = await redeemCode(code);
      setShop({
        owned: result.owned,
        dash: result.dash,
        emote: result.emote,
        cosmetic: result.cosmetic,
      });
      if (typeof result.coins === "number") setCoins(result.coins);
      return result;
    } finally {
      setShopBusy(null);
    }
  }

  async function handleOpenGoofyBox() {
    setShopBusy("goofy_box");
    try {
      const result = await openGoofyBox();
      setShop({
        owned: result.owned,
        dash: result.dash,
        emote: result.emote,
        cosmetic: result.cosmetic,
      });
      if (typeof result.coins === "number") setCoins(result.coins);
      return result;
    } finally {
      setShopBusy(null);
    }
  }

  async function handleClaim(id) {
    setClaimingId(id);
    try { const r = await claimReward(id); setQuests(r.quests); setCoins(r.coins); } catch {}
    setClaimingId(null);
  }

  function handleSaveBinds(next) {
    setBinds(next);
    saveBinds(next);
  }

  function toggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    audio.setMuted?.(!next);
  }

  function getHeading() {
    return canvasRef.current?.getHeading?.() ?? 0;
  }

  if (screen === "intro") {
    return <IntroSplash onDone={() => setScreen("menu")} />;
  }

  if (screen === "menu") {
    return (
      <StartMenu
        matches={matches}
        savedCharacter={savedCharacter}
        onPlaySolo={() => {
          const ch = savedCharacter || CHARACTERS[0];
          setCharacter(ch);
          setRoomCode("");
          setScreen("play");
          recordMatch().catch(() => {});
        }}
        onPlayMulti={(code) => {
          const ch = savedCharacter || CHARACTERS[0];
          setCharacter(ch);
          setRoomCode(code || "");
          if (code) loadRoomMusic(code).then((u) => u && setMusicUrl(u)).catch(() => {});
          setScreen("play");
          recordMatch().catch(() => {});
        }}
        onSelectCharacter={() => setScreen("select")}
        onOpenWorkshop={() => setScreen("workshop")}
        onOpenQuests={() => setShowQuests(true)}
        claimable={quests.filter((q) => q.done && !q.claimed).length}
        shop={shop}
        shopLoading={shopLoading}
        shopBusy={shopBusy}
        coins={coins}
        onOpenShop={() => setShowShop(true)}
      />
    );
  }

  if (screen === "select") {
    return (
      <CharacterSelect
        onConfirm={(char) => {
          setCharacter(char);
          setSavedCharacter(char);
          saveMyLoadout(toLoadout(char, billboardUrl));
          setScreen("menu");
        }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "workshop") {
    return (
      <CharacterWorkshop
        onBack={() => setScreen("menu")}
        onSave={(char, url) => {
          setSavedCharacter(char);
          if (url) setBillboardUrl(url);
          saveMyLoadout(toLoadout(char, url || billboardUrl));
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "play" && character) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
        <GameCanvas
          ref={canvasRef}
          character={character}
          binds={binds}
          onStats={handleStats}
          roomCode={roomCode}
          playerName={character.name}
          billboardUrl={billboardUrl}
          dashStyle={dashItem}
          emote={emoteItem}
          cosmetic={cosmeticItem}
          onNearShop={setNearShop}
          onRequestShop={() => setShowShop(true)}
          onNearHub={setNearHub}
          onRequestHub={(hub) => {
            if (hub === "settings") setShowSettings(true);
            else if (hub === "music") setShowBoombox(true);
            else if (hub === "character") setShowCharacterHub(true);
          }}
          onDefeat={handleDefeat}
          onRespawn={handleRespawn}
          onFeed={handleFeed}
        />
        {cosmeticItem?.emoji && (
          <div
            className="cosmetic-float-badge pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2 select-none text-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-4xl"
            aria-hidden
          >
            {cosmeticItem.emoji}
          </div>
        )}
        <HUD
          stats={stats}
          character={character}
          coins={coins}
          onOpenShop={() => setShowShop(true)}
          onOpenQuests={() => setShowQuests(true)}
          onOpenSettings={() => setShowSettings(true)}
          claimable={quests.filter((q) => q.done && !q.claimed).length}
        />
        {isTouch && (
          <MobileControls
            onJump={() => canvasRef.current?.triggerJump()}
            onDash={() => canvasRef.current?.triggerDash()}
            onMoveKey={(cat) => canvasRef.current?.triggerMove(cat)}
            setMobileMove={(x, y) => canvasRef.current?.setMobileMove?.(x, y)}
            emote={emoteItem}
            onEmote={() => canvasRef.current?.showEmote()}
            getHeading={getHeading}
          />
        )}
        <QuickChat onPhrase={(p) => canvasRef.current?.showQuickChat(p)} />
        <KillFeed entries={feed} />
        <DefeatOverlay open={!!defeat} info={defeat} onRespawn={handleRespawn} />
        {(nearShop || nearHub) && !showShop && !showSettings && !showBoombox && !showCharacterHub && (
          <div className="pointer-events-none absolute bottom-[11.5rem] left-1/2 z-30 w-[min(92vw,22rem)] -translate-x-1/2 rounded-xl border border-white/20 bg-black/75 px-3 py-2 text-center text-xs text-white shadow-lg backdrop-blur sm:bottom-28 sm:text-sm">
            {isTouch ? (
              <>
                {nearHub === "settings" && <span>Acércate al hub — Configuración</span>}
                {nearHub === "music" && <span>Acércate al hub — Música</span>}
                {nearHub === "character" && <span>Acércate al hub — Personaje</span>}
                {nearShop && !nearHub && <span>Acércate a la tienda</span>}
              </>
            ) : (
              <>
                {nearHub === "settings" && <span>Presiona <b>E</b> — Configuración</span>}
                {nearHub === "music" && <span>Presiona <b>E</b> — Música</span>}
                {nearHub === "character" && <span>Presiona <b>E</b> — Personaje</span>}
                {nearShop && !nearHub && <span>Presiona <b>E</b> — Tienda</span>}
              </>
            )}
          </div>
        )}
        {showShop && (
          <ShopPanel
            coins={coins} owned={shop.owned} dash={shop.dash} emote={shop.emote} cosmetic={shop.cosmetic} loading={shopLoading} busyId={shopBusy}
            onBuy={handleBuyShopItem}
            onEquip={handleEquipShopItem}
            onOpenGoofyBox={handleOpenGoofyBox}
            onRedeemCode={handleRedeemCode}
            onClose={() => setShowShop(false)}
          />
        )}
        {showSettings && (
          <ControlsPanel binds={binds} audioOn={audioOn} onSave={handleSaveBinds} onToggleAudio={toggleAudio} onClose={() => setShowSettings(false)} />
        )}
        {showBoombox && (
          <BoomboxPanel
            roomCode={roomCode}
            onUseInRoom={(url) => { if (url) { setMusicUrl(url); if (roomCode) saveRoomMusic(roomCode, url); } setShowBoombox(false); }}
            onClose={() => setShowBoombox(false)}
          />
        )}
        {showCharacterHub && (
          <div className="absolute inset-0 z-50">
            <CharacterSelect
              onConfirm={(char) => { setCharacter(char); setSavedCharacter(char); saveMyLoadout(toLoadout(char, billboardUrl)); setShowCharacterHub(false); }}
              onBack={() => setShowCharacterHub(false)}
            />
          </div>
        )}
        {musicUrl && !roomMuted && <RoomMusicPlayer url={musicUrl} />}
        <MusicPlayer muted={roomMuted} />
      </div>
    );
  }

  return null;
}
