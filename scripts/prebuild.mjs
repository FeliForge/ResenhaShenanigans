import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

const URLS = [
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df62234634671d27e47d355f86f310c64b/src/components/game/GameCanvas.jsx",
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df62234634671d27e47d355f86f310c64b/src/components/game/GameCanvas.jsx",
];

function isGood(text) {
  return (
    typeof text === "string" &&
    text.length > 40000 &&
    text.includes("buildCity") &&
    text.includes("export default") &&
    !text.includes("__CONTINUE__") &&
    !text.includes("PLACEHOLDER - will replace")
  );
}

function patchBillboards(text) {
  if (text.includes("Fixed city posters are permanent")) return text;
  if (text.includes("function applyBillboard(slot, url)")) {
    text = text.replace(
      /function applyBillboard\(slot, url\) \{[\s\S]*?\n    \}\n\n    let sendMyLoadout = null;\n    function setMyBillboard\(url\) \{[\s\S]*?\n    \}/,
      `function applyBillboard(slot, url) {\n      // Fixed city posters are permanent; ignore player custom overwrites.\n      return;\n    }\n\n    let sendMyLoadout = null;\n    function setMyBillboard(url) {\n      sendMyLoadout?.();\n    }`
    );
  }
  return text;
}

function patchCompass(text) {
  if (text.includes("getHeading")) return text;
  text = text.replace(
    /setDashStyle: \(s\) => apiRef\.current\?\.setDashStyle\(s\),\n  \}\)\);/,
    `setDashStyle: (s) => apiRef.current?.setDashStyle(s),\n    getHeading: () => apiRef.current?.getHeading?.() ?? 0,\n  }));`
  );
  text = text.replace(
    /setDashStyle: \(s\) => vfx\.setDashStyle\(s\) \};/,
    `setDashStyle: (s) => vfx.setDashStyle(s), getHeading: () => { const deg = ((-camState.yaw * 180 / Math.PI) % 360 + 360) % 360; return deg; } };`
  );
  return text;
}

function patchSpawn(text) {
  if (text.includes("player.position.set(0, 14, 0)")) return text;
  text = text.replace("player.position.set(0, 1.6, 0)", "player.position.set(0, 14, 0)");
  text = text.replace("onGround: true, meter: 0", "onGround: false, meter: 0");
  return text;
}

function patchHub(text) {
  if (!text.includes('import { buildHub } from "@/lib/game/buildHub";')) {
    text = text.replace(
      'import { buildShop } from "@/lib/game/buildShop";',
      'import { buildShop } from "@/lib/game/buildShop";\nimport { buildHub } from "@/lib/game/buildHub";'
    );
  }
  if (!text.includes("const hub = buildHub(scene);")) {
    text = text.replace(
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);",
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);\n    const hub = buildHub(scene);\n    city.colliders.push(...hub.colliders);"
    );
  }
  if (text.includes("__INTERACTIVE_HUBS_V1__")) return text;
  text = text.replace(
    "const GameCanvas = forwardRef(function GameCanvas({ character, binds, onStats, roomCode, playerName, billboardUrl, dashStyle, emote, onNearShop, onRequestShop, onDefeat, onRespawn, onFeed }, ref) {",
    "const GameCanvas = forwardRef(function GameCanvas({ character, binds, onStats, roomCode, playerName, billboardUrl, dashStyle, emote, onNearShop, onRequestShop, onNearHub, onRequestHub, onDefeat, onRespawn, onFeed }, ref) {"
  );
  text = text.replace(
    "  onRequestShopRef.current = onRequestShop;",
    "  onRequestShopRef.current = onRequestShop;\n  const onNearHubRef = useRef(onNearHub);\n  onNearHubRef.current = onNearHub;\n  const onRequestHubRef = useRef(onRequestHub);\n  onRequestHubRef.current = onRequestHub;"
  );
  text = text.replace(
    "      mobileMove: { x: 0, y: 0, active: false }, lastSeat: null,",
    "      mobileMove: { x: 0, y: 0, active: false }, lastSeat: null, nearHub: null,"
  );
  text = text.replace(
    '      if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }',
    '      if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }\n      if (e.code === "KeyE" && game.nearHub) { onRequestHubRef.current?.(game.nearHub); return; }'
  );
  text = text.replace(
    "      // Puesto de la tienda: avisa al HUD cuando el jugador está cerca.\n      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;",
    "      // Tienda y tres kioscos interactivos de la plaza.\n      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;"
  );
  const shopEnd = "        onNearShopRef.current?.(nearShop);\n      }";
  text = text.replace(
    shopEnd,
    shopEnd + "\n      const nearestHub = hub.zones.find((zone) => game.player.position.distanceTo(zone.position) < 9);\n      const nearHub = nearestHub?.kind || null;\n      if (nearHub !== game.nearHub) { game.nearHub = nearHub; onNearHubRef.current?.(nearHub); }"
  );
  text = text.replace(
    "    // Puesto de la tienda dentro de la plaza.\n    const shop = buildShop(scene);",
    "    // Puesto de la tienda y kioscos interactivos dentro de la plaza.\n    const shop = buildShop(scene);"
  );
  if (!text.includes("onRequestHubRef.current?.(game.nearHub)")) throw new Error("Hub keyboard action insertion failed");
  if (!text.includes("onNearHubRef.current?.(nearHub)")) throw new Error("Hub proximity insertion failed");
  return text.replace(
    "const GameCanvas = forwardRef(function GameCanvas",
    "/* __INTERACTIVE_HUBS_V1__ */\nconst GameCanvas = forwardRef(function GameCanvas"
  );
}

