// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import "@/lib/game/skillsTargetFix";
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
  const [nearShop, setNearShop] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopState, setShopState] = useState(null);
  const [binds, setBinds] = useState(() => loadBinds());
  const [quests, setQuests] = useState(null);
  const canvasRef = useRef(null);
  const characterRef = useRef(null);
  characterRef.current = character;

  useEffect(() => {
    loadQuests().then(setQuests).catch(() => {});
    loadShop().then(setShopState).catch(() => {});
  }, []);

  useEffect(() => {
    if (screen === "play" && character) {
      audio.startAmbient?.();
      return () => audio.stopAmbient?.();
    }
  }, [screen, character]);

  const onSelectCharacter = (c, room) => {
    setCharacter(c);
    setRoomCode(room || "");
    setScreen("play");
    setStats({ health: c.stats?.health || 1000, meter: 0, cooldowns: zeroCooldowns, hits: 0, meterPeak: 0, kills: 0, deaths: 0, combo: 0, invuln: 0, dead: false });
  };

  const onStats = (s) => setStats((prev) => ({ ...prev, ...s }));
  const onDefeat = (info) => setDefeat(info || {});
  const onRespawn = () => setDefeat(null);
  const onFeed = (entry) => {
    const id = ++feedIdRef.current;
    setFeed((f) => [...f.slice(-8), { ...entry, id }]);
  };

  if (screen === "intro") return <IntroSplash onDone={() => setScreen("menu")} />;
  if (screen === "menu") return <StartMenu onPlay={() => setScreen("select")} />;
  if (screen === "select") return <CharacterSelect onSelect={onSelectCharacter} onBack={() => setScreen("menu")} />;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <GameCanvas
        ref={canvasRef}
        character={character}
        binds={binds}
        roomCode={roomCode}
        playerName={character?.name}
        onStats={onStats}
        onNearShop={setNearShop}
        onRequestShop={() => setShopOpen(true)}
        onDefeat={onDefeat}
        onRespawn={onRespawn}
        onFeed={onFeed}
      />
      <HUD stats={stats} character={character} nearShop={nearShop} onOpenShop={() => setShopOpen(true)} onLeave={() => setScreen("menu")} />
      <QuickChat onSend={(phrase) => canvasRef.current?.showQuickChat?.(phrase)} />
      <MobileControls
        onMove={(x, y) => canvasRef.current?.setMobileMove?.(x, y)}
        onAttack={(cat) => canvasRef.current?.triggerMove?.(cat)}
        onDash={() => canvasRef.current?.triggerDash?.()}
        onJump={() => canvasRef.current?.triggerJump?.()}
      />
      {shopOpen && (
        <ShopPanel
          state={shopState}
          onClose={() => setShopOpen(false)}
          onBuy={async (id) => setShopState(await buyItem(id))}
          onEquip={async (id) => setShopState(await equipItem(id))}
        />
      )}
      {defeat && <DefeatOverlay info={defeat} onRespawn={onRespawn} />}
      <KillFeed items={feed} />
    </div>
  );
}
