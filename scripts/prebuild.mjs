import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const URLS = {
  gameTexture: [
    "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/lib/gameTexture.js",
    "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/lib/gameTexture.js",
  ],
  gameCanvas: [
    "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/components/game/GameCanvas.jsx",
    "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/components/game/GameCanvas.jsx",
  ],
  gameApp: [
    "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d134aafcdbd4d5b285843bb36a8e3da1b8d4057f/src/components/game/GameApp.jsx",
    "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/95d297a36528559eb00bdf9db065d5ee6a52f903/src/components/game/GameApp.jsx",
  ],
};

async function fetchText(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.length > 1000) {
        console.log("[prebuild] fetched", url.slice(0, 80), text.length);
        return text;
      }
    } catch (e) {
      lastErr = e;
      console.warn("[prebuild] fetch fail", url, e?.message || e);
    }
  }
  throw lastErr || new Error("all mirrors failed");
}

function write(rel, src) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, src);
  console.log("[prebuild] wrote", rel, src.length);
}

function injectCinematics(src) {
  if (!src.includes('from "@/lib/game/cinematics"')) {
    src = src.replace(
      'import { SkillSystem } from "@/lib/game/skills";',
      'import { SkillSystem } from "@/lib/game/skills";\nimport { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";\nimport "@/lib/game/cinematicTiming";\nimport "@/lib/game/skillsVisual";'
    );
  }
  if (!src.includes("new CinematicUltimateManager")) {
    src = src.replace(
      "    function doMove(category) {",
      "    const cinematics = new CinematicUltimateManager({ scene, camera, vfx, skills, game, character, audio });\n\n    function doMove(category) {"
    );
  }
  if (!src.includes("cinematics?.isPlaying") && src.includes("function doMove(category)")) {
    src = src.replace(
      "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil) return;",
      "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil || cinematics?.isPlaying) return;"
    );
  }
  if (!src.includes("cinematics.tryStart") && !src.includes("cinematics?.tryStart")) {
    const n = "      skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors.accent });";
    const block =
      '      if (category === "ultimate" && hasCinematicUlt(baseCharId)) {\n' +
      "        try { cinematics.tryStart(baseCharId, origin, dir); } catch (err) { console.warn(\"[cinematic]\", err); }\n" +
      "        return;\n" +
      "      }\n" + n;
    if (src.includes(n)) src = src.replace(n, block);
  }
  if (!src.includes("cinematics.update") && !src.includes("cinematics?.update")) {
    const tickNeedle = "      const now = performance.now();\n      const b = bindsRef.current;";
    const tickInject =
      "      const now = performance.now();\n" +
      "      if (cinematics?.isPlaying) {\n" +
      "        cinematics.update(dt);\n" +
      "        renderer.render(scene, camera);\n" +
      "        return;\n" +
      "      }\n" +
      "      const b = bindsRef.current;";
    if (src.includes(tickNeedle)) src = src.replace(tickNeedle, tickInject);
  }
  return src;
}

function injectRoomMusic(src) {
  if (src.includes("mp.sendMusic")) return src;
  src = src.replace(
    "roomCode, playerName, billboardUrl, dashStyle, emote,",
    "roomCode, playerName, billboardUrl, dashStyle, emote, musicUrl, onRoomMusic,"
  );
  if (src.includes("new MultiplayerManager")) {
    src = src.replace(
      "mp = new MultiplayerManager(roomCode, connId);",
      "mp = new MultiplayerManager(roomCode, connId);\n      mp.onMusic = (url) => { try { onRoomMusic?.(url); } catch {} };\n      if (musicUrl) { try { mp.sendMusic(musicUrl); } catch {} }"
    );
  }
  return src;
}

function ensureSkillsTargetFix(src) {
  if (src.includes("skillsTargetFix")) return src;
  return src.replace(
    'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useRef, useState } from "react";\nimport "@/lib/game/skillsTargetFix";'
  );
}

function ensureRoomMusicImport(src) {
  if (src.includes("RoomMusicPlayer")) return src;
  let out = src.replace(
    'import { audio } from "@/lib/game/audio";',
    'import { audio } from "@/lib/game/audio";\nimport RoomMusicPlayer from "@/components/game/RoomMusicPlayer";\nimport { loadRoomMusic, saveRoomMusic } from "@/lib/game/roomMusic";'
  );
  if (!out.includes("musicUrl")) {
    out = out.replace(
      'const [roomCode, setRoomCode] = useState("");',
      'const [roomCode, setRoomCode] = useState("");\n  const [musicUrl, setMusicUrl] = useState("");'
    );
  }
  if (!out.includes("<RoomMusicPlayer") && out.includes('screen === "play"')) {
    out = out.replace(
      '<div className="absolute inset-0 overflow-hidden bg-background">\n        <GameCanvas',
      '<div className="absolute inset-0 overflow-hidden bg-background">\n        <RoomMusicPlayer url={musicUrl} enabled={audioOn} />\n        <GameCanvas'
    );
  }
  return out;
}

async function main() {
  try {
    const gt = await fetchText(URLS.gameTexture);
    if (gt.includes("makeCharacterTexture") && gt.includes("piernas con degradado")) {
      write("src/lib/gameTexture.js", gt);
    } else {
      throw new Error("gameTexture content invalid");
    }
  } catch (e) {
    console.error("[prebuild] FATAL gameTexture", e?.message || e);
    process.exit(1);
  }

  try {
    let gc = await fetchText(URLS.gameCanvas);
    if (!gc.includes("buildCity") || gc.length < 20000) throw new Error("GameCanvas too small");
    gc = injectCinematics(gc);
    gc = injectRoomMusic(gc);
    write("src/components/game/GameCanvas.jsx", gc);
  } catch (e) {
    console.error("[prebuild] FATAL GameCanvas", e?.message || e);
    process.exit(1);
  }

  try {
    const local = path.join(root, "src/components/game/GameApp.jsx");
    let ga = fs.existsSync(local) ? fs.readFileSync(local, "utf8") : "";
    if (!ga.includes("export default function GameApp") || ga.includes("__CONTINUE__") || ga.includes("PLACEHOLDER") || ga.length < 5000) {
      ga = await fetchText(URLS.gameApp);
    }
    ga = ensureSkillsTargetFix(ga);
    ga = ensureRoomMusicImport(ga);
    if (!ga.includes("export default function GameApp")) throw new Error("GameApp invalid");
    write("src/components/game/GameApp.jsx", ga);
  } catch (e) {
    console.error("[prebuild] FATAL GameApp", e?.message || e);
    process.exit(1);
  }

  console.log("[prebuild] OK — textures, canvas, app restored");
}

main().catch((e) => {
  console.error("[prebuild] fatal", e);
  process.exit(1);
});