function patchCameraControls(text) {
  text = text.replace(
    /camState\.pitch = THREE\.MathUtils\.clamp\(camState\.pitch \+ dy \* 0\.004,\s*[^,]+,\s*[^)]+\)/g,
    "camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, -0.15, 1.45)"
  );

  // __MOUSE_WHEEL_ZOOM_V1__: mouse-wheel zoom with clamped orbit distance.
  if (!text.includes("__MOUSE_WHEEL_ZOOM_V1__")) {
    const camStatePattern = /const camState = \{[^\n]+\};/;
    if (!camStatePattern.test(text)) throw new Error("Camera state not found for mouse-wheel zoom");
    text = text.replace(
      camStatePattern,
      (match) => match + "\n    // __MOUSE_WHEEL_ZOOM_V1__\n    const onWheelZoom = (e) => {\n      e.preventDefault();\n      const delta = THREE.MathUtils.clamp(e.deltaY, -180, 180);\n      camState.dist = THREE.MathUtils.clamp(camState.dist + delta * 0.012, 1.65, 26);\n    };\n    renderer.domElement.addEventListener(\"wheel\", onWheelZoom, { passive: false });"
    );
  }

  if (!text.includes("__MP_POINTER_LOCK__")) {
    const neu = [
      "    // __MP_POINTER_LOCK__",
      "    const onPointerDown = (e) => {",
      "      if (document.pointerLockElement !== renderer.domElement) {",
      "        try { renderer.domElement.requestPointerLock(); } catch (_) {}",
      "        camState.dragging = true;",
      "        camState.lastX = e.clientX; camState.lastY = e.clientY;",
      "        return;",
      "      }",
      "      if (e.button === 0) { try { doMove(\"m1\"); } catch (_) {} }",
      "    };",
      "    const onPointerMove = (e) => {",
      "      if (document.pointerLockElement === renderer.domElement) {",
      "        camState.yaw -= (e.movementX || 0) * 0.0022;",
      "        camState.pitch = THREE.MathUtils.clamp(camState.pitch + (e.movementY || 0) * 0.0022, -0.15, 1.45);",
      "        return;",
      "      }",
      "      if (!camState.dragging) return;",
      "      const dx = e.clientX - camState.lastX;",
      "      const dy = e.clientY - camState.lastY;",
      "      camState.lastX = e.clientX; camState.lastY = e.clientY;",
      "      camState.yaw -= dx * 0.004;",
      "      camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, -0.15, 1.45);",
      "    };",
      "    const onPointerUp = () => { camState.dragging = false; };",
      "    renderer.domElement.addEventListener(\"pointerdown\", onPointerDown);",
      "    window.addEventListener(\"pointermove\", onPointerMove);",
      "    window.addEventListener(\"pointerup\", onPointerUp);",
    ].join("\n");
    const reHandlers = /const onPointerDown = \(e\) => \{[\s\S]*?window\.addEventListener\("pointerup", onPointerUp\);/;
    if (reHandlers.test(text)) text = text.replace(reHandlers, neu.trim());
    else text = text.replace(/(const camState = \{[^}]+\};)/, "$1\n" + neu);
  }

  // __FIRST_PERSON_CAMERA_V1__: smooth first-person transition with hysteresis.
  if (!text.includes("__FIRST_PERSON_CAMERA_V1__")) {
    const oldCamera = [
      "      // Cámara orbital (más cerca y girando lentamente durante la derrota)",
      "      const camYaw = camState.yaw + (game.dead ? elapsed * 0.14 : 0);",
      "      const camDist = game.dead ? camState.dist * 0.62 : camState.dist;",
      "      const camPitch = game.dead ? Math.min(0.46, camState.pitch) : camState.pitch;",
      "      const off = new THREE.Vector3(",
      "        Math.sin(camYaw) * Math.cos(camPitch) * camDist,",
      "        Math.sin(camPitch) * camDist + 2,",
      "        Math.cos(camYaw) * Math.cos(camPitch) * camDist",
      "      );",
      "      const camTarget = game.player.position.clone().add(off);",
      "      camera.position.lerp(camTarget, 0.12);",
      "      camera.lookAt(game.player.position.x, game.player.position.y + 0.5, game.player.position.z);",
    ].join("\n");

    const newCamera = [
      "      // __FIRST_PERSON_CAMERA_V1__",
      "      // Scroll close to enter first person; scroll back to restore the orbit camera.",
      "      const camYaw = camState.yaw + (game.dead ? elapsed * 0.14 : 0);",
      "      const camDist = game.dead ? camState.dist * 0.62 : camState.dist;",
      "      const camPitch = game.dead ? Math.min(0.46, camState.pitch) : camState.pitch;",
      "",
      "      if (game.dead) camState.firstPerson = false;",
      "      if (!camState.firstPerson && camState.dist <= 2.25) camState.firstPerson = true;",
      "      else if (camState.firstPerson && camState.dist >= 3.05) camState.firstPerson = false;",
      "      const firstPerson = !game.dead && !!camState.firstPerson;",
      "      sprite.visible = !firstPerson;",
      "",
      "      const off = new THREE.Vector3(",
      "        Math.sin(camYaw) * Math.cos(camPitch) * camDist,",
      "        Math.sin(camPitch) * camDist + 2,",
      "        Math.cos(camYaw) * Math.cos(camPitch) * camDist",
      "      );",
      "      const orbitTarget = game.player.position.clone().add(off);",
      "      const eyeTarget = game.player.position.clone().add(new THREE.Vector3(0, 1.02, 0));",
      "      camera.position.lerp(firstPerson ? eyeTarget : orbitTarget, firstPerson ? 0.24 : 0.12);",
      "",
      "      if (firstPerson) {",
      "        // __FIRST_PERSON_VIEW_DIRECTION_V2__: first-person forward uses the game's +Z-facing convention.",
      "        const viewDir = new THREE.Vector3(",
      "          Math.sin(camYaw) * Math.cos(camPitch),",
      "          -Math.sin(camPitch),",
      "          Math.cos(camYaw) * Math.cos(camPitch)",
      "        );",
      "        camera.lookAt(camera.position.clone().addScaledVector(viewDir, 30));",
      "      } else {",
      "        camera.lookAt(game.player.position.x, game.player.position.y + 0.5, game.player.position.z);",
      "      }",
      "",
      "      const targetFov = firstPerson ? 72 : 55;",
      "      if (Math.abs(camera.fov - targetFov) > 0.08) {",
      "        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.14);",
      "        camera.updateProjectionMatrix();",
      "      }",
    ].join("\n");

    if (!text.includes(oldCamera)) throw new Error("Orbit camera block not found");
    text = text.replace(oldCamera, newCamera);
  }

  if (!text.includes('removeEventListener("wheel", onWheelZoom)')) {
    const cleanup = 'renderer.domElement.removeEventListener("pointerdown", onPointerDown);';
    if (!text.includes(cleanup)) throw new Error("Camera cleanup anchor not found");
    text = text.replace(cleanup, cleanup + '\n      renderer.domElement.removeEventListener("wheel", onWheelZoom);');
  }

  return text;
}


