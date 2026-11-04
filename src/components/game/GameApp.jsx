// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { countMatches, recordMatch } from "@/lib/game/records";
import GameCanvas from "@/components/game/GameCanvas";
import CharacterSelect from "@/components/game/CharacterSelect";
import HUD from "@/components/game/HUD";
import QuickChat from "@/components/game/QuickChat";
import MobileControls from "@/components/game/MobileControls";
import ShopPanel from "@/components/game/ShopPanel";
import IntroSplash from "@/components/game/IntroSplash";
import StartMenu from "@/components/game/StartMenu";
import DefeatOverlay from "@/components/game/DefeatOverlay";
import KillFeed from "@/components/game/KillFeed";
import { loadQuests, sendProgress, claimReward } from "@/lib/game/quests";
import { loadShop, buyItem, equipItem } from "@/lib/game/shop";
import { getShopItem } from "@/data/shop";
import { loadBinds, saveBinds, inputState } from "@/lib/game/input";
import { audio } from "@/lib/game/audio";
import { loadMyLoadout, saveMyLoadout, toLoadout, characterFromLoadout } from "@/lib/game/loadout";

const zeroCooldowns = { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 };

export default function GameApp() {
  const [screen, setScreen] = useState("intro");
  const [character, setCharacter] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [stats, setStats] = useState({ health: 1000, meter: 0, cooldowns: zeroCooldowns, hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false });
  const [defeat, setDefeat] = useState(null);
  const [feed, setFeed] = useState([]);
  const feedIdRef = useRef(0);
  const [binds, setBinds] = useState(loadBinds());
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
  const countersRef = useRef(null);
  const reportedRef = useRef(null);
  const claimable = (quests || []).filter((q) => !q.claimed && (q.progress || 0) >= q.target).length;
  const dashItem = getShopItem(shop.dash);
  const emoteItem = getShopItem(shop.emote);
  const canvasRef = useRef(null);
  const playStartRef = useRef(0);

  useEffect(() => {
    setMatches(countMatches());
    setIsTouch(typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
    loadMyLoadout()
      .then((lo) => {
        if (!lo) return;
        setBillboardUrl(lo.billboard_url || "");
        setSavedCharacter(characterFromLoadout(lo));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuestsLoading(true);
    loadQuests()
      .then((res) => {
        if (!res) return;
        setQuests(res.quests || []);
        setCoins(res.coins || 0);
      })
      .finally(() => setQuestsLoading(false));
  }, []);

  useEffect(() => {
    setShopLoading(true);
    loadShop()
      .then((res) => {
        if (!res) return;
        setShop({ owned: res.owned || [], dash: res.dash || "", emote: res.emote || "" });
        setCoins(res.coins || 0);
      })
      .finally(() => setShopLoading(false));
  }, []);

  // Con la tienda abierta el personaje deja de responder al teclado.
  useEffect(() => {
    inputState.blocked = showShop;
  }, [showShop]);

  useEffect(() => {
    const id = setInterval(() => flushQuests(), 8000);
    return () => clearInterval(id);
  }, []);

  // Envía al servidor solo los deltas de cada métrica desde el último informe.
  async function flushQuests(extra) {
    const c = countersRef.current;
    if (!c) return;
    if (!reportedRef.current) { reportedRef.current = { ...c }; return; }
    const prev = reportedRef.current;
    const deltas = { ...(extra || {}) };
    for (const k of Object.keys(c)) {
      const d = Math.round((c[k] || 0) - (prev[k] || 0));
      if (d > 0) deltas[k] = (deltas[k] || 0) + d;
    }
    reportedRef.current = { ...c };
    if (!Object.keys(deltas).length) return;
    const res = await sendProgress(deltas);
    if (res?.quests) setQuests(res.quests);
  }

  function handleStats(s) {
    if (s.counters) countersRef.current = s.counters;
    setStats(s);
    setDefeat((d) => (d && s.dead ? { ...d, respawnIn: s.respawnIn, kills: s.kills, deaths: s.deaths } : d));
  }

  function handleDefeat(payload) {
    setDefeat(payload);
  }

  function handleRespawn() {
    setDefeat(null);
  }

  // Avisos de eliminación recibidos de la sala (se autoeliminan).
  function handleFeed(entry) {
    feedIdRef.current += 1;
    const id = feedIdRef.current;
    setFeed((list) => [...list.slice(-3), { ...entry, id }]);
    setTimeout(() => setFeed((list) => list.filter((item) => item.id !== id)), 4200);
  }

  async function handleClaim(questId) {
    setClaimingId(questId);
    try {
      const res = await claimReward(questId);
      if (res?.quests) setQuests(res.quests);
      if (typeof res?.coins === "number") setCoins(res.coins);
    } catch {
      const fresh = await loadQuests();
      if (fresh) {
        setQuests(fresh.quests || []);
        setCoins(fresh.coins || 0);
      }
    } finally {
      setClaimingId(null);
    }
  }

  async function handleBuy(itemId) {
    setShopBusy(itemId);
    try {
      const res = await buyItem(itemId);
      setShop({ owned: res.owned || [], dash: res.dash || "", emote: res.emote || "" });
      setCoins(res.coins || 0);
    } catch {
      const fresh = await loadShop();
      if (fresh) {
        setShop({ owned: fresh.owned || [], dash: fresh.dash || "", emote: fresh.emote || "" });
        setCoins(fresh.coins || 0);
      }
    } finally {
      setShopBusy(null);
    }
  }

  async function handleEquip(itemId) {
    setShopBusy(itemId);
    try {
      const res = await equipItem(itemId);
      setShop({ owned: res.owned || [], dash: res.dash || "", emote: res.emote || "" });
    } catch {
      /* sin sesión o artículo no comprado */
    } finally {
      setShopBusy(null);
    }
  }

  function startPlay(c) {
    audio.init();
    audio.setMuted(!audioOn);
    countersRef.current = null;
    reportedRef.current = { jumps: 0, distance: 0, dashes: 0, damage: 0, hits: 0, kills: 0, ultimates: 0, skills: 0, playtime: 0 };
    setCharacter(c);
    setDefeat(null);
    setFeed([]);
    setStats({ health: c.stats.health, meter: 0, cooldowns: zeroCooldowns, hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false });
    playStartRef.current = Date.now();
    setScreen("play");
    saveMyLoadout(toLoadout(c, billboardUrl)).catch(() => {});
  }

  function createPrivateRoom() {
    setRoomCode(String(Math.floor(100000 + Math.random() * 900000)));
  }

  async function handleSaveBillboard(url) {
    setBillboardUrl(url);
    if (!character) return;
    await saveMyLoadout(toLoadout(character, url));
  }

  async function exitToSelect() {
    if (character) {
      const duration = Date.now() - playStartRef.current;
      try {
        setMatches(recordMatch({
          character_id: character.id,
          character_name: character.displayName,
          hits: stats.hits ?? 0,
          meter_peak: stats.meterPeak ?? 0,
          duration_ms: duration,
        }));
      } catch (e) { console.error("MatchRecord create failed", e); }
    }
    await flushQuests({ matches: 1, ...(roomCode.trim() ? { multiplayer: 1 } : {}) });
    setNearShop(false);
    setShowShop(false);
    setDefeat(null);
    setFeed([]);
    setScreen("select");
  }

  function handleSaveBinds(next) {
    setBinds(next);
    saveBinds(next);
  }

  function toggleAudio() {
    const v = !audioOn;
    setAudioOn(v);
    audio.setMuted(!v);
  }

  if (screen === "intro") {
    return <IntroSplash onDone={() => setScreen("menu")} />;
  }

  if (screen === "menu") {
    return (
      <StartMenu
        matches={matches}
        roomCode={roomCode}
        onRoomCode={setRoomCode}
        onCreateRoom={createPrivateRoom}
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
        showQuests={showQuests}
        onCloseQuests={() => setShowQuests(false)}
        binds={binds}
        audioOn={audioOn}
        onSaveBinds={handleSaveBinds}
        onToggleAudio={toggleAudio}
      />
    );
  }

  if (screen === "select") {
    return <CharacterSelect onConfirm={startPlay} onBack={() => setScreen("menu")} />;
  }

  if (screen === "play" && character) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-background">
        <GameCanvas
          ref={canvasRef}
          character={character}
          binds={binds}
          onStats={handleStats}
          roomCode={roomCode.trim() || null}
          playerName={character.displayName || "Tú"}
          billboardUrl={billboardUrl}
          dashStyle={dashItem}
          emote={emoteItem}
          onNearShop={setNearShop}
          onRequestShop={() => setShowShop(true)}
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
        <DefeatOverlay
          open={!!defeat}
          character={character}
          archetype={defeat?.archetype}
          respawnIn={defeat?.respawnIn}
          kills={defeat?.kills}
          deaths={defeat?.deaths}
          canvasFlashes={defeat?.deaths}
        />

        {nearShop && !showShop && (
          <button
            onClick={() => setShowShop(true)}
            className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#ff9620]/60 bg-black/85 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur transition hover:bg-[#ff9620]/20"
          >
            Tienda de la forja · pulsa E
          </button>
        )}

        {showShop && (
          <ShopPanel
            coins={coins}
            owned={shop.owned}
            dash={shop.dash}
            emote={shop.emote}
            loading={shopLoading}
            busyId={shopBusy}
            onBuy={handleBuy}
            onEquip={handleEquip}
            onClose={() => setShowShop(false)}
          />
        )}
      </div>
    );
  }

  return null;
}