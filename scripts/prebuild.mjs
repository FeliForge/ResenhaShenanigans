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
  if (src.includes("CinematicUltimateManager") && src.includes("tryStart")) return src;

  if (!src.includes("CinematicUltimateManager")) {
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

  // Guard at start of doMove
  src = src.replace(
    "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil) return;",
      "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil || cinematics?.isPlaying) return;"
  );

  // Try cinematic before skills.cast
  if (!src.includes("cinematics.tryStart") && !src.includes("cinematics?.tryStart")) {
    const needle =
      "      const origin = game.player.position.clone();\n      const dir = game.facing.clone().setY(0).normalize();";
    const inject =
      needle +
      "\n      if (category === \"ultimate\" && hasCinematicUlt(baseCharId)) {\n" +
      "        if (cinematics.tryStart(baseCharId, origin, dir)) {\n" +
      "          game.meter = Math.max(0, game.meter - (character.moves.ultimate?.meterCost || 0));\n" +
      "          return;\n" +
      "        }\n" +
      "      }";
    if (src.includes(needle)) {
      src = src.replace(needle, inject);
    } else {
      console.warn("[prebuild] could not inject tryStart — origin/dir pattern missing");
    }
  }

  // Update cinematics each frame
  if (!src.includes("cinematics.update")) {
    const tickNeedle = "      const now = performance.now();\n      const b = bindsRef.current;";
    const tickInject =
      "      const now = performance.now();\n" +
      "      if (cinematics?.isPlaying) {\n" +
      "        cinematics.update(dt);\n" +
      "        renderer.render(scene, camera);\n" +
      "        return;\n" +
      "      }\n" +
      "      const b = bindsRef.current;";
    if (src.includes(tickNeedle)) {
      src = src.replace(tickNeedle, tickInject);
    } else if (src.includes("      // NPCs")) {
      src = src.replace("      // NPCs", "      if (cinematics) cinematics.update(dt);\n\n      // NPCs");
    }
  }

  // Dispose
  if (!src.includes("cinematics?.dispose") && !src.includes("cinematics.dispose")) {
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
  let okApp = false;
  let okCanvas = false;

  try {
    let ga = await fetchText(GOOD_GAMEAPP);
    ga = ensureSkillsTargetFix(ga);
    okApp = writeIfGood("src/components/game/GameApp.jsx", ga, [
      "export default function GameApp",
      "showQuests",
      "ShopPanel",
    ]);
  } catch (e) {
    console.error("[prebuild] GameApp fetch failed:", e?.message || e);
  }

  try {
    let gc = await fetchText(GOOD_GAMECANVAS);
    gc = injectCinematics(gc);
    okCanvas = writeIfGood("src/components/game/GameCanvas.jsx", gc, [
      "buildCity",
      "export default GameCanvas",
      "SkillSystem",
    ]);
  } catch (e) {
    console.error("[prebuild] GameCanvas fetch failed:", e?.message || e);
  }

  // If repo already has good files from a previous run, accept them
  if (!okApp) {
    const p = path.join(root, "src/components/game/GameApp.jsx");
    if (fs.existsSync(p) && fs.readFileSync(p, "utf8").includes("showQuests")) {
      okApp = true;
      console.log("[prebuild] GameApp already present");
    }
  }
  if (!okCanvas) {
    const p = path.join(root, "src/components/game/GameCanvas.jsx");
    if (fs.existsSync(p)) {
      const t = fs.readFileSync(p, "utf8");
      if (t.includes("buildCity") && t.includes("export default GameCanvas") && !t.includes("__CONTINUE__")) {
        okCanvas = true;
        console.log("[prebuild] GameCanvas already present");
      }
    }
  }

  if (!okApp || !okCanvas) {
    console.error("[prebuild] FATAL: missing GameApp or GameCanvas");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[prebuild] fatal", e);
  process.exit(1);
});
