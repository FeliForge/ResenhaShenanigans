import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

function write(rel, src) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, src);
  console.log("[prebuild] wrote", rel, src.length);
}

function assembleGzipB64(partsDir) {
  const abs = path.join(root, partsDir);
  if (!fs.existsSync(abs)) return null;
  const files = fs.readdirSync(abs).filter((f) => f.endsWith(".b64")).sort();
  if (!files.length) return null;
  const b64 = files.map((f) => fs.readFileSync(path.join(abs, f), "utf8").trim()).join("");
  const buf = Buffer.from(b64, "base64");
  return zlib.gunzipSync(buf).toString("utf8");
}

async function fetchText(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.length > 5000) {
        console.log("[prebuild] fetched", url.slice(0, 70), text.length);
        return text;
      }
    } catch (e) {
      lastErr = e;
      console.warn("[prebuild] fetch fail", e?.message || e);
    }
  }
  throw lastErr || new Error("fetch failed");
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
      '        try { cinematics.tryStart(baseCharId, origin, dir); } catch (err) { console.warn("[cinematic]", err); }\n' +
      "        return;\n" +
      "      }\n" +
      n;
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
  if (!out.includes("const [musicUrl")) {
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
  let gc = assembleGzipB64("scripts/gc_parts");
  if (gc && gc.includes("buildCity") && gc.length > 20000) {
    console.log("[prebuild] GameCanvas from local parts", gc.length);
  } else {
    console.log("[prebuild] local GameCanvas parts missing/invalid, fetching...");
    gc = await fetchText([
      "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/components/game/GameCanvas.jsx",
      "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/components/game/GameCanvas.jsx",
    ]);
  }
  if (!gc.includes("buildCity") || gc.length < 20000) {
    console.error("[prebuild] FATAL: GameCanvas incomplete");
    process.exit(1);
  }
  gc = injectCinematics(gc);
  gc = injectRoomMusic(gc);
  write("src/components/game/GameCanvas.jsx", gc);

  const gtPath = path.join(root, "src/lib/gameTexture.js");
  let gt = fs.existsSync(gtPath) ? fs.readFileSync(gtPath, "utf8") : "";
  if (!gt.includes("makeCharacterTexture") || gt.includes("return null") || gt.length < 3000) {
    gt = await fetchText([
      "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/lib/gameTexture.js",
      "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/lib/gameTexture.js",
    ]);
    write("src/lib/gameTexture.js", gt);
  } else {
    console.log("[prebuild] gameTexture OK", gt.length);
  }

  const gaPath = path.join(root, "src/components/game/GameApp.jsx");
  let ga = fs.existsSync(gaPath) ? fs.readFileSync(gaPath, "utf8") : "";
  if (!ga.includes("export default function GameApp") || ga.includes("__CONTINUE__") || ga.includes("PLACEHOLDER") || ga.length < 5000) {
    ga = await fetchText([
      "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d134aafcdbd4d5b285843bb36a8e3da1b8d4057f/src/components/game/GameApp.jsx",
      "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/95d297a36528559eb00bdf9db065d5ee6a52f903/src/components/game/GameApp.jsx",
    ]);
  }
  ga = ensureSkillsTargetFix(ga);
  ga = ensureRoomMusicImport(ga);
  write("src/components/game/GameApp.jsx", ga);

  console.log("[prebuild] OK");
}

main().catch((e) => {
  console.error("[prebuild] fatal", e);
  process.exit(1);
});
