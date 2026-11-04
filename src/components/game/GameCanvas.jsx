// @ts-nocheck
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { makeCharacterTexture, makeBubbleTexture, makeShadowTexture, makeCityGroundTexture } from "@/lib/gameTexture";
import { buildCity } from "@/lib/game/buildCity";
import { buildShop } from "@/lib/game/buildShop";
import { VfxManager } from "@/lib/game/vfx";
import { audio } from "@/lib/game/audio";
import { CHARACTERS, getCharacter } from "@/data/characters";
import { baseIdOf } from "@/lib/game/loadout";
import { inputState } from "@/lib/game/input";
import { MultiplayerManager } from "@/lib/game/mp";
import { SkillSystem } from "@/lib/game/skills";
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
const SUN_DAY = new THREE.Color(0xffe6c0);
const SUN_NIGHT = new THREE.Color(0x9aaad0);

function makeNameTexture(name) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const x = c.getContext("2d");
  x.font = "bold 28px sans-serif"; x.textAlign = "center";
  const w = Math.min(240, x.measureText(name).width + 24);
  x.fillStyle = "rgba(0,0,0,0.55)";
  x.fillRect((256 - w) / 2, 16, w, 32);
  x.fillStyle = "#ffffff";
  x.fillText(name, 128, 41);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const GameCanvas = forwardRef(function GameCanvas({ character, binds, onStats, roomCode, playerName, billboardUrl, dashStyle, emote, onNearShop, onRequestShop, onDefeat, onRespawn, onFeed }, ref) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;
  const onNearShopRef = useRef(onNearShop);
  onNearShopRef.current = onNearShop;
  const onRequestShopRef = useRef(onRequestShop);
  onRequestShopRef.current = onRequestShop;
  const onDefeatRef = useRef(onDefeat);
  onDefeatRef.current = onDefeat;
  const onRespawnRef = useRef(onRespawn);
  onRespawnRef.current = onRespawn;
  const onFeedRef = useRef(onFeed);
  onFeedRef.current = onFeed;
  const bindsRef = useRef(binds);
  bindsRef.current = binds;
  const billboardRef = useRef(billboardUrl);
  billboardRef.current = billboardUrl;
  const dashStyleRef = useRef(dashStyle);
  dashStyleRef.current = dashStyle;
  const emoteRef = useRef(emote);
  emoteRef.current = emote;

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
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = SKY_DAY.clone();
    scene.fog = new THREE.FogExp2(0xb8c6d8, 0.0038);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 9, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0x9fb8d8, 0x2a2a3a, 0.7);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffe6c0, 1.3);
    dir.position.set(70, 130, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 400;
    dir.shadow.camera.left = -160; dir.shadow.camera.right = 160;
    dir.shadow.camera.top = 160; dir.shadow.camera.bottom = -160;
    dir.shadow.bias = -0.0005;
    scene.add(dir);

    const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xf5f3e0, transparent: true, opacity: 0.95, fog: false }));
    moon.position.set(-80, 70, -60);
    moon.visible = false;
    scene.add(moon);

    const groundTex = makeCityGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const city = buildCity(scene);
    const vfx = new VfxManager(scene, camera);
    vfx.setDashStyle(dashStyleRef.current);

    // Puesto de la tienda dentro de la plaza.
    const shop = buildShop(scene);
    city.colliders.push(...shop.colliders);

    // --- Sincronización visual: skins y billboards de todos los jugadores ---
    const texCache = new Map();
    const billboardsApplied = new Map();

    const skinKeyOf = (lo) =>
      lo?.customImage ? `img:${lo.customImage}` : `skin:${lo?.baseId || ""}|${(lo?.colors || []).join(",")}`;

    function skinTexture(lo) {
      const key = skinKeyOf(lo);
      const cached = texCache.get(key);
      if (cached) return cached;
      let tex;
      if (lo?.customImage) {
        tex = new THREE.TextureLoader().load(lo.customImage);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
      } else {
        const base = getCharacter(lo?.baseId) || CHARACTERS[0];
        const colors = { ...base.colors };
        if (lo?.colors?.length === 3) {
          colors.primary = lo.colors[0] || colors.primary;
          colors.secondary = lo.colors[1] || colors.secondary;
          colors.accent = lo.colors[2] || colors.accent;
        }
        tex = makeCharacterTexture({ ...base, colors });
      }
      texCache.set(key, tex);
      return tex;
    }

    function applyBillboard(slot, url) {
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
    }

    let sendMyLoadout = null;
    function setMyBillboard(url) {
      const slot = mp?.mySeat ? (mp.mySeat - 1) % city.billboards.length : 0;
      applyBillboard(slot, url);
      sendMyLoadout?.();
    }

    const shadowTex = makeShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });

    // Personaje: pivote lógico (posición/collider/cámara) + sprite hijo (animación visual).
    let playerTex;
    if (character.customImage) {
      playerTex = new THREE.TextureLoader().load(character.customImage);
      playerTex.colorSpace = THREE.SRGBColorSpace;
      playerTex.anisotropy = 4;
    } else {
      playerTex = makeCharacterTexture(character);
    }
    const playerMat = new THREE.MeshBasicMaterial({ map: playerTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
    const player = new THREE.Group(); // pivote
    player.position.set(0, 1.6, 0);
    scene.add(player);
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), playerMat);
    player.add(sprite);
    const playerShadow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), shadowMat);
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.position.set(0, 0.03, 0);
    scene.add(playerShadow);

    // NPCs (bots locales)
    const npcs = [];
    const botCount = roomCode ? 2 : 4;
    const others = CHARACTERS.filter((c) => c.id !== character.id).slice(0, botCount);
    others.forEach((c, i) => {
      const tex = makeCharacterTexture(c);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), mat);
      const ang = (i / others.length) * Math.PI * 2;
      mesh.position.set(Math.cos(ang) * 14, 1.6, Math.sin(ang) * 14);
      scene.add(mesh);
      const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
      barBg.position.y = 3.7; bar.position.y = 3.7; bar.position.z = 0.01;
      mesh.add(barBg, bar);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), shadowMat);
      sh.rotation.x = -Math.PI / 2; sh.position.y = -1.57;
      mesh.add(sh);
      npcs.push({ mesh, bar, mat, health: 1000, maxHealth: 1000, respawnAt: 0, flashUntil: 0, flashColor: new THREE.Color(c.colors.accent) });
    });

    // Identidad de combate: moveset, combo y pasiva del personaje elegido.
    const baseCharId = baseIdOf(character) || character.id;
    const passive = getPassive(baseCharId);
    const archetypeId = defeatStyleFor(baseCharId).archetype;

    const game = {
      player, sprite, playerShadow, velocity: new THREE.Vector3(), facing: new THREE.Vector3(0, 0, -1),
      onGround: true, meter: 0, health: character.stats.health,
      maxHealth: character.stats.health, armor: passive?.type === "armor" ? passive.armor || 1 : 1,
      dead: false, deadAt: 0, respawnAt: 0, invulnUntil: 0, stunUntil: 0,
      kills: 0, deaths: 0, lastAttacker: null, defeatStyle: null,
      comboStep: 0, comboShown: 0, comboUntil: 0, castMove: null,
      cooldowns: { m1: 0, special1: 0, special2: 0, special3: 0, ultimate: 0, dash: 0 },
      npcs, bubble: null, bubbleUntil: 0, lastStats: 0, hits: 0, meterPeak: 0, wasGround: true,
      lurch: 0, walkPhase: 0, landSquash: 0, stretch: 0,
      dashTime: 0, dashDir: new THREE.Vector3(0, 0, -1), trailTimer: 0, lastMpSend: 0,
      dashSpeed: DASH_SPEED, dashDamage: 0, dashRadius: 2.2, dashHits: new Set(),
      mobileMove: { x: 0, y: 0, active: false }, lastSeat: null,
      counters: { jumps: 0, distance: 0, dashes: 0, damage: 0, hits: 0, kills: 0, ultimates: 0, skills: 0, playtime: 0 },
    };

    // --- Sistema modular de habilidades: cada golpe tiene comportamiento real ---
    const npcTargets = game.npcs.map((npc, i) => ({
      id: `npc${i}`,
      pos: npc.mesh.position,
      radius: 1.1,
      get alive() { return npc.mesh.visible && npc.respawnAt === 0; },
      hurt(dmg, from, knock) {
        const t = performance.now();
        npc.health = Math.max(0, npc.health - dmg);
        npc.bar.scale.x = Math.max(0.001, npc.health / npc.maxHealth);
        npc.bar.material.color.setHSL(0.33 * (npc.health / npc.maxHealth), 0.8, 0.5);
        npc.flashUntil = t + 140;
        const push = npc.mesh.position.clone().sub(from).setY(0);
        if (push.lengthSq() > 0.001) npc.mesh.position.add(push.normalize().multiplyScalar((knock || 1.4) * 0.5));
        if (npc.health <= 0) { npc.respawnAt = t + 2500; npc.mesh.visible = false; game.counters.kills += 1; }
      },
    }));

    const crateProps = city.crates.map((c, i) => ({
      id: `crate${i}`,
      pos: c.mesh.position,
      radius: 0.9,
      dead: () => c.respawnAt > performance.now(),
      hurt(dmg) {
        const t = performance.now();
        if (c.respawnAt > t || !c.mesh.visible) return;
        c.health -= dmg;
        if (c.health <= 0) {
          c.mesh.visible = false; c.respawnAt = t + 4000;
          vfx.addDebris(c.mesh.position.clone(), 0x8a6a3a);
          audio.playBreak();
        }
      },
    }));

    let lastHitSound = 0;
    const skills = new SkillSystem({
      scene,
      vfx,
      colliders: city.colliders,
      onHit: (target, dmg) => {
        const t = performance.now();
        if (t - lastHitSound > 90) { lastHitSound = t; audio.playHit(1); }
        game.counters.hits += 1;
        game.counters.damage += dmg || 0;
        game.hits += 1;
        game.meter = Math.min(100, game.meter + 8 * (passive?.type === "combo" ? passive.meterGain || 1.4 : 1));
        game.meterPeak = Math.max(game.meterPeak, game.meter);

        // Pasivas reales: robo de vida, eco repetido y enfriamiento del dash.
        const pct = passive?.type === "lifesteal"
          ? passive.pct
          : (game.castMove?.lifesteal || 0);
        if (pct > 0) game.health = Math.min(game.maxHealth, game.health + dmg * pct);
        if (passive?.type === "dashReset") game.cooldowns.dash = Math.max(0, game.cooldowns.dash - (passive.reduce || 400));
        if (passive?.type === "echo") {
          game.echoCount = (game.echoCount || 0) + 1;
          if (game.echoCount % (passive.every || 3) === 0) {
            const at = target.pos.clone();
            skills.later(150, () => {
              skills.applyRadialDamage(at, 2.6, dmg * (passive.pct || 0.4), 1.2, null);
              vfx.addGlow(at.clone().setY(1.6), tmpColor.set(character.colors.accent), 2.4, 0.32);
            });
          }
        }
      },
      onHeal: (amount) => { game.health = Math.min(character.stats.health, game.health + amount); },
      onDash: (opts) => startSkillDash(opts),
    });
    skills.setTargets(npcTargets);
    skills.setProps(crateProps);

    function resolveCircle(c, pr) {
      const hx = c.w / 2, hz = c.d / 2;
      const dx = game.player.position.x - c.x;
      const dz = game.player.position.z - c.z;
      const cx = THREE.MathUtils.clamp(dx, -hx, hx);
      const cz = THREE.MathUtils.clamp(dz, -hz, hz);
      const ox = dx - cx, oz = dz - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 >= pr * pr) return;
      if (d2 > 1e-6) {
        const dist = Math.sqrt(d2);
        game.player.position.x += (ox / dist) * (pr - dist);
        game.player.position.z += (oz / dist) * (pr - dist);
      } else {
        const penX = hx - Math.abs(dx), penZ = hz - Math.abs(dz);
        if (penX < penZ) game.player.position.x += (dx >= 0 ? 1 : -1) * (penX + pr);
        else game.player.position.z += (dz >= 0 ? 1 : -1) * (penZ + pr);
      }
    }

    function blockersHit(pos, r) {
      const test = (c) => Math.abs(pos.x - c.x) < c.w / 2 + r && Math.abs(pos.z - c.z) < c.d / 2 + r;
      for (const c of city.colliders) if (test(c)) return true;
      for (const c of skills.blockers) if (test(c)) return true;
      return false;
    }

    // Dash de habilidad: desplaza de verdad, respeta colisiones y hace daño real.
    function startSkillDash({ dir, distance = 8, speed = 28, damage = 0, radius = 2.2, phase = false }) {
      const d = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      game.dashHits.clear();
      game.counters.dashes += 1;
      tmpColor.set(character.colors.accent);
      if (phase) {
        const from = game.player.position.clone();
        const target = from.clone();
        const step = 0.6;
        const steps = Math.round(distance / step);
        for (let i = 0; i < steps; i++) {
          const next = target.clone().addScaledVector(d, step);
          if (blockersHit(next, 0.9)) break;
          target.copy(next);
        }
        vfx.addDashTrail(from, tmpColor);
        game.player.position.copy(target);
        vfx.addShockwave(target.clone(), tmpColor, false);
        if (damage > 0) skills.applyRadialDamage(target, radius, damage, 3, game.dashHits);
        return;
      }
      game.dashDir.copy(d);
      game.dashSpeed = speed;
      game.dashTime = Math.max(0.12, distance / speed);
      game.dashDamage = damage;
      game.dashRadius = radius;
    }

    // ---------- daño recibido, derrota y reaparición ----------

    function applyDamage(amount, attackerSeat) {
      const now = performance.now();
      if (game.dead || amount <= 0) return;
      if (now < game.invulnUntil) return;
      let dmg = amount * (game.armor || 1) * skills.mods.defense;
      if (skills.counterActive) {
        const reflect = skills.consumeCounter();
        dmg *= 1 - reflect * 0.5;
        vfx.addShockwave(game.player.position.clone().setY(0.2), tmpColor.set(character.colors.accent), true);
        if (mp) {
          mp.sendEvent({
            kind: "hit",
            x: game.player.position.x, y: 1.6, z: game.player.position.z,
            color: character.colors.accent, damage: Math.round(amount * reflect), slow: 0, stun: 0,
          });
        }
      }
      if (attackerSeat) game.lastAttacker = attackerSeat;
      game.health = Math.max(0, game.health - dmg);
      vfx.addImpact(game.player.position.clone().setY(1.2), tmpColor.set(character.colors.accent), 0.8);
      if (game.health <= 0) beginDefeat();
    }

    function beginDefeat() {
      if (game.dead) return;
      game.dead = true;
      game.deadAt = performance.now();
      game.deaths += 1;
      game.comboStep = 0;
      game.comboShown = 0;
      game.dashTime = 0;
      game.velocity.set(0, 0, 0);
      game.respawnAt = game.deadAt + RESPAWN_DELAY_MS;
      const info = defeatStyleFor(baseCharId);
      game.defeatStyle = info;
      vfx.addDefeatBurst(game.player.position.clone(), tmpColor.set(character.colors.accent), info);
      vfx.addShake(0.8);
      audio.playHit(1);
      onDefeatRef.current?.({
        style: info.style,
        archetype: info.archetype,
        kills: game.kills,
        deaths: game.deaths,
        respawnIn: Math.ceil(RESPAWN_DELAY_MS / 1000),
      });
      if (mp) {
        mp.sendEvent({
          kind: "death",
          style: info.style,
          archetype: info.archetype,
          killer: game.lastAttacker || null,
          x: game.player.position.x, y: game.player.position.y, z: game.player.position.z,
          color: character.colors.accent,
        });
        mp.sendState({
          x: game.player.position.x, y: game.player.position.y, z: game.player.position.z,
          yaw: 0, anim: "dead", charId: character.id, name: playerName || "Tú",
          hp: 0, meter: game.meter, attack: 0, dead: true,
        });
      }
    }

    function respawnNow() {
      game.dead = false;
      game.health = game.maxHealth;
      game.meter = Math.max(0, game.meter * 0.6);
      game.invulnUntil = performance.now() + INVULN_MS;
      game.stunUntil = 0;
      game.lastAttacker = null;
      game.player.position.set(RESPAWN_POINT.x, RESPAWN_POINT.y, RESPAWN_POINT.z);
      game.velocity.set(0, 0, 0);
      game.dashTime = 0;
      game.comboStep = 0;
      game.comboShown = 0;
      game.mobileMove.active = false;
      game.mobileMove.x = 0;
      game.mobileMove.y = 0;
      sprite.rotation.set(0, sprite.rotation.y, 0);
      sprite.scale.set(1, 1, 1);
      sprite.position.set(0, 0, 0);
      playerMat.opacity = 1;
      playerMat.color.setRGB(1, 1, 1);
      skills.buffs.length = 0;
      skills.recalcMods();
      skills.counter = null;
      vfx.addRespawnRing(game.player.position.clone(), tmpColor.set(character.colors.accent));
      audio.playLand();
      onRespawnRef.current?.();
      if (mp) {
        mp.sendEvent({ kind: "respawn", x: RESPAWN_POINT.x, y: RESPAWN_POINT.y, z: RESPAWN_POINT.z, color: character.colors.accent });
        mp.sendState({
          x: RESPAWN_POINT.x, y: RESPAWN_POINT.y, z: RESPAWN_POINT.z,
          yaw: 0, anim: "idle", charId: character.id, name: playerName || "Tú",
          hp: game.health, meter: game.meter, attack: 0, dead: false,
        });
      }
    }

    // Multijugador
    const loadoutTimers = [];
    let mp = null;
    const remoteSprites = new Map(); // seat -> { mesh, sprite, bar, mat, nameMat, pos, walkPhase, maxHp }
    if (roomCode) {
      let connId = sessionStorage.getItem("arena_conn_id");
      if (!connId) { connId = crypto.randomUUID(); sessionStorage.setItem("arena_conn_id", connId); }
      try {
        mp = new MultiplayerManager(roomCode, connId);
        mp.onEvent = (msg) => {
          if (msg.from === mp.mySeat) return; // ignorar mi propio ataque
          const p = new THREE.Vector3(msg.x, msg.y, msg.z);
          if (msg.kind === "emote") {
            vfx.addEmoteBurst(p.clone().setY(0.1), new THREE.Color(msg.color || "#ffffff"));
            const r = remoteSprites.get(msg.from);
            if (r) { r.emoteAnim = msg.anim; r.emoteStart = performance.now(); r.emoteUntil = performance.now() + 2000; }
            return;
          }
          // Derrota de otro jugador: la animación se reproduce aquí con el estilo recibido.
          if (msg.kind === "death") {
            const tint = new THREE.Color(msg.color || "#ffffff");
            vfx.addDefeatBurst(p.clone(), tint, { particle: "sparks", shake: 0.4, tint: msg.color });
            const remote = remoteSprites.get(msg.from);
            if (remote) {
              remote.deadAt = performance.now();
              remote.defeatStyle = msg.style;
            }
            if (msg.killer === mp.mySeat) game.kills += 1;
            onFeedRef.current?.({
              killerSeat: msg.killer || null,
              killerName: msg.killer === mp.mySeat ? null : (mp.loadouts.get(msg.killer)?.name || null),
              victimName: mp.loadouts.get(msg.from)?.name || null,
              archetype: msg.archetype || "balanced",
              mine: msg.killer === mp.mySeat,
            });
            return;
          }

          if (msg.kind === "respawn") {
            const remote = remoteSprites.get(msg.from);
            if (remote) {
              remote.pos.set(msg.x, msg.y || 1.6, msg.z);
              remote.mesh.position.copy(remote.pos);
              remote.deadAt = 0;
            }
            vfx.addRespawnRing(p.clone(), new THREE.Color(msg.color || "#ffffff"));
            return;
          }

          const color = new THREE.Color(msg.color || "#ffffff");
          const ult = msg.kind === "ultimate";
          if (ult) vfx.addUltimateBurst(p, color);
          else vfx.addImpact(p, color, 1.2);
          // Fuego amigo real: daño con armadura/defensa, ralentización y aturdimiento.
          if (p.distanceTo(game.player.position) < (ult ? 4 : 2.3)) {
            if (msg.slow) skills.addBuff({ stat: "speed", mult: Math.max(0.4, 1 - msg.slow), duration: 1200 });
            if (msg.stun) game.stunUntil = performance.now() + msg.stun;
            applyDamage(msg.damage || (ult ? 320 : 60), msg.from);
          }
        };
        sendMyLoadout = () => mp?.sendLoadout({
          baseId: baseIdOf(character),
          charId: character.id,
          name: playerName || "Tú",
          colors: [character.colors.primary, character.colors.secondary, character.colors.accent],
          customImage: character.customImage || "",
          billboard: billboardRef.current || "",
        });
        sendMyLoadout();
        loadoutTimers.push(setTimeout(() => sendMyLoadout?.(), 1200));
        loadoutTimers.push(setTimeout(() => sendMyLoadout?.(), 3500));
      } catch (e) { console.warn("mp init failed", e); mp = null; }
    }

    const camState = { yaw: 0, pitch: 0.42, dist: 13, dragging: false, lastX: 0, lastY: 0 };
    const onPointerDown = (e) => {
      camState.dragging = true;
      camState.lastX = e.clientX; camState.lastY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!camState.dragging) return;
      const dx = e.clientX - camState.lastX;
      const dy = e.clientY - camState.lastY;
      camState.lastX = e.clientX; camState.lastY = e.clientY;
      camState.yaw -= dx * 0.005;
      camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, 0.15, 1.2);
    };
    const onPointerUp = () => { camState.dragging = false; };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const keys = new Set();
    const tmpColor = new THREE.Color();
    const tmpVec = new THREE.Vector3();
    const tmpDusk = new THREE.Color(0xe88a4a);
    const onKeyDown = (e) => {
      keys.add(e.code);
      if (inputState.blocked) return;
      audio.resume();
      if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }
      const b = bindsRef.current;
      if (e.code === b?.jump || e.code === b?.dash) e.preventDefault();
      const actionFor = (code) => Object.entries(b).find(([, v]) => v === code)?.[0];
      const act = actionFor(e.code);
      if (act === "dash") doDash();
      else if (act && ["m1", "special1", "special2", "special3", "ultimate"].includes(act)) doMove(act);
    };
    const onKeyUp = (e) => keys.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function doMove(category) {
      if (game.dead || performance.now() < game.stunUntil) return;
      const move = character.moves[category];
      if (!move) return;
      const now = performance.now();
      if (game.cooldowns[category] > now) return;
      if (move.meterCost && game.meter < move.meterCost) return;

      // Combo de ataque básico: cada paso encadena si se pulsa dentro de la ventana.
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
      const big = category === "ultimate";
      game.counters.skills += 1;
      if (big) game.counters.ultimates += 1;
      if (big) audio.playUltimate(); else audio.playWhoosh();

      const origin = game.player.position.clone();
      const dir = game.facing.clone().setY(0).normalize();
      const baseCfg = getMoveConfig(baseCharId, category);
      const cfg = stepCfg
        ? {
            ...baseCfg,
            arc: stepCfg.arc ?? baseCfg.arc,
            range: stepCfg.range ?? baseCfg.range,
            knock: stepCfg.knock ?? baseCfg.knock,
            launch: stepCfg.launch ?? baseCfg.launch,
            slow: stepCfg.slow ?? baseCfg.slow,
          }
        : baseCfg;
      const dmg = move.damage * (stepCfg?.mul || 1);

      skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors.accent });

      // Impulso corto hacia adelante en los golpes cuerpo a cuerpo.
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

      if (mp) {
        const at = origin.clone().addScaledVector(dir, 1.7);
        mp.sendEvent({
          kind: big ? "ultimate" : "hit",
          x: at.x, y: 1.6, z: at.z,
          color: character.colors.accent,
          damage: Math.round(big ? dmg / 3 : dmg),
          slow: cfg.slow ? 1 - cfg.slow.mult : 0,
          stun: cfg.stun || 0,
        });
      }
    }

    function doDash() {
      const now = performance.now();
      if (game.dead || now < game.stunUntil) return;
      if (game.cooldowns.dash > now) return;
      game.cooldowns.dash = now + DASH_CD;
      game.counters.dashes += 1;
      const b = bindsRef.current;
      const mx = (keys.has(b.right) ? 1 : 0) - (keys.has(b.left) ? 1 : 0);
      const mz = (keys.has(b.up) ? 1 : 0) - (keys.has(b.down) ? 1 : 0);
      let d;
      if (mx || mz) {
        const camFwd = new THREE.Vector3(Math.sin(camState.yaw), 0, Math.cos(camState.yaw)).normalize();
        const camRight = new THREE.Vector3(camFwd.z, 0, -camFwd.x);
        d = new THREE.Vector3().addScaledVector(camFwd, mz).addScaledVector(camRight, mx).normalize();
      } else {
        d = game.facing.clone().normalize();
      }
      game.dashDir.copy(d);
      game.dashTime = DASH_TIME;
      game.dashSpeed = DASH_SPEED;
      game.dashDamage = 0;
      audio.playWhoosh();
    }

    function doQuickChat(phrase) {
      if (game.bubble) { scene.remove(game.bubble); game.bubble.material.map?.dispose(); game.bubble.material.dispose(); }
      const tex = makeBubbleTexture(phrase.text);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const bubble = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), mat);
      bubble.position.copy(game.player.position); bubble.position.y = 4.4;
      scene.add(bubble);
      game.bubble = bubble; game.bubbleUntil = performance.now() + 2600;
      audio.playBlip();
    }

    // Emote equipado: el personaje se mueve durante un par de segundos.
    function doEmote() {
      const e = emoteRef.current;
      if (!e?.anim) return;
      const now = performance.now();
      game.emoteAnim = e.anim;
      game.emoteStart = now;
      game.emoteUntil = now + 2000;
      vfx.addEmoteBurst(game.player.position.clone().setY(0.1), tmpColor.set(character.colors.accent));
      audio.playBlip();
      if (mp) {
        mp.sendEvent({
          kind: "emote", anim: e.anim,
          x: game.player.position.x, y: game.player.position.y, z: game.player.position.z,
          color: character.colors.accent,
        });
      }
    }

    function makeRemoteSprite(seat, st) {
      const lo = mp?.loadouts.get(seat) || null;
      const mat = new THREE.MeshBasicMaterial({ map: skinTexture(lo), transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
      const mesh = new THREE.Group();
      mesh.position.set(st.x, st.y || 1.6, st.z);
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), mat);
      mesh.add(sp);
      const nameTex = makeNameTexture(lo?.name || st.name || "Jugador");
      const nameMat = new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), nameMat);
      nameMesh.position.y = 2.4;
      mesh.add(nameMesh);
      const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
      barBg.position.y = 2.1; bar.position.y = 2.1; bar.position.z = 0.01;
      mesh.add(barBg, bar);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), shadowMat);
      sh.rotation.x = -Math.PI / 2; sh.position.y = -1.57;
      mesh.add(sh);
      scene.add(mesh);
      const char = getCharacter(lo?.baseId || st.charId);
      return { mesh, sprite: sp, bar, mat, nameMat, pos: new THREE.Vector3(st.x, st.y || 1.6, st.z), walkPhase: 0, maxHp: char ? char.stats.health : 1000, skinKey: skinKeyOf(lo), emoteAnim: null, emoteStart: 0, emoteUntil: 0 };
    }

    function triggerJump() {
      if (game.dead) return;
      if (game.onGround) {
        game.velocity.y = character.stats.jumpForce; game.onGround = false; game.stretch = 1;
        game.counters.jumps += 1;
        audio.playJump();
      }
    }
    function setMobileMove(x, y) {
      game.mobileMove.x = x; game.mobileMove.y = y;
      game.mobileMove.active = x !== 0 || y !== 0;
    }
    apiRef.current = { triggerMove: doMove, triggerDash: doDash, triggerJump, setMobileMove, showQuickChat: doQuickChat, setMyBillboard, showEmote: doEmote, setDashStyle: (s) => vfx.setDashStyle(s) };

    audio.startAmbient();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let elapsed = 0;
    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());
      elapsed += dt;
      const now = performance.now();
      const b = bindsRef.current;
      const blocked = inputState.blocked;

      // Ciclo día/noche
      const cycle = (elapsed / 140) % 1;
      const sun = Math.cos(cycle * Math.PI * 2);
      const dayFactor = THREE.MathUtils.clamp(sun, 0, 1);
      const nightFactor = 1 - dayFactor;
      const dusk = Math.max(0, 1 - Math.abs(sun) * 2.2);
      tmpColor.copy(SKY_DAY).lerp(SKY_NIGHT, nightFactor).lerp(tmpDusk, dusk * 0.45);
      scene.background.copy(tmpColor);
      scene.fog.color.copy(tmpColor).lerp(FOG_NIGHT, nightFactor * 0.45);
      scene.fog.density = 0.0026 + 0.0014 * nightFactor;
      dir.intensity = 0.55 + 1.05 * dayFactor + dusk * 0.15;
      dir.color.copy(SUN_DAY).lerp(SUN_NIGHT, nightFactor).lerp(tmpDusk, dusk * 0.4);
      const sunAngle = cycle * Math.PI * 2;
      dir.position.set(Math.cos(sunAngle) * 90, 30 + Math.max(0, sun) * 130, 50 + Math.sin(sunAngle) * 30);
      hemi.intensity = 0.45 + 0.4 * dayFactor;
      hemi.color.copy(SKY_DAY).lerp(SKY_NIGHT, nightFactor * 0.6);
      moon.visible = nightFactor > 0.25;
      moon.position.set(-Math.cos(sunAngle) * 90, 30 + Math.max(0, -sun) * 130 + 20, -50 - Math.sin(sunAngle) * 30);
      city.setNight(nightFactor);
      shop.setNight(nightFactor);

      // Movimiento
      const move = new THREE.Vector3();
      if (game.mobileMove.active) {
        move.x = game.mobileMove.x;
        move.z = -game.mobileMove.y;
      } else if (!blocked && !game.dead && now >= game.stunUntil) {
        if (keys.has(b.up)) move.z -= 1;
        if (keys.has(b.down)) move.z += 1;
        if (keys.has(b.left)) move.x -= 1;
        if (keys.has(b.right)) move.x += 1;
      }
      if (move.lengthSq() > 0) {
        const camFwd = new THREE.Vector3(Math.sin(camState.yaw), 0, Math.cos(camState.yaw)).normalize();
        const camRight = new THREE.Vector3(camFwd.z, 0, -camFwd.x);
        const world = new THREE.Vector3()
          .addScaledVector(camFwd, -move.z)
          .addScaledVector(camRight, move.x);
        world.normalize().multiplyScalar(character.stats.speed * skills.mods.speed);
        game.velocity.x = world.x; game.velocity.z = world.z;
        game.facing.set(world.x, 0, world.z).normalize();
      } else { game.velocity.x *= 0.8; game.velocity.z *= 0.8; }

      // Dash (anula velocidad normal)
      if (game.dashTime > 0) {
        game.dashTime -= dt;
        const dspeed = game.dashSpeed || DASH_SPEED;
        game.velocity.x = game.dashDir.x * dspeed;
        game.velocity.z = game.dashDir.z * dspeed;
        game.facing.set(game.dashDir.x, 0, game.dashDir.z).normalize();
        if (game.dashDamage > 0) {
          skills.applyRadialDamage(game.player.position, game.dashRadius, game.dashDamage, 2.4, game.dashHits);
        }
        game.trailTimer += dt;
        if (game.trailTimer > 0.03) {
          game.trailTimer = 0;
          vfx.addDashTrail(game.player.position.clone(), tmpColor.set(character.colors.accent));
        }
      }

      if (!blocked && !game.dead && keys.has(b.jump) && game.onGround) {
        game.velocity.y = character.stats.jumpForce; game.onGround = false; game.stretch = 1;
        game.counters.jumps += 1;
        audio.playJump();
      }
      game.velocity.y += GRAVITY * dt;
      game.player.position.x += game.velocity.x * dt;
      game.player.position.z += game.velocity.z * dt;
      game.player.position.y += game.velocity.y * dt;
      if (game.player.position.y <= 1.6) {
        game.player.position.y = 1.6;
        if (!game.wasGround) { audio.playLand(); vfx.addDust(game.player.position.clone()); game.landSquash = 1; }
        game.velocity.y = 0; game.onGround = true;
      }
      game.wasGround = game.onGround;
      game.player.position.x = THREE.MathUtils.clamp(game.player.position.x, -MAP_HALF, MAP_HALF);
      game.player.position.z = THREE.MathUtils.clamp(game.player.position.z, -MAP_HALF, MAP_HALF);
      game.counters.distance += Math.hypot(game.velocity.x, game.velocity.z) * dt;
      game.counters.playtime += dt;

      // Derrota: sin desplazamiento y reaparición en el centro del mapa al terminar.
      if (game.dead) {
        game.velocity.x = 0;
        game.velocity.z = 0;
        if (now >= game.respawnAt) respawnNow();
      }

      // Colisión con edificios (AABB en XZ)
      const pr = 1.0;
      for (const c of city.colliders) resolveCircle(c, pr);
      for (const c of skills.blockers) resolveCircle(c, pr);

      // Puesto de la tienda: avisa al HUD cuando el jugador está cerca.
      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;
      if (nearShop !== game.nearShop) {
        game.nearShop = nearShop;
        onNearShopRef.current?.(nearShop);
      }

      // Sombra
      const sh = THREE.MathUtils.clamp(1 - (game.player.position.y - 1.6) * 0.12, 0.4, 1);
      game.playerShadow.position.x = game.player.position.x;
      game.playerShadow.position.z = game.player.position.z;
      game.playerShadow.scale.set(sh, sh, sh);
      game.playerShadow.material.opacity = sh;

      // Animación del sprite (billboard que mira a la cámara)
      const speedXZ = Math.hypot(game.velocity.x, game.velocity.z);
      const speedFrac = Math.min(1, speedXZ / character.stats.speed);
      if (game.onGround && speedXZ > 0.5) game.walkPhase += dt * (6 + speedFrac * 6);
      const bob = (game.onGround && speedXZ > 0.5) ? Math.sin(game.walkPhase) * 0.14 * speedFrac : 0;
      const sway = (game.onGround && speedXZ > 0.5) ? Math.cos(game.walkPhase) * 0.06 * speedFrac : 0;
      game.lurch = Math.max(0, game.lurch - dt * 5);
      game.stretch = Math.max(0, game.stretch - dt * 3);
      game.landSquash = Math.max(0, game.landSquash - dt * 4);
      const thrust = game.lurch * 0.6;
      const ang = Math.atan2(camera.position.x - game.player.position.x, camera.position.z - game.player.position.z);
      sprite.position.set(game.facing.x * thrust, bob, game.facing.z * thrust);
      sprite.rotation.y = ang;
      sprite.rotation.x = -0.25 * game.lurch;
      const sx = (1 + 0.12 * game.lurch) * (1 + 0.15 * game.landSquash) * (1 + sway);
      const sy = (1 - 0.04 * game.lurch) * (1 - 0.2 * game.landSquash) * (1 + 0.25 * game.stretch);
      sprite.scale.set(sx, sy, 1);

      // Emote: el personaje se mueve (baile, saludo, giro, flexión, saltitos).
      sprite.rotation.z = 0;
      if (game.emoteUntil > now) {
        const et = (now - game.emoteStart) / 1000;
        const anim = game.emoteAnim;
        if (anim === "dance") {
          sprite.position.y = bob + Math.abs(Math.sin(et * 9)) * 0.32;
          sprite.rotation.z = Math.sin(et * 9) * 0.22;
          sprite.scale.x = sx * (1 + Math.sin(et * 18) * 0.08);
        } else if (anim === "wave") {
          sprite.rotation.z = Math.sin(et * 14) * 0.26;
          sprite.position.y = bob + Math.abs(Math.sin(et * 7)) * 0.12;
        } else if (anim === "spin") {
          sprite.rotation.y = ang + et * Math.PI * 3;
        } else if (anim === "flex") {
          const p = Math.abs(Math.sin(et * 6));
          sprite.scale.set(sx * (1 + p * 0.24), sy * (1 + p * 0.12), 1);
          sprite.position.y = bob + p * 0.16;
        } else if (anim === "hop") {
          const p = Math.abs(Math.sin(et * 8));
          sprite.position.y = bob + p * 1.2;
          sprite.scale.set(sx * (1 - p * 0.1), sy * (1 + p * 0.1), 1);
        }
      }

      // Animación de derrota: cada estilo cae, se disuelve, se congela o gira.
      if (game.dead) {
        const et2 = (now - game.deadAt) / 1000;
        const motion = game.defeatStyle?.motion;
        if (motion === "crash") {
          sprite.position.y = -0.95 * Math.min(1, et2 * 3);
          sprite.rotation.z = Math.min(1.35, et2 * 3) * 0.9;
          sprite.scale.set(sx * 1.1, sy * 0.8, 1);
        } else if (motion === "dissolve") {
          playerMat.opacity = Math.max(0.12, 1 - et2 * 0.9);
          sprite.position.y = bob + et2 * 0.7;
          sprite.rotation.y = ang + et2 * 4;
        } else if (motion === "freeze") {
          playerMat.color.setHex(0x9fe8ff);
          sprite.rotation.z = 0.12 * Math.sin(et2 * 2);
        } else if (motion === "pierce") {
          sprite.rotation.z = -0.35 * Math.min(1, et2 * 4);
          sprite.position.y = -0.3 * Math.min(1, et2 * 3);
        } else if (motion === "blitz") {
          sprite.rotation.z = et2 * 12;
          const shrink = 1 - Math.min(0.55, et2 * 0.4);
          sprite.scale.set(sx * shrink, sy * shrink, 1);
        } else {
          sprite.rotation.z = Math.min(1.2, et2 * 2.4) * 0.7;
          sprite.position.y = -0.75 * Math.min(1, et2 * 2.5);
        }
      } else if (now < game.invulnUntil) {
        // Indicador de invulnerabilidad tras reaparecer.
        playerMat.opacity = 0.55 + 0.35 * Math.abs(Math.sin(now / 120));
        playerMat.color.setRGB(1, 1, 1);
        sprite.rotation.z = 0;
      } else if (playerMat.opacity !== 1) {
        playerMat.opacity = 1;
        playerMat.color.setRGB(1, 1, 1);
      }

      // NPCs
      for (const npc of game.npcs) {
        if (npc.respawnAt > 0 && now > npc.respawnAt) {
          npc.health = npc.maxHealth; npc.bar.scale.x = 1; npc.bar.material.color.setHex(0x2ecc71);
          npc.mesh.visible = true; npc.respawnAt = 0;
        }
        if (npc.mesh.visible) {
          const a = Math.atan2(camera.position.x - npc.mesh.position.x, camera.position.z - npc.mesh.position.z);
          npc.mesh.rotation.y = a;
          if (now < npc.flashUntil) npc.mat.color.copy(npc.flashColor);
          else npc.mat.color.setRGB(1, 1, 1);
        }
      }

      // Burbuja quick chat
      if (game.bubble) {
        if (now > game.bubbleUntil) {
          scene.remove(game.bubble); game.bubble.material.map?.dispose(); game.bubble.material.dispose(); game.bubble = null;
        } else {
          game.bubble.position.x = game.player.position.x; game.bubble.position.z = game.player.position.z;
          game.bubble.rotation.y = Math.atan2(camera.position.x - game.bubble.position.x, camera.position.z - game.bubble.position.z);
        }
      }

      // Multijugador: render de jugadores remotos
      if (mp) {
        const seen = new Set();
        for (const [seat, st] of mp.remotes) {
          if (!st) continue;
          seen.add(seat);
          const lo = mp.loadouts.get(seat) || null;
          let r = remoteSprites.get(seat);
          if (!r) { r = makeRemoteSprite(seat, st); remoteSprites.set(seat, r); }
          const skinKey = skinKeyOf(lo);
          if (r.skinKey !== skinKey) {
            r.skinKey = skinKey;
            r.mat.map = skinTexture(lo);
            r.mat.needsUpdate = true;
          }
          if (lo?.billboard) applyBillboard((seat - 1) % city.billboards.length, lo.billboard);
          r.pos.lerp(tmpVec.set(st.x, st.y || 1.6, st.z), 0.25);
          r.mesh.position.copy(r.pos);
          const moving = st.anim === "run" || st.anim === "dash";
          if (moving) r.walkPhase += dt * 10;
          const rBob = moving ? Math.sin(r.walkPhase) * 0.14 : 0;
          const rThrust = st.attack ? 0.5 : 0;
          const ryaw = st.yaw || 0;
          r.sprite.position.set(Math.sin(ryaw) * rThrust, rBob, Math.cos(ryaw) * rThrust);
          r.sprite.rotation.y = Math.atan2(camera.position.x - r.pos.x, camera.position.z - r.pos.z);
          r.sprite.rotation.x = st.attack ? -0.25 : 0;
          r.sprite.scale.set(st.attack ? 1.12 : 1, st.attack ? 0.96 : 1, 1);
          r.sprite.rotation.z = 0;

          // Estado de derrota recibido: se ve caer/desvanecerse igual en todos los clientes.
          if (st.dead || r.deadAt) {
            r.bar.visible = false;
            const de = r.deadAt ? (now - r.deadAt) / 1000 : 2;
            const motion = r.defeatStyle && r.defeatStyle !== "tank" ? "dissolve" : "crash";
            if (motion === "dissolve") {
              r.mat.opacity = Math.max(0.1, 1 - de * 0.7);
              r.sprite.position.y = rBob + de * 0.6;
            } else {
              r.sprite.rotation.z = Math.min(1.3, de * 3) * 0.9;
              r.sprite.position.y = -0.85 * Math.min(1, de * 3);
            }
          } else {
            r.bar.visible = true;
            r.mat.opacity = 1;
          }
          if (r.emoteUntil > now) {
            const et = (now - r.emoteStart) / 1000;
            if (r.emoteAnim === "spin") r.sprite.rotation.y = r.sprite.rotation.y + et * Math.PI * 3;
            else if (r.emoteAnim === "hop") r.sprite.position.y += Math.abs(Math.sin(et * 8)) * 1.1;
            else {
              r.sprite.position.y += Math.abs(Math.sin(et * 9)) * 0.3;
              r.sprite.rotation.z = Math.sin(et * 9) * 0.2;
            }
          }
          const frac = Math.max(0, Math.min(1, st.hp / r.maxHp));
          r.bar.scale.x = Math.max(0.001, frac);
          r.bar.material.color.setHSL(0.33 * frac, 0.8, 0.5);
        }
        for (const [seat, r] of remoteSprites) {
          if (!seen.has(seat)) { scene.remove(r.mesh); r.mat.dispose(); r.nameMat.dispose(); remoteSprites.delete(seat); }
        }
        if (mp.mySeat !== game.lastSeat) {
          game.lastSeat = mp.mySeat;
          if (mp.mySeat) setMyBillboard(billboardRef.current);
        }
        // enviar estado propio
        if (now - game.lastMpSend > 66) {
          game.lastMpSend = now;
          const anim = game.dead ? "dead" : game.dashTime > 0 ? "dash" : (speedXZ > 0.5 ? "run" : "idle");
          mp.sendState({
            x: game.player.position.x, y: game.player.position.y, z: game.player.position.z,
            yaw: Math.atan2(game.facing.x, game.facing.z), anim,
            charId: character.id, name: playerName || "Tú",
            hp: game.health, meter: game.meter, attack: game.lurch > 0.1 && !game.dead ? 1 : 0,
            dead: game.dead,
          });
        }
      }

      skills.update(dt);
      city.update(now);
      shop.update(now);
      vfx.update(dt);

      // Cámara orbital (más cerca y girando lentamente durante la derrota)
      const camYaw = camState.yaw + (game.dead ? elapsed * 0.14 : 0);
      const camDist = game.dead ? camState.dist * 0.62 : camState.dist;
      const camPitch = game.dead ? Math.min(0.46, camState.pitch) : camState.pitch;
      const off = new THREE.Vector3(
        Math.sin(camYaw) * Math.cos(camPitch) * camDist,
        Math.sin(camPitch) * camDist + 2,
        Math.cos(camYaw) * Math.cos(camPitch) * camDist
      );
      const camTarget = game.player.position.clone().add(off);
      camera.position.lerp(camTarget, 0.12);
      camera.lookAt(game.player.position.x, game.player.position.y + 0.5, game.player.position.z);
      vfx.applyShake();

      renderer.render(scene, camera);

      if (now - game.lastStats > 100) {
        game.lastStats = now;
        const cooldowns = {};
        for (const k of Object.keys(game.cooldowns)) cooldowns[k] = Math.max(0, game.cooldowns[k] - now);
        onStatsRef.current?.({
          health: game.health, meter: game.meter, cooldowns,
          hits: game.hits, meterPeak: game.meterPeak, counters: game.counters,
          kills: game.kills, deaths: game.deaths, dead: game.dead,
          combo: game.comboShown || 0,
          invuln: Math.max(0, game.invulnUntil - now),
          respawnIn: game.dead ? Math.max(0, Math.ceil((game.respawnAt - now) / 1000)) : 0,
        });
      }
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      audio.stopAmbient();
      loadoutTimers.forEach(clearTimeout);
      if (mp) { for (const [, r] of remoteSprites) { scene.remove(r.mesh); r.mat.dispose(); r.nameMat.dispose(); } mp.close(); }
      skills.dispose();
      vfx.dispose();
      shop.dispose();
      city.dispose();
      renderer.dispose();
      groundTex.dispose(); shadowTex.dispose(); playerTex.dispose(); playerMat.dispose(); shadowMat.dispose();
      moon.geometry.dispose(); moon.material.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      apiRef.current = null;
    };
  }, [character]);

  // Aplica el billboard equipado (y lo reenvía a la sala) cuando cambia.
  useEffect(() => {
    apiRef.current?.setMyBillboard(billboardUrl || "");
  }, [billboardUrl, character]);

  // Aplica el efecto de dash comprado en la tienda.
  useEffect(() => {
    apiRef.current?.setDashStyle(dashStyle || null);
  }, [dashStyle, character]);

  return <div ref={mountRef} className="absolute inset-0" />;
});

export default GameCanvas;
export { BILLBOARD_COUNT };