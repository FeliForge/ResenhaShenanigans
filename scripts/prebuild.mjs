import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const GOOD_GAMEAPP =
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/95d297a36528559eb00bdf9db065d5ee6a52f903/src/components/game/GameApp.jsx";
const GOOD_GAMECANVAS =
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/components/game/GameCanvas.jsx";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function ensureSkillsTargetFix(src) {
  if (src.includes("skillsTargetFix")) return src;
  return src.replace(
    'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useRef, useState } from "react";\nimport "@/lib/game/skillsTargetFix";'
  );
}

/** Inject cinematic ultimate support into the full original GameCanvas. */
function injectCinematics(src) {
  if (src.includes("CinematicUltimateManager")) return src;

  // 1) import
  src = src.replace(
    'import { SkillSystem } from "@/lib/game/skills";',
    'import { SkillSystem } from "@/lib/game/skills";\nimport { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";'
  );

  // 2) create manager after skills is constructed — look for common pattern
  if (src.includes("const skills = new SkillSystem")) {
    // Insert after the skills block closes is hard; insert right before doMove instead
    src = src.replace(
      "    function doMove(category) {",
      "    const cinematics = new CinematicUltimateManager({ scene, camera, vfx, skills, game, character, audio });\n\n    function doMove(category) {"
    );
  }

  // 3) ultimate path: try cinematic first
  src = src.replace(
    "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil) return;",
      "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil || cinematics?.isPlaying) return;"
  );

  // Before skills.cast for ultimates, attempt cinematic
  if (!src.includes("hasCinematicUlt")) {
    src = src.replace(
      "      const big = category === \"ultimate\";",
      `      const big = category === "ultimate";
      if (big && hasCinematicUlt(baseCharId)) {
        const origin = player.position.clone();
        const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
        if (cinematics.tryStart(baseCharId, origin, dir)) {
          game.meter = 0;
          return;
        }
      }`
    );
  }

  // 4) update loop — call cinematics.update at start of tick body if present
  // Find "const now = performance.now()" inside tick and inject after
  src = src.replace(
    /function tick\(nowTs\) \{\s*const now = performance\.now\(\);/,
    "function tick(nowTs) {\n      const now = performance.now();\n      if (cinematics) {\n        const cinePlaying = cinematics.update((nowTs - (tick._last || nowTs)) / 1000);\n        tick._last = nowTs;\n        if (cinePlaying) {\n          renderer.render(scene, camera);\n          raf = requestAnimationFrame(tick);\n          return;\n        }\n      }"
  );

  // Fallback simpler update injection if pattern not found
  if (!src.includes("cinematics.update") && src.includes("raf = requestAnimationFrame(tick)")) {
    src = src.replace(
      "      // NPCs",
      "      if (cinematics) cinematics.update(dt);\n\n      // NPCs"
    );
  }

  // 5) dispose
  if (src.includes("return () => {") && !src.includes("cinematics.dispose")) {
    src = src.replace(
      "return () => {",
      "return () => {\n      try { cinematics?.dispose?.(); } catch {}\n"
    );
  }

  return src;
}

function writeIfGood(relPath, src, mustInclude) {
  if (!src || src.length < 5000) {
    console.log("[prebuild] skip short", relPath, src?.length || 0);
    return false;
  }
  for (const s of mustInclude) {
    if (!src.includes(s)) {
      console.log("[prebuild] skip missing", s, "in", relPath);
      return false;
    }
  }
  const out = path.join(root, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, src);
  console.log("[prebuild] wrote", relPath, src.length);
  return true;
}

async function main() {
  // GameApp
  try {
    let ga = await fetchText(GOOD_GAMEAPP);
    ga = ensureSkillsTargetFix(ga);
    writeIfGood("src/components/game/GameApp.jsx", ga, [
      "export default function GameApp",
      "showQuests",
      "ShopPanel",
    ]);
  } catch (e) {
    console.error("[prebuild] GameApp fetch failed:", e?.message || e);
  }

  // GameCanvas
  try {
    let gc = await fetchText(GOOD_GAMECANVAS);
    gc = injectCinematics(gc);
    writeIfGood("src/components/game/GameCanvas.jsx", gc, [
      "buildCity",
      "export default GameCanvas",
      "SkillSystem",
    ]);
  } catch (e) {
    console.error("[prebuild] GameCanvas fetch failed:", e?.message || e);
  }
}

main().catch((e) => {
  console.error("[prebuild] fatal", e);
  // Do not fail the build hard if files already exist on disk
  process.exitCode = 0;
});
