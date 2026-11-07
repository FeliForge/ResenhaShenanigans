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
  if (text.includes("buildHub")) return text;
  if (text.includes('import { buildShop } from "@/lib/game/buildShop";')) {
    text = text.replace(
      'import { buildShop } from "@/lib/game/buildShop";',
      'import { buildShop } from "@/lib/game/buildShop";\nimport { buildHub } from "@/lib/game/buildHub";'
    );
  }
  if (text.includes("const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);")) {
    text = text.replace(
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);",
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);\n    const hub = buildHub(scene);\n    city.colliders.push(...hub.colliders);"
    );
  }
  return text;
}

function patchCameraControls(text) {
  if (text.includes("requestPointerLock") && text.includes("1.45")) return text;
  text = text.replace(
    /camState\.pitch = THREE\.MathUtils\.clamp\(camState\.pitch \+ dy \* 0\.004, 0\.15, 1\.2\)/g,
    "camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, -0.15, 1.45)"
  );
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
  text = text.replace(
    /const SKY_NIGHT = new THREE\.Color\(0x2a3a5a\);/,
    "const SKY_NIGHT = new THREE.Color(0x1a1028); // Shibuya night"
  );
  text = text.replace(
    /const FOG_NIGHT = new THREE\.Color\(0x3a4a66\);/,
    "const FOG_NIGHT = new THREE.Color(0x2a1840);"
  );
  text = text.replace(
    /const SUN_NIGHT = new THREE\.Color\(0x8890c8\);/,
    "const SUN_NIGHT = new THREE.Color(0x8890c8);"
  );
  // keep previous night patches tolerant
  text = text.replace(
    /const SKY_NIGHT = new THREE\.Color\(0x2a3a5a\);/,
    "const SKY_NIGHT = new THREE.Color(0x1a1028); // Shibuya night"
  );
  text = text.replace(
    /const FOG_NIGHT = new THREE\.Color\(0x3a4a66\);/,
    "const FOG_NIGHT = new THREE.Color(0x2a1840);"
  );
  text = text.replace(
    /const SUN_NIGHT = new THREE\.Color\(0x9aaad0\);/,
    "const SUN_NIGHT = new THREE.Color(0x8890c8);"
  );
  text = text.replace(
    /scene\.fog\.density = 0\.0026 \+ 0\.0014 \* nightFactor;/,
    "scene.fog.density = 0.0028 + 0.0022 * nightFactor;"
  );
  text = text.replace(
    /const cycle = \(elapsed \/ 140\) % 1;/,
    "const cycle = (elapsed / 160) % 1;"
  );
  return text;
}

