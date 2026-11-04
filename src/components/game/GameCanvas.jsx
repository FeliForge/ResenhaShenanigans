// @ts-nocheck
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { makeCharacterTexture, makeBubbleTexture, makeShadowTexture, makeCityGroundTexture } from "@/lib/gameTexture";
import { buildCity } from "@/lib/game/buildCity";
import { buildShop } from "@/lib/game/buildShop";
import { VfxManager } from "@/lib/game/vfx";
import { audio } from "@/lib/game/audio";
import { getCharacter } from "@/data/characters";
import { baseIdOf } from "@/lib/game/loadout";
import { inputState } from "@/lib/game/input";
import { MultiplayerManager } from "@/lib/game/mp";
import { SkillSystem } from "@/lib/game/skills";
import { CinematicUltimateManager, hasCinematicUlt } from "@/lib/game/cinematics";
import { getMoveConfig, getComboConfig, getPassive } from "@/data/movesets";
import { defeatStyleFor, RESPAWN_POINT, RESPAWN_DELAY_MS, INVULN_MS } from "@/lib/game/defeat";

const MAP_HALF = 390;
const GRAVITY = -26;
const BILLBOARD_COUNT = 4;
const DASH_SPEED = 24;
const DASH_TIME = 0.18;
const DASH_CD = 1100;
const SKY_DAY = new THREE.Color(0x9fb8d8);
const SKY_NIGHT = new THREE.Color(0x2a3a5a);
const FOG_DAY = new THREE.Color(0xb8c6d8);
const FOG_NIGHT = new THREE.Color(0x3a4a66);