function patchFirstPersonMovement(text) {
  if (text.includes("__FIRST_PERSON_MOVEMENT_DIRECTION_V3__")) return text;

  const original = `const world = new THREE.Vector3()
          .addScaledVector(camFwd, -move.z)
          .addScaledVector(camRight, move.x);`;
  const corrected = `// __FIRST_PERSON_MOVEMENT_DIRECTION_V3__: reverse all WASD axes only in first person.
        const forwardInput = camState.firstPerson ? move.z : -move.z;
        const lateralInput = camState.firstPerson ? -move.x : move.x;
        const world = new THREE.Vector3()
          .addScaledVector(camFwd, forwardInput)
          .addScaledVector(camRight, lateralInput);`;

  if (!text.includes(original)) {
    throw new Error("Movement vector block not found; first-person WASD inversion was not applied");
  }
  return text.replace(original, corrected);
}

function patchFirstPersonDash(text) {
  if (text.includes("__FIRST_PERSON_DASH_DIRECTION_V3__")) return text;

  const original = `      const mz = (keys.has(b.up) ? 1 : 0) - (keys.has(b.down) ? 1 : 0);
      let d;
      if (mx || mz) {
        const camFwd = new THREE.Vector3(Math.sin(camState.yaw), 0, Math.cos(camState.yaw)).normalize();
        const camRight = new THREE.Vector3(camFwd.z, 0, -camFwd.x);
        d = new THREE.Vector3().addScaledVector(camFwd, mz).addScaledVector(camRight, mx).normalize();
      } else {
        d = game.facing.clone().normalize();
      }`;
  const corrected = `      // __FIRST_PERSON_DASH_DIRECTION_V3__: reverse dash axes in first person to match WASD.
      const mz = (keys.has(b.up) ? 1 : 0) - (keys.has(b.down) ? 1 : 0);
      const camFwd = new THREE.Vector3(Math.sin(camState.yaw), 0, Math.cos(camState.yaw)).normalize();
      const camRight = new THREE.Vector3(camFwd.z, 0, -camFwd.x);
      const dashForwardInput = camState.firstPerson ? -mz : mz;
      const dashLateralInput = camState.firstPerson ? -mx : mx;
      let d;
      if (mx || mz) {
        d = new THREE.Vector3().addScaledVector(camFwd, dashForwardInput).addScaledVector(camRight, dashLateralInput).normalize();
      } else {
        d = camState.firstPerson ? game.facing.clone().negate().normalize() : game.facing.clone().normalize();
      }`;

  if (!text.includes(original)) {
    throw new Error("Dash direction block not found; first-person dash inversion was not applied");
  }
  return text.replace(original, corrected);
}

