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
  // Add the kiosk meshes and wire their proximity prompts + E-key actions.
  if (!text.includes('import { buildHub } from "@/lib/game/buildHub";')) {
    text = text.replace(
      'import { buildShop } from "@/lib/game/buildShop";',
      'import { buildShop } from "@/lib/game/buildShop";\\nimport { buildHub } from "@/lib/game/buildHub";'
    );
  }
  if (!text.includes("const hub = buildHub(scene);")) {
    text = text.replace(
      "const shop = buildShop(scene);\\n    city.colliders.push(...shop.colliders);",
      "const shop = buildShop(scene);\\n    city.colliders.push(...shop.colliders);\\n    const hub = buildHub(scene);\\n    city.colliders.push(...hub.colliders);"
    );
  }
  if (text.includes("__INTERACTIVE_HUBS_V1__")) return text;
  text = text.replace(
    "const GameCanvas = forwardRef(function GameCanvas({ character, binds, onStats, roomCode, playerName, billboardUrl, dashStyle, emote, onNearShop, onRequestShop, onDefeat, onRespawn, onFeed }, ref) {",
    "const GameCanvas = forwardRef(function GameCanvas({ character, binds, onStats, roomCode, playerName, billboardUrl, dashStyle, emote, onNearShop, onRequestShop, onNearHub, onRequestHub, onDefeat, onRespawn, onFeed }, ref) {"
  );
  text = text.replace(
    "  onRequestShopRef.current = onRequestShop;",
    "  onRequestShopRef.current = onRequestShop;\\n  const onNearHubRef = useRef(onNearHub);\\n  onNearHubRef.current = onNearHub;\\n  const onRequestHubRef = useRef(onRequestHub);\\n  onRequestHubRef.current = onRequestHub;"
  );
  text = text.replace(
    "      mobileMove: { x: 0, y: 0, active: false }, lastSeat: null,",
    "      mobileMove: { x: 0, y: 0, active: false }, lastSeat: null, nearHub: null,"
  );
  text = text.replace(
    '      if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }',
    '      if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }\\n      if (e.code === "KeyE" && game.nearHub) { onRequestHubRef.current?.(game.nearHub); return; }'
  );
  text = text.replace(
    "      // Puesto de la tienda: avisa al HUD cuando el jugador está cerca.\\n      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;",
    "      // Tienda y tres kioscos interactivos de la plaza.\\n      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;"
  );
  const shopEnd = "        onNearShopRef.current?.(nearShop);\\n      }";
  text = text.replace(
    shopEnd,
    shopEnd + "\\n      const nearestHub = hub.zones.find((zone) => game.player.position.distanceTo(zone.position) < 9);\\n      const nearHub = nearestHub?.kind || null;\\n      if (nearHub !== game.nearHub) { game.nearHub = nearHub; onNearHubRef.current?.(nearHub); }"
  );
  text = text.replace(
    "    // Puesto de la tienda dentro de la plaza.\\n    const shop = buildShop(scene);",
    "    // Puesto de la tienda y kioscos interactivos dentro de la plaza.\\n    const shop = buildShop(scene);"
  );
  if (!text.includes("onRequestHubRef.current?.(game.nearHub)")) throw new Error("Hub keyboard action insertion failed");
  if (!text.includes("onNearHubRef.current?.(nearHub)")) throw new Error("Hub proximity insertion failed");
  return text.replace(
    "const GameCanvas = forwardRef(function GameCanvas",
    "/* __INTERACTIVE_HUBS_V1__ */\\nconst GameCanvas = forwardRef(function GameCanvas"
  );
}

function patchCameraControls(text) {
  // Always widen pitch
  text = text.replace(
    /camState\.pitch = THREE\.MathUtils\.clamp\(camState\.pitch \+ dy \* 0\.004,\s*[^,]+,\s*[^)]+\)/g,
    "camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, -0.15, 1.45)"
  );
  if (text.includes("__MP_POINTER_LOCK__")) return text;

  const neu = `
    // __MP_POINTER_LOCK__
    const onPointerDown = (e) => {
      if (document.pointerLockElement !== renderer.domElement) {
        try { renderer.domElement.requestPointerLock(); } catch (_) {}
        camState.dragging = true;
        camState.lastX = e.clientX; camState.lastY = e.clientY;
        return;
      }
      if (e.button === 0) { try { doMove("m1"); } catch (_) {} }
    };
    const onPointerMove = (e) => {
      if (document.pointerLockElement === renderer.domElement) {
        camState.yaw -= (e.movementX || 0) * 0.0022;
        camState.pitch = THREE.MathUtils.clamp(camState.pitch + (e.movementY || 0) * 0.0022, -0.15, 1.45);
        return;
      }
      if (!camState.dragging) return;
      const dx = e.clientX - camState.lastX;
      const dy = e.clientY - camState.lastY;
      camState.lastX = e.clientX; camState.lastY = e.clientY;
      camState.yaw -= dx * 0.004;
      camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, -0.15, 1.45);
    };
    const onPointerUp = () => { camState.dragging = false; };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);`;

  const reHandlers = /const onPointerDown = \(e\) => \{[\s\S]*?window\.addEventListener\("pointerup", onPointerUp\);/;
  if (reHandlers.test(text)) {
    text = text.replace(reHandlers, neu.trim());
  } else {
    text = text.replace(
      /(const camState = \{[^}]+\};)/,
      "$1\n" + neu
    );
  }
  return text;
}