function makeNameTexture(name) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const x = c.getContext("2d");
  x.font = "bold 28px sans-serif"; x.textAlign = "center";
  const w = Math.min(240, x.measureText(name).width + 24);
  x.fillStyle = "rgba(0,0,0,0.55)";
  x.fillRect((256 - w) / 2, 16, w, 32);
  x.fillStyle = "#fff";
  x.fillText(name, 128, 41);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const GameCanvas = forwardRef(function GameCanvas({
  character, binds, onStats, roomCode, playerName, billboardUrl, dashStyle, emote,
  onNearShop, onRequestShop, onDefeat, onRespawn, onFeed,
}, ref) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const onStatsRef = useRef(onStats); onStatsRef.current = onStats;
  const onNearShopRef = useRef(onNearShop); onNearShopRef.current = onNearShop;
  const onRequestShopRef = useRef(onRequestShop); onRequestShopRef.current = onRequestShop;
  const onDefeatRef = useRef(onDefeat); onDefeatRef.current = onDefeat;
  const onRespawnRef = useRef(onRespawn); onRespawnRef.current = onRespawn;
  const onFeedRef = useRef(onFeed); onFeedRef.current = onFeed;
  const bindsRef = useRef(binds); bindsRef.current = binds;

  useImperativeHandle(ref, () => ({
    triggerMove: (cat) => apiRef.current?.triggerMove(cat),
    triggerDash: () => apiRef.current?.triggerDash(),
    triggerJump: () => apiRef.current?.triggerJump(),
    setMobileMove: (x, y) => apiRef.current?.setMobileMove(x, y),
    showQuickChat: (p) => apiRef.current?.showQuickChat(p),
    setMyBillboard: (url) => apiRef.current?.setMyBillboard(url),
    showEmote: () => apiRef.current?.showEmote(),
    setDashStyle: (s) => apiRef.current?.setDashStyle(s),
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !character) return;

    const scene = new THREE.Scene();
    scene.background = SKY_DAY.clone();
    scene.fog = new THREE.FogExp2(FOG_DAY.getHex(), 0.0038);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 1200);
    camera.position.set(0, 9, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0x9fb8d8, 0x2a2a3a, 0.75);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe6c0, 1.25);
    sun.position.set(70, 130, 50);
    scene.add(sun);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xcfd8ff })
    );
    moon.position.set(-80, 60, -40);
    scene.add(moon);

    const groundTex = makeCityGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const city = buildCity(scene);
    const shop = buildShop(scene);

    let playerTex;
    try {
      playerTex = character.customImage
        ? (() => { const t = new THREE.TextureLoader().load(character.customImage); t.colorSpace = THREE.SRGBColorSpace; return t; })()
        : makeCharacterTexture(character);
    } catch { playerTex = makeCharacterTexture(character); }

    const playerMat = new THREE.MeshBasicMaterial({ map: playerTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
    const player = new THREE.Group();
    player.position.set(0, 1.6, 0);
    scene.add(player);
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), playerMat);
    player.add(sprite);

    const shadowTex = makeShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    player.add(shadow);

    const vfx = new VfxManager(scene, camera);
    if (dashStyle) vfx.setDashStyle?.(dashStyle);

    const baseCharId = baseIdOf(character) || character.id;
    const passive = getPassive(baseCharId);

    const game = {
      player, velocity: new THREE.Vector3(), facing: new THREE.Vector3(0, 0, -1),
      health: character.stats?.health || 1000, maxHealth: character.stats?.health || 1000,
      meter: 0, meterPeak: 0, dead: false, stunUntil: 0, invulnUntil: 0,
      dashTime: 0, dashDir: new THREE.Vector3(), dashSpeed: DASH_SPEED,
      cooldowns: { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 },
      hits: 0, comboStep: 0, comboUntil: 0, comboShown: 0, lurch: 0, castMove: null,
      counters: { jumps: 0, distance: 0, dashes: 0, damage: 0, hits: 0, kills: 0, ultimates: 0, skills: 0, playtime: 0 },
      lastStats: 0, grounded: false, echoCount: 0, onGround: true, jumpsLeft: 2,
    };

    let lastHitSound = 0;
    const skills = new SkillSystem({
      scene, vfx, colliders: city.colliders,
      onHit: (target, dmg) => {
        const t = performance.now();
        if (t - lastHitSound > 90) { lastHitSound = t; audio.playHit(1); }
        game.counters.hits += 1;
        game.counters.damage += dmg || 0;
        game.hits += 1;
        game.meter = Math.min(100, game.meter + 8 * (passive?.type === "combo" ? passive.meterGain || 1.4 : 1));
        game.meterPeak = Math.max(game.meterPeak, game.meter);
        const pct = passive?.type === "lifesteal" ? passive.pct : (game.castMove?.lifesteal || 0);
        if (pct > 0) game.health = Math.min(game.maxHealth, game.health + dmg * pct);
        if (passive?.type === "dashReset") game.cooldowns.dash = Math.max(0, game.cooldowns.dash - (passive.reduce || 400));
        if (passive?.type === "echo") {
          game.echoCount = (game.echoCount || 0) + 1;
          if (game.echoCount % (passive.every || 3) === 0) {
            const at = target.pos.clone();
            skills.later(150, () => skills.applyRadialDamage(at, 2.4, dmg * 0.45, 2, null));
          }
        }
      },
      onHeal: (amt) => { game.health = Math.min(game.maxHealth, game.health + amt); },
      onDash: (opts) => startSkillDash(opts),
    });
    skills.setTargets([]);
    skills.setProps(city.props || []);

    const cinematics = new CinematicUltimateManager({ scene, camera, vfx, skills, game, character, audio });

    function resolveCircle(c, pr) {
      const dx = player.position.x - c.x, dz = player.position.z - c.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const min = (c.r || 1) + pr;
      if (dist < min) {
        const push = (min - dist) / dist;
        player.position.x += dx * push;
        player.position.z += dz * push;
      }
    }

    function startSkillDash({ dir, distance = 8, speed = 28, damage = 0, radius = 2.2, phase = false }) {
      const d = dir.clone().setY(0).normalize();
      game.dashDir.copy(d);
      game.dashSpeed = speed;
      game.dashTime = distance / speed;
      if (damage > 0) {
        const ticks = Math.max(1, Math.floor(game.dashTime * 20));
        for (let i = 0; i < ticks; i++) {
          skills.later((i / 20) * 1000, () => {
            skills.applyRadialDamage(player.position, radius, damage / ticks, 2, null);
          });
        }
      }
      if (phase) { sprite.visible = false; setTimeout(() => { sprite.visible = true; }, game.dashTime * 1000); }
    }

    function applyDamage(amount, attackerSeat) {
      if (game.dead || performance.now() < game.invulnUntil) return;
      game.health = Math.max(0, game.health - amount);
      vfx.addShake(Math.min(1.2, amount / 120));
      audio.playHit(0.8);
      if (game.health <= 0) beginDefeat(attackerSeat);
    }

    function beginDefeat(attackerSeat) {
      if (game.dead) return;
      game.dead = true;
      game.deaths = (game.deaths || 0) + 1;
      const style = defeatStyleFor(baseCharId);
      onDefeatRef.current?.({ style, attackerSeat });
      setTimeout(() => respawnNow(), RESPAWN_DELAY_MS || 2500);
    }

    function respawnNow() {
      game.dead = false;
      game.health = game.maxHealth;
      game.meter = Math.min(game.meter, 40);
      player.position.set(RESPAWN_POINT?.x || 0, 1.6, RESPAWN_POINT?.z || 0);
      game.velocity.set(0, 0, 0);
      game.invulnUntil = performance.now() + (INVULN_MS || 2000);
      onRespawnRef.current?.();
    }

    const remoteSprites = new Map();
    let mp = null;
    try {
      if (roomCode) {
        mp = new MultiplayerManager({
          roomCode,
          playerName: playerName || "Player",
          character,
          getState: () => ({
            x: player.position.x, y: player.position.y, z: player.position.z,
            vx: game.velocity.x, vz: game.velocity.z,
            facing: { x: game.facing.x, z: game.facing.z },
            health: game.health, meter: game.meter, dead: game.dead,
            name: playerName || "Player", colors: character.colors,
          }),
          onRemoteState: (seat, st) => {
            let r = remoteSprites.get(seat);
            if (!r) { r = makeRemoteSprite(seat, st); remoteSprites.set(seat, r); }
            r.target.set(st.x, st.y || 1.6, st.z);
          },
          onRemoteAttack: (seat, msg) => {
            if (game.dead) return;
            const ox = msg.origin?.x ?? 0, oz = msg.origin?.z ?? 0;
            const dx = player.position.x - ox, dz = player.position.z - oz;
            const range = msg.range || 4;
            if (Math.hypot(dx, dz) < range + 1.2) applyDamage(msg.damage || 40, seat);
          },
          onRemoteLeave: (seat) => {
            const r = remoteSprites.get(seat);
            if (r) { scene.remove(r.mesh); r.mat?.dispose?.(); r.nameMat?.dispose?.(); remoteSprites.delete(seat); }
          },
          onFeed: (item) => onFeedRef.current?.(item),
        });
      }
    } catch (e) { console.warn("mp init", e); }

    function makeRemoteSprite(seat, st) {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(st.colors?.primary || "#88aaff"), transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), mat);
      mesh.position.set(st.x || 0, 1.6, st.z || 0);
      scene.add(mesh);
      const nameTex = makeNameTexture(st.name || `P${seat}`);
      const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true });
      const nameSpr = new THREE.Sprite(nameMat);
      nameSpr.scale.set(3, 0.75, 1);
      nameSpr.position.y = 2.4;
      mesh.add(nameSpr);
      return { mesh, mat, nameMat, target: new THREE.Vector3(st.x || 0, 1.6, st.z || 0) };
    }

    const keys = new Set();
    const mobileMove = { x: 0, y: 0 };
    let camYaw = 0, camPitch = 0.35, camDist = 13;
    let dragging = false, lastPx = 0, lastPy = 0;

    function onKeyDown(e) {
      keys.add(e.code);
      const b = bindsRef.current || {};
      if (e.repeat) return;
      if (e.code === b.jump || e.code === "Space") triggerJump();
      if (e.code === b.dash || e.code === "ShiftLeft") doDash();
      const map = {
        [b.m1 || "KeyJ"]: "m1",
        [b.special1 || "KeyK"]: "special1",
        [b.special2 || "KeyL"]: "special2",
        [b.special3 || "KeyI"]: "special3",
        [b.ultimate || "KeyU"]: "ultimate",
      };
      if (map[e.code]) doMove(map[e.code]);
    }
    function onKeyUp(e) { keys.delete(e.code); }
    function onPointerDown(e) {
      if (e.button === 2 || e.button === 0) { dragging = true; lastPx = e.clientX; lastPy = e.clientY; }
    }
    function onPointerMove(e) {
      if (!dragging) return;
      camYaw -= (e.clientX - lastPx) * 0.005;
      camPitch = Math.max(0.1, Math.min(1.2, camPitch + (e.clientY - lastPy) * 0.004));
      lastPx = e.clientX; lastPy = e.clientY;
    }
    function onPointerUp() { dragging = false; }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    function doMove(category) {
      if (game.dead || performance.now() < game.stunUntil) return;
      if (cinematics.isPlaying) return;
      const move = character.moves?.[category];
      if (!move) return;
      const now = performance.now();
      if (game.cooldowns[category] > now) return;
      if (move.meterCost && game.meter < move.meterCost) return;

      if (category === "ultimate" && hasCinematicUlt(baseCharId)) {
        game.cooldowns.ultimate = now + (move.cooldown || 12000);
        if (move.meterCost) game.meter = Math.max(0, game.meter - move.meterCost);
        game.counters.skills += 1;
        game.counters.ultimates += 1;
        const origin = player.position.clone();
        const dir = game.facing.clone().setY(0).normalize();
        if (cinematics.tryStart(baseCharId, origin, dir)) {
          try { mp?.sendAttack?.({ kind: "ultimate", origin: { x: origin.x, z: origin.z }, dir: { x: dir.x, z: dir.z }, damage: move.damage, range: 8 }); } catch (_) {}
          return;
        }
      }

      let stepCfg = null;
      if (category === "m1") {
        const combo = getComboConfig(baseCharId);
        const step = now < game.comboUntil ? Math.min(combo.steps.length - 1, game.comboStep + 1) : 0;
        game.comboStep = step;
        game.comboUntil = now + (combo.window || 620);
        game.comboShown = step + 1;
        stepCfg = combo.steps[step];
        game.cooldowns[category] = now + move.cooldown * (step === 0 ? 1 : 0.8);
      } else {
        game.cooldowns[category] = now + move.cooldown;
      }
      if (move.meterCost) game.meter -= move.meterCost;
      game.lurch = 1;
      game.castMove = move;
      game.counters.skills += 1;
      if (category === "ultimate") game.counters.ultimates += 1;
      if (category === "ultimate") audio.playUltimate(); else audio.playWhoosh();

      const origin = player.position.clone();
      const dir = game.facing.clone().setY(0).normalize();
      const baseCfg = getMoveConfig(baseCharId, category);
      const cfg = stepCfg ? { ...baseCfg, ...Object.fromEntries(Object.entries(stepCfg).filter(([k]) => k !== "mul")) } : baseCfg;
      const dmg = move.damage * (stepCfg?.mul || 1);
      skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors?.accent });

      if (cfg.lunge) {
        game.velocity.x += dir.x * cfg.lunge * 2.4;
        game.velocity.z += dir.z * cfg.lunge * 2.4;
      }
      if (cfg.afterimage) vfx.addDust(origin.clone());
      if (passive?.type === "afterDash" && cfg.type === "dash") skills.addBuff(passive.buff);
      if (passive?.type === "vanish" && cfg.type === "dash") {
        skills.addBuff(passive.buff);
        sprite.visible = false;
        setTimeout(() => { if (sprite) sprite.visible = true; }, passive.duration || 700);
      }
      try {
        mp?.sendAttack?.({ kind: category === "ultimate" ? "ultimate" : "hit", origin: { x: origin.x, z: origin.z }, dir: { x: dir.x, z: dir.z }, damage: dmg, range: cfg.range || 3 });
      } catch (_) {}
    }

    function doDash() {
      if (game.dead || performance.now() < game.stunUntil || cinematics.isPlaying) return;
      const now = performance.now();
      if (game.cooldowns.dash > now) return;
      game.cooldowns.dash = now + DASH_CD;
      game.counters.dashes += 1;
      const dir = game.facing.clone().setY(0).normalize();
      game.dashDir.copy(dir);
      game.dashSpeed = DASH_SPEED;
      game.dashTime = DASH_TIME;
      vfx.addDashTrail?.(player.position.clone(), new THREE.Color(character.colors?.primary || "#fff"));
      audio.playWhoosh?.();
    }

    function triggerJump() {
      if (game.dead || cinematics.isPlaying) return;
      if (game.onGround || game.jumpsLeft > 0) {
        game.velocity.y = character.stats?.jumpForce || 11;
        game.onGround = false;
        game.jumpsLeft = Math.max(0, game.jumpsLeft - 1);
        game.counters.jumps += 1;
      }
    }

    function setMobileMove(x, y) { mobileMove.x = x; mobileMove.y = y; }
    function doQuickChat(phrase) {
      try { mp?.sendChat?.(phrase); } catch (_) {}
      const bubble = makeBubbleTexture?.(phrase);
      if (bubble) {
        const mat = new THREE.SpriteMaterial({ map: bubble, transparent: true });
        const spr = new THREE.Sprite(mat);
        spr.scale.set(3, 1.5, 1);
        spr.position.copy(player.position).setY(3.2);
        scene.add(spr);
        setTimeout(() => { scene.remove(spr); mat.dispose(); bubble.dispose?.(); }, 2500);
      }
    }
    function doEmote() {
      vfx.addGlow?.(player.position.clone().setY(1.8), new THREE.Color(character.colors?.accent || "#ff0"), 2, 0.6);
      try { mp?.sendEmote?.(emote || "wave"); } catch (_) {}
    }
    function setMyBillboard(url) {
      try { city.setBillboard?.(0, url); } catch (_) {}
    }

    apiRef.current = {
      triggerMove: doMove, triggerDash: doDash, triggerJump, setMobileMove,
      showQuickChat: doQuickChat, setMyBillboard, showEmote: doEmote,
      setDashStyle: (s) => vfx.setDashStyle?.(s),
    };

    try { audio.startAmbient?.(); } catch (_) {}

    const clock = new THREE.Clock();
    let elapsed = 0;
    let raf;
    let nearShop = false;

    function tick() {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());
      elapsed += dt;
      const now = performance.now();
      const b = bindsRef.current || {};
      const cinePlaying = cinematics.update(dt);
      const blocked = inputState.blocked || cinePlaying || game.dead;

      const cycle = (elapsed / 140) % 1;
      const dayFactor = THREE.MathUtils.clamp(Math.cos(cycle * Math.PI * 2), 0, 1);
      scene.background.lerpColors(SKY_NIGHT, SKY_DAY, dayFactor);
      scene.fog.color.lerpColors(FOG_NIGHT, FOG_DAY, dayFactor);
      sun.intensity = 0.4 + dayFactor * 0.9;
      moon.visible = dayFactor < 0.35;

      const move = new THREE.Vector3(mobileMove.x, 0, -mobileMove.y);
      if (!blocked && now >= game.stunUntil) {
        if (keys.has(b.up || "KeyW") || keys.has("ArrowUp")) move.z -= 1;
        if (keys.has(b.down || "KeyS") || keys.has("ArrowDown")) move.z += 1;
        if (keys.has(b.left || "KeyA") || keys.has("ArrowLeft")) move.x -= 1;
        if (keys.has(b.right || "KeyD") || keys.has("ArrowRight")) move.x += 1;
      }
      if (move.lengthSq() > 0 && game.dashTime <= 0) {
        const camFwd = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
        const camRight = new THREE.Vector3(camFwd.z, 0, -camFwd.x);
        const world = new THREE.Vector3().addScaledVector(camFwd, -move.z).addScaledVector(camRight, move.x).normalize();
        const speed = (character.stats?.speed || 7) * (skills.mods?.speed || 1);
        game.velocity.x = world.x * speed;
        game.velocity.z = world.z * speed;
        game.facing.set(world.x, 0, world.z).normalize();
        game.counters.distance += speed * dt;
      } else if (game.dashTime <= 0) {
        game.velocity.x *= 0.8;
        game.velocity.z *= 0.8;
      }

      if (game.dashTime > 0) {
        game.dashTime -= dt;
        game.velocity.x = game.dashDir.x * (game.dashSpeed || DASH_SPEED);
        game.velocity.z = game.dashDir.z * (game.dashSpeed || DASH_SPEED);
      }

      if (!game.onGround) game.velocity.y += GRAVITY * dt;
      player.position.x += game.velocity.x * dt;
      player.position.y += game.velocity.y * dt;
      player.position.z += game.velocity.z * dt;

      if (player.position.y <= 1.6) {
        player.position.y = 1.6;
        game.velocity.y = 0;
        game.onGround = true;
        game.jumpsLeft = 2;
      } else game.onGround = false;

      player.position.x = THREE.MathUtils.clamp(player.position.x, -MAP_HALF, MAP_HALF);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -MAP_HALF, MAP_HALF);

      for (const c of city.colliders || []) resolveCircle(c, 0.9);

      sprite.quaternion.copy(camera.quaternion);

      skills.update?.(dt);
      vfx.update(dt);

      const shopPos = shop?.position || new THREE.Vector3(12, 0, 12);
      const distShop = player.position.distanceTo(shopPos);
      const nowNear = distShop < 6;
      if (nowNear !== nearShop) {
        nearShop = nowNear;
        onNearShopRef.current?.(nearShop);
      }

      for (const [, r] of remoteSprites) {
        r.mesh.position.lerp(r.target, 0.2);
        r.mesh.quaternion.copy(camera.quaternion);
      }

      if (!cinePlaying) {
        const off = new THREE.Vector3(
          Math.sin(camYaw) * Math.cos(camPitch) * camDist,
          Math.sin(camPitch) * camDist + 2,
          Math.cos(camYaw) * Math.cos(camPitch) * camDist
        );
        camera.position.lerp(player.position.clone().add(off), 0.12);
        camera.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
      }
      try { vfx.applyShake?.(); } catch (_) {}

      try { mp?.tick?.(dt); } catch (_) {}

      renderer.render(scene, camera);

      game.counters.playtime += dt;
      if (now - game.lastStats > 100) {
        game.lastStats = now;
        onStatsRef.current?.({
          health: game.health, meter: game.meter,
          cooldowns: {
            m1: Math.max(0, game.cooldowns.m1 - now),
            special1: Math.max(0, game.cooldowns.special1 - now),
            special2: Math.max(0, game.cooldowns.special2 - now),
            special3: Math.max(0, game.cooldowns.special3 - now),
            ultimate: Math.max(0, game.cooldowns.ultimate - now),
            dash: Math.max(0, game.cooldowns.dash - now),
          },
          hits: game.hits, meterPeak: game.meterPeak,
          kills: game.counters.kills, deaths: game.deaths || 0,
          combo: game.comboShown, invuln: Math.max(0, game.invulnUntil - now),
          dead: game.dead, counters: game.counters,
        });
      }
    }
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      try { audio.stopAmbient?.(); } catch (_) {}
      try { mp?.close?.(); } catch (_) {}
      for (const [, r] of remoteSprites) { scene.remove(r.mesh); r.mat?.dispose?.(); r.nameMat?.dispose?.(); }
      cinematics.dispose();
      skills.dispose?.();
      vfx.dispose();
      shop.dispose?.();
      city.dispose?.();
      renderer.dispose();
      groundTex.dispose?.(); shadowTex.dispose?.(); playerTex.dispose?.();
      playerMat.dispose(); shadowMat.dispose();
      moon.geometry.dispose(); moon.material.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      apiRef.current = null;
    };
  }, [character, roomCode]);

  useEffect(() => { apiRef.current?.setMyBillboard(billboardUrl || ""); }, [billboardUrl, character]);
  useEffect(() => { apiRef.current?.setDashStyle(dashStyle || null); }, [dashStyle, character]);

  return <div ref={mountRef} className="absolute inset-0" />;
});

export default GameCanvas;
export { BILLBOARD_COUNT };