function patchAttackSprites(text) {
  if (text.includes("vfx.addAttackSprite")) return text;
  const soft = `skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors.accent });`;
  if (text.includes(soft)) {
    text = text.replace(soft, soft + `\n\n      try { vfx.addAttackSprite(origin, dir, { ...move, category }, character.colors.accent); } catch {}`);
  }
  return text;
}

function patchAttackPose(text) {
  if (text.includes("__ATTACK_POSE_V1__")) return text;
  if (!text.includes("makeCharacterAttackTexture")) {
    text = text.replace(
      'import { makeCharacterTexture, makeBubbleTexture, makeShadowTexture, makeCityGroundTexture } from "@/lib/gameTexture";',
      'import { makeCharacterTexture, makeCharacterAttackTexture, makeBubbleTexture, makeShadowTexture, makeCityGroundTexture } from "@/lib/gameTexture";'
    );
  }
  if (!text.includes("playerAttackTex")) {
    text = text.replace(
      "const playerMat = new THREE.MeshBasicMaterial({ map: playerTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });",
      `// __ATTACK_POSE_V1__\n    let playerAttackTex = null;\n    try { if (!character.customImage) playerAttackTex = makeCharacterAttackTexture(character); } catch {}\n    const playerMat = new THREE.MeshBasicMaterial({ map: playerTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });`
    );
  }
  if (text.includes("game.lurch = 1;") && !text.includes("attackPoseUntil")) {
    text = text.replace(
      "game.lurch = 1;\n      game.castMove = move;",
      `game.lurch = 1;\n      game.castMove = move;\n      game.attackPoseUntil = now + (category === "ultimate" ? 420 : category === "m1" ? 180 : 280);\n      if (playerAttackTex && playerMat.map !== playerAttackTex) { playerMat.map = playerAttackTex; playerMat.needsUpdate = true; }`
    );
  }
  if (text.includes("game.lurch = Math.max(0, game.lurch - dt * 5);") && !text.includes("playerMat.map = playerTex")) {
    text = text.replace(
      "game.lurch = Math.max(0, game.lurch - dt * 5);",
      `game.lurch = Math.max(0, game.lurch - dt * 5);\n      if (game.attackPoseUntil && performance.now() > game.attackPoseUntil) {\n        game.attackPoseUntil = 0;\n        if (playerMat.map !== playerTex) { playerMat.map = playerTex; playerMat.needsUpdate = true; }\n      }`
    );
  }
  if (text.includes("playerTex.dispose();") && !text.includes("playerAttackTex?.dispose")) {
    text = text.replace("playerTex.dispose();", "playerTex.dispose(); playerAttackTex?.dispose?.();");
  }
  return text;
}

