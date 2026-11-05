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
  src = src.replace("renderer.toneMappingExposure = 1.05;", "renderer.toneMappingExposure = 1.35;");
  src = src.replace("renderer.toneMappingExposure = 1.22;", "renderer.toneMappingExposure = 1.35;");
  src = src.replace("scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0038);", "scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0022);");
  src = src.replace("scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0026);", "scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0022);");
  src = src.replace("scene.fog.density = 0.0026 + 0.0014 * nightFactor;", "scene.fog.density = 0.0016 + 0.0010 * nightFactor;");
  src = src.replace("scene.fog.density = 0.0019 + 0.0011 * nightFactor;", "scene.fog.density = 0.0016 + 0.0010 * nightFactor;");
  src = src.replace("const SKY_DAY = new THREE.Color(0x9fb8d8);", "const SKY_DAY = new THREE.Color(0xb0d0f5);");
  src = src.replace("const SKY_DAY = new THREE.Color(0xa8c4e8);", "const SKY_DAY = new THREE.Color(0xb0d0f5);");
  src = src.replace("const SKY_NIGHT = new THREE.Color(0x2a3a5a);", "const SKY_NIGHT = new THREE.Color(0x0e1a30);");
  src = src.replace("const SKY_NIGHT = new THREE.Color(0x152038);", "const SKY_NIGHT = new THREE.Color(0x0e1a30);");
  src = src.replace("const FOG_DAY = new THREE.Color(0xb8c6d8);", "const FOG_DAY = new THREE.Color(0xc8daf0);");
  src = src.replace("const FOG_DAY = new THREE.Color(0xc2d0e0);", "const FOG_DAY = new THREE.Color(0xc8daf0);");
  if (!src.includes("dir.intensity = Math.max")) {
    src = src.replace(
      "dir.shadow.mapSize.set(2048, 2048);",
      "dir.shadow.mapSize.set(2048, 2048);\n    dir.intensity = Math.max(dir.intensity || 1, 1.55);\n    dir.color = new THREE.Color(0xfff2dd);"
    );
  }
  src = src.replace("hemi.intensity = 0.55", "hemi.intensity = 0.85");
  src = src.replace("hemi.intensity = 0.6", "hemi.intensity = 0.85");
  src = src.replace("ambient.intensity = 0.35", "ambient.intensity = 0.55");

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

  if (!src.includes("loadAnimatedTexture")) {
    src = src.replace(
      'import * as THREE from "three";',
      'import * as THREE from "three";\nimport { loadAnimatedTexture, createAnimTextureRegistry } from "@/lib/game/animatedTexture";'
    );
    src = src.replace(
      "renderer.shadowMap.enabled = true;",
      "const animTex = createAnimTextureRegistry();\n    renderer.shadowMap.enabled = true;"
    );
  }

  if (!src.includes("__animBillboard")) {
    src = src.replace(
      `function applyBillboard(slot, url) {
      const board = city.billboards[slot];
      if (!board || !url || billboardsApplied.get(slot) === url) return;
      billboardsApplied.set(slot, url);
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        board.mat.map?.dispose();
        board.mat.map = tex;
        board.mat.needsUpdate = true;
      });
    }`,
      `function applyBillboard(slot, url) {
      const board = city.billboards[slot];
      if (!board || !url || billboardsApplied.get(slot) === url) return;
      billboardsApplied.set(slot, url);
      // __animBillboard
      const handle = loadAnimatedTexture(url, (tex) => {
        if (!tex) return;
        tex.anisotropy = 4;
        board.mat.map?.dispose();
        board.mat.map = tex;
        board.mat.needsUpdate = true;
      });
      animTex.add(handle);
    }`
    );
  }

  if (!src.includes("animTex.tick") && !src.includes("animTex?.tick")) {
    src = src.replace(
      "      renderer.render(scene, camera);",
      "      animTex?.tick?.();\n      renderer.render(scene, camera);"
    );
  }

  if (!src.includes("__animSprite")) {
    src = src.replace(
      "const playerMat = new THREE.MeshBasicMaterial({ map: playerTex,",
      "let playerMat = new THREE.MeshBasicMaterial({ map: playerTex,"
    );
    src = src.replace(
      `if (character.customImage) {
      playerTex = new THREE.TextureLoader().load(character.customImage);
      playerTex.colorSpace = THREE.SRGBColorSpace;
      playerTex.anisotropy = 4;
    } else {
      playerTex = makeCharacterTexture(character);
    }`,
      `if (character.customImage) {
      // __animSprite
      const sprHandle = loadAnimatedTexture(character.customImage, (tex) => {
        if (!tex) return;
        tex.anisotropy = 4;
        if (playerMat) { playerMat.map = tex; playerMat.needsUpdate = true; }
      });
      animTex.add(sprHandle);
      playerTex = sprHandle.texture;
    } else {
      playerTex = makeCharacterTexture(character);
    }`
    );
  }

  if (!src.includes("animTex?.dispose")) {
    src = src.replace(
      "return () => {",
      "return () => {\n      try { animTex?.dispose?.(); } catch {}"
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