/** Rich multiplayer: skin/moveset loadout, chat, emote, attack sprites on remotes. */
function patchRichMp(text) {
  if (text.includes("buildNetLoadout") && text.includes("kind === \"chat\"")) return text;

  if (!text.includes("buildNetLoadout")) {
    text = text.replace(
      'import { MultiplayerManager } from "@/lib/game/mp";',
      'import { MultiplayerManager } from "@/lib/game/mp";\nimport { buildNetLoadout } from "@/lib/game/mpProtocol";'
    );
  }

  const oldLoadout = `sendMyLoadout = () => mp?.sendLoadout({
          baseId: baseIdOf(character),
          charId: character.id,
          name: playerName || "Tú",
          colors: [character.colors.primary, character.colors.secondary, character.colors.accent],
          customImage: character.customImage || "",
          billboard: billboardRef.current || "",
        });`;
  const newLoadout = `sendMyLoadout = () => {
          const packet = buildNetLoadout({
            character,
            playerName: playerName || "Tú",
            billboardUrl: billboardRef.current || "",
            dashStyle: dashStyleRef.current,
            emote: emoteRef.current,
          });
          if (packet) mp?.sendLoadout(packet);
        };`;
  if (text.includes(oldLoadout)) text = text.replace(oldLoadout, newLoadout);

  if (text.includes("function doQuickChat(phrase)") && !text.includes("kind: \"chat\"")) {
    text = text.replace(
      `function doQuickChat(phrase) {
      if (game.bubble) { scene.remove(game.bubble); game.bubble.material.map?.dispose(); game.bubble.material.dispose(); }
      const tex = makeBubbleTexture(phrase.text);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const bubble = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), mat);
      bubble.position.copy(game.player.position); bubble.position.y = 4.4;
      scene.add(bubble);
      game.bubble = bubble; game.bubbleUntil = performance.now() + 2600;
      audio.playBlip();
    }`,
      `function doQuickChat(phrase) {
      if (game.bubble) { scene.remove(game.bubble); game.bubble.material.map?.dispose(); game.bubble.material.dispose(); }
      const tex = makeBubbleTexture(phrase.text);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const bubble = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), mat);
      bubble.position.copy(game.player.position); bubble.position.y = 4.4;
      scene.add(bubble);
      game.bubble = bubble; game.bubbleUntil = performance.now() + 2600;
      audio.playBlip();
      if (mp) {
        mp.sendEvent({
          kind: "chat",
          text: phrase.text,
          x: game.player.position.x,
          y: game.player.position.y,
          z: game.player.position.z,
        });
      }
    }`
    );
  }

  const oldHit = `mp.sendEvent({
          kind: big ? "ultimate" : "hit",
          x: at.x, y: 1.6, z: at.z,
          color: character.colors.accent,
          damage: Math.round(big ? dmg / 3 : dmg),
          slow: cfg.slow ? 1 - cfg.slow.mult : 0,
          stun: cfg.stun || 0,
        });`;
  const newHit = `mp.sendEvent({
          kind: big ? "ultimate" : "hit",
          x: at.x, y: 1.6, z: at.z,
          color: character.colors.accent,
          damage: Math.round((big ? dmg / 3 : dmg) * (skills.mods?.damage || 1)),
          slow: cfg.slow ? 1 - cfg.slow.mult : 0,
          stun: cfg.stun || 0,
          category: category || (big ? "ultimate" : "m1"),
          attackSprite: move.attackSprite || null,
          dirX: dir.x, dirZ: dir.z,
        });`;
  if (text.includes(oldHit)) text = text.replace(oldHit, newHit);

  if (!text.includes('msg.kind === "chat"')) {
    text = text.replace(
      `if (msg.kind === "emote") {
            vfx.addEmoteBurst(p.clone().setY(0.1), new THREE.Color(msg.color || "#ffffff"));
            const r = remoteSprites.get(msg.from);
            if (r) { r.emoteAnim = msg.anim; r.emoteStart = performance.now(); r.emoteUntil = performance.now() + 2000; }
            return;
          }`,
      `if (msg.kind === "emote") {
            vfx.addEmoteBurst(p.clone().setY(0.1), new THREE.Color(msg.color || "#ffffff"));
            const r = remoteSprites.get(msg.from);
            if (r) { r.emoteAnim = msg.anim; r.emoteStart = performance.now(); r.emoteUntil = performance.now() + 2000; }
            return;
          }
          if (msg.kind === "chat") {
            const r = remoteSprites.get(msg.from);
            const anchor = r ? r.pos : p;
            if (r?.bubble) { scene.remove(r.bubble); r.bubble.material.map?.dispose(); r.bubble.material.dispose(); }
            const tex = makeBubbleTexture(msg.text || "...");
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
            const bubble = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), mat);
            bubble.position.set(anchor.x, (anchor.y || 1.6) + 2.8, anchor.z);
            scene.add(bubble);
            if (r) { r.bubble = bubble; r.bubbleUntil = performance.now() + 2600; }
            else { setTimeout(() => { scene.remove(bubble); mat.map?.dispose(); mat.dispose(); }, 2600); }
            audio.playBlip();
            return;
          }`
    );
  }

  if (!text.includes("msg.attackSprite") && text.includes("const ult = msg.kind === \"ultimate\"")) {
    text = text.replace(
      `const color = new THREE.Color(msg.color || "#ffffff");
          const ult = msg.kind === "ultimate";
          if (ult) vfx.addUltimateBurst(p, color);
          else vfx.addImpact(p, color, 1.2);`,
      `const color = new THREE.Color(msg.color || "#ffffff");
          const ult = msg.kind === "ultimate";
          if (ult) vfx.addUltimateBurst(p, color);
          else vfx.addImpact(p, color, 1.2);
          try {
            const dir = new THREE.Vector3(msg.dirX || 0, 0, msg.dirZ || 1).normalize();
            vfx.addAttackSprite(p, dir, {
              category: msg.category || (ult ? "ultimate" : "m1"),
              attackSprite: msg.attackSprite || null,
            }, msg.color || "#ffffff");
          } catch {}`
    );
  }

  if (!text.includes("r.bubbleUntil") && text.includes("if (r.emoteUntil > now)")) {
    text = text.replace(
      `if (r.emoteUntil > now) {`,
      `if (r.bubble && r.bubbleUntil && now > r.bubbleUntil) {
            scene.remove(r.bubble); r.bubble.material.map?.dispose(); r.bubble.material.dispose(); r.bubble = null;
          } else if (r.bubble) {
            r.bubble.position.set(r.pos.x, r.pos.y + 2.8, r.pos.z);
            r.bubble.lookAt(camera.position.x, r.bubble.position.y, camera.position.z);
          }
          if (r.emoteUntil > now) {`
    );
  }

  return text;
}

