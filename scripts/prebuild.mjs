import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

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

  src = src.replace(
    "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil) return;",
    "    function doMove(category) {\n      if (game.dead || performance.now() < game.stunUntil || cinematics?.isPlaying) return;"
  );

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
    if (src.includes(needle)) src = src.replace(needle, inject);
  }

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
    if (src.includes(tickNeedle)) src = src.replace(tickNeedle, tickInject);
    else if (src.includes("      // NPCs"))
      src = src.replace("      // NPCs", "      if (cinematics) cinematics.update(dt);\n\n      // NPCs");
  }

  if (!src.includes("cinematics?.dispose") && !src.includes("cinematics.dispose")) {
    src = src.replace(
      "return () => {",
      "return () => {\n      try { cinematics?.dispose?.(); } catch {}\n"
    );
  }

  return src;
}

function polishVisuals(src) {
  src = src.replace("renderer.toneMappingExposure = 1.05;", "renderer.toneMappingExposure = 1.22;");
  src = src.replace("scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0038);", "scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0026);");
  src = src.replace("scene.fog.density = 0.0026 + 0.0014 * nightFactor;", "scene.fog.density = 0.0019 + 0.0011 * nightFactor;");
  src = src.replace("const SKY_DAY = new THREE.Color(0x9fb8d8);", "const SKY_DAY = new THREE.Color(0xa8c4e8);");
  src = src.replace("const SKY_NIGHT = new THREE.Color(0x2a3a5a);", "const SKY_NIGHT = new THREE.Color(0x152038);");
  src = src.replace("const FOG_DAY = new THREE.Color(0xb8c6d8);", "const FOG_DAY = new THREE.Color(0xc2d0e0);");
  src = src.replace("dir.shadow.mapSize.set(2048, 2048);", "dir.shadow.mapSize.set(2048, 2048);\n    dir.intensity = Math.max(dir.intensity || 1, 1.4);");

  if (!src.includes("cinematicTiming")) {
    src = src.replace(
      'import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";',
      'import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";\nimport "@/lib/game/cinematicTiming";'
    );
  }
  // Visuales únicos de ataque (proyectil/pared/trampa/beam)
  if (!src.includes("skillsVisual")) {
    src = src.replace(
      'import { SkillSystem } from "@/lib/game/skills";',
      'import { SkillSystem } from "@/lib/game/skills";\nimport "@/lib/game/skillsVisual";'
    );
  }
  // GIF billboards
  if (!src.includes("__gifTexTick")) {
    src = src.replace(
      "new THREE.TextureLoader().load(url, (tex) => {",
      "new THREE.TextureLoader().load(url, (tex) => {\n        tex.colorSpace = THREE.SRGBColorSpace;\n        if (/gif/i.test(String(url))) { tex.needsUpdate = true; (game.__gifTex = game.__gifTex || []).push(tex); }"
    );
    src = src.replace(
      "      renderer.render(scene, camera);",
      "      if (game.__gifTex) for (const gt of game.__gifTex) gt.needsUpdate = true; // __gifTexTick\n      renderer.render(scene, camera);"
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

function alreadyGood(relPath, checks) {
  const p = path.join(root, relPath);
  if (!fs.existsSync(p)) return false;
  const t = fs.readFileSync(p, "utf8");
  if (t.includes("__CONTINUE__") || t.includes("PLACEHOLDER")) return false;
  return checks.every((c) => t.includes(c));
}

async function main() {
  let okApp = alreadyGood("src/components/game/GameApp.jsx", [
    "export default function GameApp",
    "showQuests",
  ]);
  let okCanvas = alreadyGood("src/components/game/GameCanvas.jsx", [
    "buildCity",
    "export default GameCanvas",
  ]);

  if (!okApp) {
    try {
      let ga = await fetchText(GAMEAPP_URLS);
      ga = ensureSkillsTargetFix(ga);
      okApp = writeIfGood("src/components/game/GameApp.jsx", ga, [
        "export default function GameApp",
        "showQuests",
        "ShopPanel",
      ]);
    } catch (e) {
      console.error("[prebuild] GameApp failed:", e?.message || e);
    }
  } else console.log("[prebuild] GameApp already good");

  if (!okCanvas) {
    try {
      let gc = await fetchText(GAMECANVAS_URLS);
      gc = injectCinematics(gc);
      gc = polishVisuals(gc);
      okCanvas = writeIfGood("src/components/game/GameCanvas.jsx", gc, [
        "buildCity",
        "export default GameCanvas",
        "SkillSystem",
      ]);
    } catch (e) {
      console.error("[prebuild] GameCanvas failed:", e?.message || e);
    }
  } else {
    console.log("[prebuild] GameCanvas already good — applying polish");
    try {
      const p = path.join(root, "src/components/game/GameCanvas.jsx");
      let gc = fs.readFileSync(p, "utf8");
      gc = injectCinematics(gc);
      gc = polishVisuals(gc);
      fs.writeFileSync(p, gc);
    } catch (e) {
      console.warn("[prebuild] polish existing failed", e?.message || e);
    }
  }

  if (!okApp || !okCanvas) {
    console.error("[prebuild] FATAL: missing GameApp or GameCanvas");
    process.exit(1);
  }
  console.log("[prebuild] OK");
}

main().catch((e) => {
  console.error("[prebuild] fatal", e);
  process.exit(1);
});