function patchAttackSprites(text) {
  if (text.includes("vfx.addAttackSprite")) return text;
  const soft = `skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors.accent });`;
  if (text.includes(soft)) {
    text = text.replace(
      soft,
      soft + `\n\n      try { vfx.addAttackSprite(origin, dir, { ...move, category }, character.colors.accent); } catch {}`
    );
  } else {
    console.warn("[prebuild] attack sprite patch pattern not found");
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
    text = text.replace(
      "if (attackerSeat) game.lastAttacker = attackerSeat;",
      "if (attackerSeat) { game.lastAttacker = attackerSeat; game.lastAttackerAt = now; }"
    );
  }
  if (text.includes("killer: game.lastAttacker || null,")) {
    text = text.replace(
      "killer: game.lastAttacker || null,",
      "killer: (game.lastAttackerAt && performance.now() - game.lastAttackerAt < 4000) ? (game.lastAttacker || null) : null,"
    );
  }
  if (text.includes("applyDamage(msg.damage || (ult ? 320 : 60), msg.from);") && !text.includes("__MP_COMBAT_INTEGRITY_V2__")) {
    text = text.replace(
      "if (p.distanceTo(game.player.position) < (ult ? 4 : 2.3)) {\n            if (msg.slow) skills.addBuff({ stat: \"speed\", mult: Math.max(0.4, 1 - msg.slow), duration: 1200 });\n            if (msg.stun) game.stunUntil = performance.now() + msg.stun;\n            applyDamage(msg.damage || (ult ? 320 : 60), msg.from);\n          }",
      `// __MP_COMBAT_INTEGRITY_V2__
          const hitR = ult ? 5.5 : (msg.category === "special3" || msg.category === "special2" ? 3.6 : 2.8);
          if (p.distanceTo(game.player.position) < hitR) {
            if (msg.slow) skills.addBuff({ stat: "speed", mult: Math.max(0.4, 1 - msg.slow), duration: 1200 });
            if (msg.stun) game.stunUntil = performance.now() + Math.min(msg.stun, 2500);
            const cap = ult ? 380 : (msg.category === "special3" ? 220 : msg.category === "special2" ? 160 : 110);
            const raw = Number(msg.damage);
            const dmgIn = Number.isFinite(raw) ? Math.min(Math.max(0, raw), cap) : (ult ? 200 : 55);
            applyDamage(dmgIn, msg.from);
          }`
    );
  }
  if (text.includes("skills.setTargets(npcTargets);") && !text.includes("function refreshSkillTargets")) {
    text = text.replace(
      "skills.setTargets(npcTargets);",
      `skills.setTargets(npcTargets);
    function refreshSkillTargets() {
      let map = null;
      try { map = remoteSprites; } catch { return; }
      if (!map) return;
      const remoteT = [];
      for (const [seat, r] of map) {
        if (!r || r.deadAt) continue;
        remoteT.push({
          id: "remote-" + seat,
          seat,
          pos: r.pos,
          radius: 1.15,
          get alive() { return !r.deadAt; },
          hurt(dmg) {
            if (r.deadAt) return;
            try { vfx.addImpact(r.pos.clone().setY(1.2), tmpColor.set(character.colors.accent), 0.9); } catch {}
            if (mp) {
              mp.sendEvent({
                kind: "hit",
                x: r.pos.x, y: 1.6, z: r.pos.z,
                color: character.colors.accent,
                damage: Math.round(dmg),
                slow: 0, stun: 0,
                category: game.castMove?.category || "m1",
                dirX: game.facing?.x || 0, dirZ: game.facing?.z || 1,
              });
            }
          },
        });
      }
      skills.setTargets([...npcTargets, ...remoteT]);
    }`
    );
  }
  if (text.includes("skills.update(dt);") && text.includes("function refreshSkillTargets") && !text.includes("try { refreshSkillTargets(); } catch {}")) {
    text = text.replace("skills.update(dt);", "try { refreshSkillTargets(); } catch {}\n      skills.update(dt);");
  }
  return text;
}

function patchAll(text) {
  return patchCombatIntegrity(
    patchRichMp(
      patchShibuyaNight(
        patchAttackSprites(
          patchCameraControls(patchHub(patchSpawn(patchCompass(patchBillboards(text)))))
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
        cur.includes("buildHub") &&\\n        cur.includes("__INTERACTIVE_HUBS_V1__") &&
        cur.includes("__MP_POINTER_LOCK__") &&
        cur.includes("movementX") &&
        cur.includes("Fixed city posters are permanent") &&
        cur.includes("vfx.addAttackSprite") &&
        cur.includes("0x1a1028") &&
        cur.includes("buildNetLoadout") &&
        cur.includes('kind === "chat"') &&
        cur.includes("__MP_COMBAT_INTEGRITY_V2__") &&
        !cur.includes("refreshSkillTargets();")
      ) {
        console.log("[prebuild] GameCanvas already complete+patched v3", cur.length);
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
