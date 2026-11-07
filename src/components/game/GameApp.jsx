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
import { loadShop, buyItem, equipItem } from "@/lib/game/shop";
import { getShopItem } from "@/data/shop";
import { CHARACTERS } from "@/data/characters";
import { loadBinds, saveBinds, inputState, DEFAULT_BINDS } from "@/lib/game/input";
import { audio } from "@/lib/game/audio";
import { loadRoomMusic, saveRoomMusic } from "@/lib/game/roomMusic";
import { loadMyLoadout, saveMyLoadout, toLoadout, characterFromLoadout } from "@/lib/game/loadout";

const zeroCooldowns = { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 };

export default function GameApp() {
  const [screen, setScreen] = useState("intro");
  const [character, setCharacter] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [stats, setStats] = useState({ health: 1000, meter: 0, cooldowns: zeroCooldowns, hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false, heading: 0 });
  const [defeat, setDefeat] = useState(null);
  const [feed, setFeed] = useState([]);
  const feedIdRef = useRef(0);
  const [binds, setBinds] = useState(DEFAULT_BINDS);
  const [audioOn, setAudioOn] = useState(true);
  const [matches, setMatches] = useState(null);
  const [isTouch, setIsTouch] = useState(false);
  const [billboardUrl, setBillboardUrl] = useState("");
  const [savedCharacter, setSavedCharacter] = useState(null);
  const [quests, setQuests] = useState(null);
  const [coins, setCoins] = useState(0);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [shop, setShop] = useState({ owned: [], dash: "", emote: "" });
  const [showShop, setShowShop] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopBusy, setShopBusy] = useState(null);
  const [nearShop, setNearShop] = useState(false);
  const [nearHub, setNearHub] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBoombox, setShowBoombox] = useState(false);
  const [showCharacterHub, setShowCharacterHub] = useState(false);
  const countersRef = useRef(null);
  const reportedRef = useRef({});
  const canvasRef = useRef(null);
  const claimable = (quests || []).filter((q) => !q.claimed && (q.progress || 0) >= q.target).length;
  const dashItem = getShopItem(shop.dash);
  const emoteItem = getShopItem(shop.emote);

  const getHeading = useCallback(() => {
    try {
      const h = canvasRef.current?.getHeading?.();
      return typeof h === "number" ? h : (stats.heading || 0);
    } catch {
      return stats.heading || 0;
    }
  }, [stats.heading]);

  useEffect(() => {
    setBinds(loadBinds());
  }, []);

  // Al abrir tiendas/paneles: soltar mouse y bloquear input del juego
  useEffect(() => {
    const open = showShop || showSettings || showBoombox || showCharacterHub;
    if (open) {
      try { document.exitPointerLock?.(); } catch {}
    }
    if (showCharacterHub) {
      inputState.blocked = true;
      return () => { inputState.blocked = false; };
    }
  }, [showShop, showSettings, showBoombox, showCharacterHub]);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    try { setMatches(countMatches()); } catch {}
    const lo = loadMyLoadout();
    if (lo) {
      try {
        setSavedCharacter(characterFromLoadout(lo));
        setBillboardUrl(lo.billboard || "");
      } catch {}
    }
    loadQuests().then((q) => { setQuests(q.quests); setCoins(q.coins); }).catch(() => {});
    loadShop().then(setShop).catch(() => {});
  }, []);

  useEffect(() => {
    audio.init();
    audio.setMuted(!audioOn);
  }, [audioOn]);

  useEffect(() => {
    if (screen !== "play") return;
    reportedRef.current = {};
    const id = setInterval(() => {
      const c = countersRef.current;
      if (!c) return;
      const prev = reportedRef.current || {};
      const deltas = {};
      for (const k of Object.keys(c)) {
        const v = Math.floor(c[k] || 0);
        const p = prev[k] || 0;
        if (v > p) deltas[k] = v - p;
      }
      if (Object.keys(deltas).length === 0) return;
      reportedRef.current = { ...c };
      flushQuests(deltas);
    }, 4000);
    return () => clearInterval(id);
  }, [screen]);

  function createPrivateRoom() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setRoomCode(code);
    setMusicUrl(loadRoomMusic(code) || musicUrl);
  }

  function handleRoomCode(code) {
    const c = String(code || "");
    setRoomCode(c);
    setMusicUrl(loadRoomMusic(c) || "");
  }

  function handleMusicUrl(url) {
    setMusicUrl(url);
    if (roomCode) saveRoomMusic(roomCode, url);
  }

  function toggleAudio() {
    const v = !audioOn;
    setAudioOn(v);
    audio.setMuted(!v);
  }

  function startPlay(char) {
    setCharacter(char);
    setDefeat(null);
    setFeed([]);
    setStats({ health: char.stats?.health || 1000, meter: 0, cooldowns: { ...zeroCooldowns }, hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false, heading: 0 });
    setScreen("play");
    try {
      saveMyLoadout(toLoadout(char, billboardUrl));
      setSavedCharacter(char);
    } catch {}
  }

  function exitToSelect() {
    const c = countersRef.current;
    if (c) {
      const prev = reportedRef.current || {};
      const deltas = {};
      for (const k of Object.keys(c)) {
        const v = Math.floor(c[k] || 0);
        const p = prev[k] || 0;
        if (v > p) deltas[k] = v - p;
      }
      if (Object.keys(deltas).length) flushQuests(deltas);
    }
    setScreen("select");
    setCharacter(null);
  }

  function handleStats(s) {
    setStats(s);
    countersRef.current = s.counters;
  }

  function handleDefeat(info) {
    setDefeat(info);
  }

  function handleRespawn() {
    setDefeat(null);
  }

  function handleFeed(entry) {
    const id = ++feedIdRef.current;
    setFeed((f) => [...f.slice(-8), { ...entry, id }]);
  }

  function handleSaveBinds(b) {
    setBinds(b);
    saveBinds(b);
  }

  async function handleSaveBillboard(url) {
    setBillboardUrl(url);
    if (character) saveMyLoadout(toLoadout(character, url));
  }

  async function handleClaim(id) {
    setClaimingId(id);
    try {
      const r = await claimReward(id);
      setQuests(r.quests); setCoins(r.coins);
    } catch {}
    setClaimingId(null);
  }

  async function flushQuests(extra) {
    try {
      await sendProgress(extra || {});
      const q = await loadQuests();
      setQuests(q.quests); setCoins(q.coins);
    } catch {}
  }

  if (screen === "intro") {
    return <IntroSplash onDone={() => setScreen("menu")} />;
  }

  if (screen === "menu") {
    return (
      <>
      <MusicPlayer screen="menu" suspended={!audioOn} />
      <StartMenu
        matches={matches}
        roomCode={roomCode}
        onRoomCode={handleRoomCode}
        onCreateRoom={createPrivateRoom}
        musicUrl={musicUrl}
        onMusicUrl={handleMusicUrl}
        onPlay={() => setScreen("select")}
        onOpenQuests={() => setShowQuests(true)}
        claimable={claimable}
        savedCharacter={savedCharacter}
        onContinue={() => startPlay(savedCharacter)}
        quests={quests}
        coins={coins}
        questsLoading={questsLoading}
        claimingId={claimingId}
        onClaim={handleClaim}
        binds={binds}
        onSaveBinds={handleSaveBinds}
        audioOn={audioOn}
        onToggleAudio={toggleAudio}
      />
      </>
    );
  }

  if (screen === "workshop") {\n    return (\n      <CharacterWorkshop\n        onConfirm={(char) => {\n          try { saveMyLoadout(toLoadout(char, billboardUrl)); } catch {}\n          setSavedCharacter(char);\n          setScreen("menu");\n        }}\n        onCancel={() => setScreen("menu")}\n      />\n    );\n  }\n\n  if (screen === "select") {
    return (
      <>
        <MusicPlayer screen="select" suspended={!audioOn} />
        <CharacterSelect onConfirm={startPlay} onBack={() => setScreen("menu")} />
      </>
    );
  }

  if (screen === "play" && character) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-background">
        <RoomMusicPlayer url={musicUrl} enabled={audioOn} />
        <MusicPlayer screen="play" suspended={!audioOn || !!musicUrl} />
        <GameCanvas
          ref={canvasRef}
          character={character}
          binds={binds}
          onStats={handleStats}
          roomCode={roomCode.trim() || null}
          musicUrl={musicUrl}
          onRoomMusic={(url) => {
            if (url) {
              setMusicUrl(url);
              if (roomCode) saveRoomMusic(roomCode, url);
            }
          }}
          playerName={character.displayName || "Tú"}
          billboardUrl={billboardUrl}
          dashStyle={dashItem}
          emote={emoteItem}
          onNearShop={setNearShop}
          onRequestShop={() => setShowShop(true)}
          onNearHub={setNearHub}
          onRequestHub={(kind) => {
            if (kind === "settings") setShowSettings(true);
            else if (kind === "music") setShowBoombox(true);
            else if (kind === "character") setShowCharacterHub(true);
          }}
          onDefeat={handleDefeat}
          onRespawn={handleRespawn}
          onFeed={handleFeed}
        />
        <HUD
          character={character}
          stats={stats}
          binds={binds}
          audioOn={audioOn}
          isTouch={isTouch}
          onMove={(cat) => canvasRef.current?.triggerMove(cat)}
          onDash={() => canvasRef.current?.triggerDash()}
          onBack={exitToSelect}
          onSaveBinds={handleSaveBinds}
          onToggleAudio={toggleAudio}
          onSaveBillboard={handleSaveBillboard}
          emote={emoteItem}
          onEmote={() => canvasRef.current?.showEmote()}
          getHeading={getHeading}
        />
        {isTouch && (
          <MobileControls
            onMove={(x, y) => canvasRef.current?.setMobileMove(x, y)}
            onJump={() => canvasRef.current?.triggerJump()}
            onDash={() => canvasRef.current?.triggerDash()}
            onMoveKey={(cat) => canvasRef.current?.triggerMove(cat)}
          />
        )}
        <QuickChat onPhrase={(p) => canvasRef.current?.showQuickChat(p)} />
        <KillFeed entries={feed} />
        <DefeatOverlay open={!!defeat} info={defeat} onRespawn={handleRespawn} />
        {(nearShop || nearHub) && !showShop && !showSettings && !showBoombox && !showCharacterHub && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-white/20 bg-black/70 px-4 py-2 text-center text-sm text-white shadow-lg backdrop-blur">
            {nearHub === "settings" && <span>Presiona <b>E</b> — Configuración</span>}
            {nearHub === "music" && <span>Presiona <b>E</b> — Música</span>}
            {nearHub === "character" && <span>Presiona <b>E</b> — Personaje</span>}
            {nearShop && !nearHub && <span>Presiona <b>E</b> — Tienda</span>}
          </div>
        )}
        {showShop && (
          <ShopPanel
            coins={coins}
            owned={shop.owned}
            dash={shop.dash}
            emote={shop.emote}
            loading={shopLoading}
            busyId={shopBusy}
            onBuy={async (id) => {
              setShopBusy(id);
              try {
                const next = await buyItem(id);
                setShop(next);
                if (typeof next.coins === "number") setCoins(next.coins);
              } catch {}
              setShopBusy(null);
            }}
            onEquip={async (id) => {
              try { setShop(await equipItem(id)); } catch {}
            }}
            moves={character?.moves || {}}\n            onImport={(moves) => setCharacter((current) => current ? { ...current, moves } : current)}\n            onClose={() => setShowShop(false)}
          />
        )}
        {showSettings && (
          <ControlsPanel
            binds={binds}
            audioOn={audioOn}
            onSave={handleSaveBinds}
            onToggleAudio={toggleAudio}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showBoombox && (
          <BoomboxPanel
            roomCode={roomCode}
            onUseInRoom={(url) => {
              if (url) {
                setMusicUrl(url);
                if (roomCode) saveRoomMusic(roomCode, url);
              }
              setShowBoombox(false);
            }}
            onClose={() => setShowBoombox(false)}
          />
        )}
        {showCharacterHub && (
          <div className="absolute inset-0 z-50">
            <CharacterSelect
              onConfirm={(char) => {
                setCharacter(char);
                setSavedCharacter(char);
                saveMyLoadout(toLoadout(char, billboardUrl));
                setShowCharacterHub(false);
              }}
              onBack={() => setShowCharacterHub(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