/** Combat integrity: damage caps, lastAttacker TTL, remote players as skill targets. */
function patchCombatIntegrity(text) {
  // Always strip old broken init call if present
  text = text.replace(
    /\n    refreshSkillTargets\(\);\n/,
    "\n"
  );

  if (text.includes("__MP_COMBAT_INTEGRITY_V2__")) return text;

  // lastAttacker with timestamp + TTL on death
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

  // Clamp incoming network damage by category
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

  // Define refresh without calling it at init (remoteSprites is declared later → TDZ)
  if (text.includes("skills.setTargets(npcTargets);") && !text.includes("function refreshSkillTargets")) {
    text = text.replace(
      "skills.setTargets(npcTargets);",
      `skills.setTargets(npcTargets);
    function refreshSkillTargets() {
      // remoteSprites is const later in this scope; only run from tick after init
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

  // Refresh from game loop only
  if (text.includes("skills.update(dt);") && text.includes("function refreshSkillTargets") && !text.includes("try { refreshSkillTargets(); } catch {}")) {
    text = text.replace(
      "skills.update(dt);",
      "try { refreshSkillTargets(); } catch {}\n      skills.update(dt);"
    );
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
    if (!fs.existsSync(b64Path)) {
      console.warn("[prebuild] missing b64 for", id);
      continue;
    }
    const b64 = fs.readFileSync(b64Path, "utf8").trim();
    const buf = Buffer.from(b64, "base64");
    fs.writeFileSync(path.join(outDir, id + ".jpg"), buf);
    console.log("[prebuild] billboard", id, buf.length, "bytes");
  }
}

async function main() {
  try {
    assembleBillboards();

    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      // Force re-patch if old broken V1 combat patch or missing V2 marker
      if (
        isGood(cur) &&
        cur.includes("getHeading") &&
        cur.includes("player.position.set(0, 14, 0)") &&
        cur.includes("buildHub") &&
        cur.includes("requestPointerLock") &&
        cur.includes("Fixed city posters are permanent") &&
        cur.includes("vfx.addAttackSprite") &&
        cur.includes("0x1a1028") &&
        cur.includes("buildNetLoadout") &&
        cur.includes('kind === "chat"') &&
        cur.includes("__MP_COMBAT_INTEGRITY_V2__") &&
        !cur.includes("refreshSkillTargets();")
      ) {
        console.log("[prebuild] GameCanvas already complete+patched v2", cur.length);
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
