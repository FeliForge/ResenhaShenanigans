import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const GAMETEXTURE_URLS = [
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/lib/gameTexture.js",
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/lib/gameTexture.js",
];

async function restoreGameTexture() {
  try {
    const current = path.join(root, "src/lib/gameTexture.js");
    let need = true;
    if (fs.existsSync(current)) {
      const t = fs.readFileSync(current, "utf8");
      if (t.includes("piernas con degradado") && t.includes("makeBuildingTextures") && t.length > 8000) {
        need = false;
        console.log("[prebuild] gameTexture OK (original characters)");
      }
    }
    if (need) {
      const text = await fetchText(GAMETEXTURE_URLS);
      if (text.includes("makeCharacterTexture") && text.includes("piernas con degradado")) {
        fs.mkdirSync(path.dirname(current), { recursive: true });
        fs.writeFileSync(current, text);
        console.log("[prebuild] restored original gameTexture", text.length);
      }
    }
  } catch (e) {
    console.warn("[prebuild] gameTexture restore failed", e?.message || e);
  }
}

const GAMEAPP_URLS = [
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/95d297a36528559eb00bdf9db065d5ee6a52f903/src/components/game/GameApp.jsx",
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@95d297a36528559eb00bdf9db065d5ee6a52f903/src/components/game/GameApp.jsx",
];
const GAMECANVAS_URLS = [
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/components/game/GameCanvas.jsx",
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/components/game/GameCanvas.jsx",
];

async function fetchText(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.length > 1000) {
        console.log("[prebuild] fetched", url, text.length);
        return text;
      }
    } catch (e) {
      lastErr = e;
      console.warn("[prebuild] fetch fail", url, e?.message || e);
    }
  }
  throw lastErr || new Error("all fetch mirrors failed");
}

function ensureSkillsTargetFix(src) {
  if (src.includes("skillsTargetFix")) return src;
  return src.replace(
    'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useRef, useState } from "react";\nimport "@/lib/game/skillsTargetFix";'
  );
}

function injectCinematics(src) {
  if (!src.includes('from "@/lib/game/cinematics"')) {
    src = src.replace(
      'import { SkillSystem } from "@/lib/game/skills";',
      'import { SkillSystem } from "@/lib/game/skills";\nimport { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";'
    );
  }
  if (!src.includes("new CinematicUltimateManager")) {
    src = src.replace(
      "    function doMove(category) {",
      "    const cinematics = new CinematicUltimateManager({ scene, camera, vfx, skills, game, character, audio });\n\n    function doMove(category) {"
    );
  }
  if (!src.includes("cinematics?.isPlaying")) {
    src = src.replace(
      "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil) return;",
      "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil || cinematics?.isPlaying) return;"
    );
  }
  if (!src.includes("cinematics.tryStart") && !src.includes("cinematics?.tryStart")) {
    const n = "      skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors.accent });";
    const block =
      "      if (category === \"ultimate\" && hasCinematicUlt(baseCharId)) {\n" +
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
  if (src.includes("new MultiplayerManager") && !src.includes("mp.sendMusic")) {
    src = src.replace(
      "mp = new MultiplayerManager(roomCode, connId);",
      "mp = new MultiplayerManager(roomCode, connId);\n      mp.onMusic = (url) => { try { onRoomMusic?.(url); } catch {} };\n      if (musicUrl) { try { mp.sendMusic(musicUrl); } catch {} }"
    );
  }
  return src;
}

function polishVisuals(src) {
  if (!src.includes("cinematicTiming")) {
    src = src.replace(
      'import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";',
      'import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";\nimport "@/lib/game/cinematicTiming";'
    );
  }
  if (!src.includes("skillsVisual")) {
    src = src.replace(
      'import { SkillSystem } from "@/lib/game/skills";',
      'import { SkillSystem } from "@/lib/game/skills";\nimport "@/lib/game/skillsVisual";'
    );
  }
  return src;
}

function writeIfGood(relPath, src, mustInclude) {
  if (!src || src.length < 5000) return false;
  for (const s of mustInclude) {
    if (!src.includes(s)) return false;
  }
  const out = path.join(root, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, src);
  console.log("[prebuild] wrote", relPath, src.length);
  return true;
}

function alreadyGood(relPath, checks) {
  const p = path.join(root, relPath);
  if (!fs.existsSync(p)) return false;
  const t = fs.readFileSync(p, "utf8");
  if (t.includes("__CONTINUE__") || t.includes("PLACEHOLDER")) return false;
  return checks.every((c) => t.includes(c));
}

async function main() {
  await restoreGameTexture();

  let okApp = alreadyGood("src/components/game/GameApp.jsx", ["export default function GameApp", "RoomMusicPlayer"]);
  let okCanvas = alreadyGood("src/components/game/GameCanvas.jsx", ["buildCity", "export default GameCanvas"]);

  if (!okApp) {
    try {
      // Prefer repo version if it has RoomMusicPlayer, else good commit + patch
      let ga = null;
      try {
        const local = path.join(root, "src/components/game/GameApp.jsx");
        if (fs.existsSync(local)) {
          const t = fs.readFileSync(local, "utf8");
          if (t.includes("RoomMusicPlayer") && t.length > 5000) ga = t;
        }
      } catch {}
      if (!ga) {
        ga = await fetchText(GAMEAPP_URLS);
        // light music wiring if missing
        if (!ga.includes("RoomMusicPlayer")) {
          ga = ga.replace(
            'import { audio } from "@/lib/game/audio";',
            'import { audio } from "@/lib/game/audio";\nimport RoomMusicPlayer from "@/components/game/RoomMusicPlayer";\nimport { loadRoomMusic, saveRoomMusic } from "@/lib/game/roomMusic";'
          );
        }
      }
      ga = ensureSkillsTargetFix(ga);
      okApp = writeIfGood("src/components/game/GameApp.jsx", ga, ["export default function GameApp"]);
    } catch (e) {
      console.error("[prebuild] GameApp failed:", e?.message || e);
    }
  }

  if (!okCanvas) {
    try {
      let gc = await fetchText(GAMECANVAS_URLS);
      gc = injectCinematics(gc);
      gc = injectRoomMusic(gc);
      gc = polishVisuals(gc);
      okCanvas = writeIfGood("src/components/game/GameCanvas.jsx", gc, ["buildCity", "export default GameCanvas", "SkillSystem"]);
    } catch (e) {
      console.error("[prebuild] GameCanvas failed:", e?.message || e);
    }
  } else {
    try {
      const p = path.join(root, "src/components/game/GameCanvas.jsx");
      let gc = fs.readFileSync(p, "utf8");
      gc = injectCinematics(gc);
      gc = injectRoomMusic(gc);
      gc = polishVisuals(gc);
      fs.writeFileSync(p, gc);
      okCanvas = true;
    } catch (e) {
      console.warn("[prebuild] polish failed", e?.message || e);
    }
  }

  if (!okApp || !okCanvas) {
    console.error("[prebuild] FATAL");
    process.exit(1);
  }
  console.log("[prebuild] OK");
}

main().catch((e) => {
  console.error("[prebuild] fatal", e);
  process.exit(1);
});
