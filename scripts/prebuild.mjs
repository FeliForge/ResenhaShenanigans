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
  try {
    const abs = path.join(root, partsDir);
    if (!fs.existsSync(abs)) return null;
    const a = path.join(abs, "a.b64");
    const b = path.join(abs, "b.b64");
    let b64;
    if (fs.existsSync(a) && fs.existsSync(b)) {
      b64 = fs.readFileSync(a, "utf8").trim() + fs.readFileSync(b, "utf8").trim();
    } else {
      const files = fs.readdirSync(abs).filter((f) => f.endsWith(".b64")).sort();
      if (!files.length) return null;
      b64 = files.map((f) => fs.readFileSync(path.join(abs, f), "utf8").trim()).join("");
    }
    if (!b64 || b64.length < 100) return null;
    return zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
  } catch (e) {
    console.warn("[prebuild] assemble failed", e?.message || e);
    return null;
  }
}

async function fetchText(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.length > 5000 && !text.includes("__CONTINUE__")) {
        console.log("[prebuild] fetched", url.slice(0, 72), text.length);
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

function isFullCanvas(src) {
  return src && src.includes("buildCity") && src.includes("export default") && src.length > 20000 && !src.includes("__CONTINUE__");
}

async function main() {
  // GameCanvas: parts → fetch → keep existing good/stub (never leave broken syntax)
  let gc = assembleGzipB64("scripts/gc_parts");
  if (isFullCanvas(gc)) {
    console.log("[prebuild] GameCanvas from local parts", gc.length);
  } else {
    try {
      gc = await fetchText([
        "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/components/game/GameCanvas.jsx",
        "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/components/game/GameCanvas.jsx",
      ]);
    } catch (e) {
      console.warn("[prebuild] GameCanvas fetch failed, keeping repo file", e?.message || e);
      gc = null;
    }
  }

  if (isFullCanvas(gc)) {
    gc = injectCinematics(gc);
    gc = injectRoomMusic(gc);
    write("src/components/game/GameCanvas.jsx", gc);
  } else {
    const local = path.join(root, "src/components/game/GameCanvas.jsx");
    const cur = fs.existsSync(local) ? fs.readFileSync(local, "utf8") : "";
    if (cur.includes("__CONTINUE__") || (!cur.includes("export default") && !cur.includes("forwardRef"))) {
      console.warn("[prebuild] writing emergency stub GameCanvas");
      write(
        "src/components/game/GameCanvas.jsx",
        `// @ts-nocheck
import { forwardRef, useImperativeHandle } from "react";
const GameCanvas = forwardRef(function GameCanvas(_p, ref) {
  useImperativeHandle(ref, () => ({ triggerMove(){}, triggerDash(){}, triggerJump(){}, setMobileMove(){}, showQuickChat(){}, showEmote(){} }));
  return <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14] text-[#ff9620]">Cargando combate…</div>;
});
export default GameCanvas;
`
      );
    } else {
      console.log("[prebuild] keeping existing GameCanvas", cur.length);
    }
  }

  // gameTexture
  try {
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
  } catch (e) {
    console.warn("[prebuild] gameTexture skip", e?.message || e);
  }

  // GameApp
  try {
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
  } catch (e) {
    console.warn("[prebuild] GameApp skip", e?.message || e);
  }

  console.log("[prebuild] OK");
}

main().catch((e) => {
  console.error("[prebuild] error (non-fatal)", e);
  // Do not exit 1 — allow vite to build with stub so the site stays online
});