function patchEmoteKey(text) {
  if (text.includes("__EMOTE_KEY_F__")) return text;
  if (text.includes('else if (act && ["m1", "special1", "special2", "special3", "ultimate"].includes(act)) doMove(act);')) {
    text = text.replace(
      'else if (act && ["m1", "special1", "special2", "special3", "ultimate"].includes(act)) doMove(act);',
      'else if (act && ["m1", "special1", "special2", "special3", "ultimate"].includes(act)) doMove(act);\n      else if (act === "emote") { try { doEmote(); } catch {} } // __EMOTE_KEY_F__'
    );
  }
  return text;
}

function patchShibuyaNight(text) {
  if (text.includes("0x1a1028") && text.includes("Shibuya night")) return text;
  text = text.replace(/const SKY_NIGHT = new THREE\.Color\(0x2a3a5a\);/, "const SKY_NIGHT = new THREE.Color(0x1a1028); // Shibuya night");
  text = text.replace(/const FOG_NIGHT = new THREE\.Color\(0x3a4a66\);/, "const FOG_NIGHT = new THREE.Color(0x2a1840);");
  text = text.replace(/const SUN_NIGHT = new THREE\.Color\(0x9aaad0\);/, "const SUN_NIGHT = new THREE.Color(0x8890c8);");
  text = text.replace(/scene\.fog\.density = 0\.0026 \+ 0\.0014 \* nightFactor;/, "scene.fog.density = 0.0028 + 0.0022 * nightFactor;");
  text = text.replace(/const cycle = \(elapsed \/ 140\) % 1;/, "const cycle = (elapsed / 160) % 1;");
  return text;
}

function patchRichMp(text) {
  if (text.includes("buildNetLoadout") && text.includes('kind === "chat"')) return text;
  if (!text.includes("buildNetLoadout")) {
    text = text.replace(
      'import { MultiplayerManager } from "@/lib/game/mp";',
      'import { MultiplayerManager } from "@/lib/game/mp";\nimport { buildNetLoadout } from "@/lib/game/mpProtocol";'
    );
  }
  return text;
}

function patchCombatIntegrity(text) {
  text = text.replace(/\n    refreshSkillTargets\(\);\n/, "\n");
  if (text.includes("__MP_COMBAT_INTEGRITY_V2__")) return text;
  if (text.includes("if (attackerSeat) game.lastAttacker = attackerSeat;")) {
    text = text.replace("if (attackerSeat) game.lastAttacker = attackerSeat;", "if (attackerSeat) { game.lastAttacker = attackerSeat; game.lastAttackerAt = now; }");
  }
  if (text.includes("killer: game.lastAttacker || null,")) {
    text = text.replace("killer: game.lastAttacker || null,", "killer: (game.lastAttackerAt && performance.now() - game.lastAttackerAt < 4000) ? (game.lastAttacker || null) : null,");
  }
  return text;
}

function patchAll(text) {
  return patchEmoteKey(
    patchAttackPose(
      patchCombatIntegrity(
        patchRichMp(
          patchShibuyaNight(
            patchAttackSprites(
              patchFirstPersonDash(patchFirstPersonMovement(patchCameraControls(patchHub(patchSpawn(patchCompass(patchBillboards(text)))))))
            )
          )
        )
      )
    )
  );
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function assembleBillboards() {
  const dataDir = path.join(root, "scripts", "bb_data");
  const outDir = path.join(root, "public", "billboards");
  const ids = ["goofyboxy", "vitalsmash", "tangomayhem", "tomatosmash"];
  if (!fs.existsSync(dataDir)) {
    console.warn("[prebuild] no scripts/bb_data — skip billboard assemble");
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    const b64Path = path.join(dataDir, id + ".b64");
    const outPath = path.join(outDir, id + ".jpg");
    if (!fs.existsSync(b64Path)) continue;
    const buf = Buffer.from(fs.readFileSync(b64Path, "utf8").trim(), "base64");
    const existing = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
    if (buf.length < 50000) {
      if (existing >= 50000) console.log("[prebuild] skip tiny b64", id, "keep", existing);
      else console.warn("[prebuild] incomplete b64", id, buf.length);
      continue;
    }
    fs.writeFileSync(outPath, buf);
    console.log("[prebuild] billboard", id, buf.length, "bytes");
  }
}

async function main() {
  try {
    assembleBillboards();
    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      if (
        isGood(cur) &&
        cur.includes("getHeading") &&
        cur.includes("player.position.set(0, 14, 0)") &&
        cur.includes("buildHub") &&
        cur.includes("__INTERACTIVE_HUBS_V1__") &&
        cur.includes("__MP_POINTER_LOCK__") &&
        cur.includes("__MOUSE_WHEEL_ZOOM_V1__") &&
        cur.includes("__FIRST_PERSON_CAMERA_V1__") &&
        cur.includes("__FIRST_PERSON_MOVEMENT_DIRECTION_V3__") &&
        cur.includes("__FIRST_PERSON_DASH_DIRECTION_V3__") &&
        cur.includes("__FIRST_PERSON_VIEW_DIRECTION_V2__") &&
        cur.includes("movementX") &&
        cur.includes("Fixed city posters are permanent") &&
        cur.includes("vfx.addAttackSprite") &&
        cur.includes("0x1a1028") &&
        cur.includes("buildNetLoadout") &&
        cur.includes("__MP_COMBAT_INTEGRITY_V2__") &&
        cur.includes("__ATTACK_POSE_V1__") &&
        cur.includes("__EMOTE_KEY_F__") &&
        !cur.includes("refreshSkillTargets();")
      ) {
        console.log("[prebuild] GameCanvas already complete+patched v5", cur.length);
        return;
      }
      if (isGood(cur)) {
        const patched = patchAll(cur);
        fs.writeFileSync(out, patched);
        console.log("[prebuild] patched existing GameCanvas", patched.length);
        return;
      }
    }
    for (const url of URLS) {
      try {
        console.log("[prebuild] fetching", url.slice(0, 70));
        let text = await fetchText(url);
        if (isGood(text)) {
          text = patchAll(text);
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, text);
          console.log("[prebuild] OK fetched+patched GameCanvas", text.length);
          return;
        }
        console.warn("[prebuild] bad payload from", url.slice(0, 50), text?.length);
      } catch (e) {
        console.warn("[prebuild] fetch fail", e?.message || e);
      }
    }
    console.warn("[prebuild] FAILED — leaving valid stub in place (build still works)");
  } catch (e) {
    console.error("[prebuild] unexpected", e?.message || e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[prebuild] error", e);
    process.exit(0);
  });
