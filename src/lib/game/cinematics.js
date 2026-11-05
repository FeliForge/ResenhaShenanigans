// @ts-nocheck
// Cinemáticas de Ultimate — 12 personajes. Dispatcher único (sin prototype patch).
import * as THREE from "three";

export const CINEMATIC_ULT_IDS = [
  "iron-fist", "neon-stride", "brick-maul", "volt-jav",
  "smoke-veil", "cinder-roar", "frost-bite", "quartz-golem",
  "pulse-dash", "rust-reaper", "echo-wraith", "custom",
];

export function hasCinematicUlt(characterId) {
  if (!characterId) return false;
  const id = String(characterId);
  return CINEMATIC_ULT_IDS.some((k) => id === k || id.startsWith(k + "-"));
}

function resolveSeqKey(characterId) {
  const id = String(characterId || "");
  for (const k of CINEMATIC_ULT_IDS) {
    if (id === k || id.startsWith(k + "-")) return k;
  }
  return null;
}

export class CinematicUltimateManager {
  constructor({ scene, camera, vfx, skills, game, character, audio }) {
    this.scene = scene;
    this.camera = camera;
    this.vfx = vfx;
    this.skills = skills;
    this.game = game;
    this.character = character;
    this.audio = audio;
    this.active = null;
    this.savedCam = null;
    this.hitStopUntil = 0;
  }

  get isPlaying() {
    return !!this.active;
  }

  tryStart(characterId, origin, dir) {
    try {
      const key = resolveSeqKey(characterId);
      if (!key) return false;

      const seqMap = {
        "iron-fist": this.seqIronOverdrive,
        "neon-stride": this.seqHyperNeon,
        "brick-maul": this.seqConcreteCataclysm,
        "volt-jav": this.seqDivineThunder,
        "smoke-veil": this.seqShadowExecution,
        "cinder-roar": this.seqInfernalBeast,
        "frost-bite": this.seqAbsoluteZero,
        "quartz-golem": this.seqAncientQuartz,
        "pulse-dash": this.seqVelocityBreaker,
        "rust-reaper": this.seqDecayOverlord,
        "echo-wraith": this.seqPhantomCataclysm,
        custom: this.seqLimitlessAscension,
      };
      const fn = seqMap[key];
      if (!fn) return false;

      const safeDir = (dir || new THREE.Vector3(0, 0, -1)).clone().setY(0);
      if (safeDir.lengthSq() < 0.001) safeDir.set(0, 0, -1);
      safeDir.normalize();

      const safeOrigin = (origin || this.game.player.position).clone();

      this.savedCam = { pos: this.camera.position.clone() };
      this.active = {
        id: key,
        t: 0,
        origin: safeOrigin,
        dir: safeDir,
        beats: [],
        duration: 2.5,
      };

      if (this.game.velocity?.set) this.game.velocity.set(0, 0, 0);
      this.game.dashTime = 0;
      this.game.stunUntil = performance.now() + 10000;

      try {
        this.audio?.playUltimate?.();
      } catch (_) {}

      fn.call(this);

      if (this.active?.beats?.length) {
        this.active.beats.sort((a, b) => a.at - b.at);
      }

      const accent = new THREE.Color(
        this.character?.colors?.accent || this.character?.colors?.primary || "#ffffff"
      );
      try {
        this.vfx?.addGlow?.(safeOrigin.clone().setY(1.8), accent, 3, 0.5);
        this.vfx?.addShockwave?.(safeOrigin.clone().setY(0.15), accent, true);
        this.vfx?.addShake?.(0.35);
      } catch (_) {}

      return true;
    } catch (e) {
      console.error("[cinematic] tryStart failed", e);
      this.active = null;
      return false;
    }
  }

  hitStop(ms) {
    this.hitStopUntil = Math.max(this.hitStopUntil, performance.now() + (ms || 40));
  }

  dmg(frac) {
    return (this.character?.moves?.ultimate?.damage || 300) * frac;
  }

  safeDamage(pos, radius, amount, knock) {
    const r = radius || 3;
    const dmg = amount || 10;
    const k = knock || 3;
    try {
      if (this.skills?.applyRadialDamage) {
        this.skills.applyRadialDamage(pos, r, dmg, k, null);
        return;
      }
    } catch (_) {}
    try {
      if (this.skills?.damageRadius) {
        this.skills.damageRadius(pos, r, dmg, k, null);
        return;
      }
    } catch (_) {}
    try {
      const targets = this.skills?.targets || [];
      for (const t of targets) {
        if (!t) continue;
        const alive = typeof t.alive === "function" ? t.alive() : t.alive;
        if (alive === false) continue;
        const tp = t.pos || t.position;
        if (!tp) continue;
        const dx = tp.x - pos.x;
        const dz = tp.z - pos.z;
        if (Math.hypot(dx, dz) > r + (t.radius || 1.2)) continue;
        if (typeof t.hurt === "function") t.hurt(dmg, pos.clone?.() || pos, k);
        else if (typeof t.applyDamage === "function") t.applyDamage(dmg);
      }
    } catch (_) {}
  }

  safeBeam(origin, dir, color, amount) {
    try {
      this.skills?.spawnBeam?.({
        move: { damage: amount },
        cfg: { range: 14, width: 2, hits: 2, hitDelay: 80, knock: 4 },
        origin,
        dir,
        color,
      });
    } catch (_) {
      this.safeDamage(origin.clone().addScaledVector(dir, 6), 3.5, amount, 4);
    }
  }

  cleanupBags() {
    const bags = ["_spears", "_pillars", "_clones", "_crystals", "_lines", "_vehicle", "_phantom"];
    for (const key of bags) {
      const list = this.active?.[key];
      if (!list) continue;
      const arr = Array.isArray(list) ? list : [list];
      for (const it of arr) {
        if (!it) continue;
        if (it.mesh) {
          this.scene.remove(it.mesh);
          it.mat?.dispose?.();
        }
        if (it.ring) {
          this.scene.remove(it.ring);
          it.mat?.dispose?.();
        }
      }
      this.active[key] = null;
    }
  }

  update(dt) {
    if (!this.active) return false;
    if (performance.now() < this.hitStopUntil) return true;

    this.active.t += dt;
    const t = this.active.t;

    while (this.active.beats.length && this.active.beats[0].at <= t) {
      const b = this.active.beats.shift();
      try {
        b.run();
      } catch (e) {
        console.warn("[cinematic] beat", e);
      }
    }

    try {
      this.active.onUpdate?.(dt);
    } catch (_) {}
    try {
      this.active.camFn?.(t, this.camera, this.game.player);
    } catch (_) {}

    if (t >= (this.active.duration || 2.5)) {
      this.finish();
      return false;
    }
    return true;
  }

  finish() {
    this.cleanupBags();
    try {
      if (this.savedCam?.pos && this.camera) {
        this.camera.position.copy(this.savedCam.pos);
      }
    } catch (_) {}
    this.active = null;
    this.hitStopUntil = 0;
    if (this.game) this.game.stunUntil = performance.now() + 120;
  }

  dispose() {
    if (this.active) this.finish();
  }

  // ─── 1 Iron Fist ───────────────────────────────────────────
  seqIronOverdrive() {
    const gold = new THREE.Color("#ffd700");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.35 + i * 0.28,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 1.8 + i * 0.4).setY(1.5);
          this.vfx?.addImpact?.(p, gold, 1.2);
          this.safeDamage(p, 3.2, this.dmg(0.14), 2.4);
          this.hitStop(40);
        },
      });
    }
    this.active.beats.push({
      at: 1.7,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2.2).setY(1.2);
        this.vfx?.addUltimateBurst?.(p, gold);
        this.safeDamage(p, 7, this.dmg(0.55), 6);
        this.hitStop(110);
        this.vfx?.addShake?.(1.0);
      },
    });
    this.active.duration = 2.4;
    this.active.camFn = (t, cam, player) => {
      if (t < 0.5) {
        const face = player.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        cam.position.lerp(face.clone().add(side.multiplyScalar(2)).addScaledVector(dir, -2.5), 0.18);
        cam.lookAt(face);
      } else if (t < 1.7) {
        const ang = ((t - 0.5) / 1.2) * Math.PI * 0.9;
        cam.position.set(
          player.position.x + Math.sin(ang) * 6.5,
          player.position.y + 3.8,
          player.position.z + Math.cos(ang) * 6.5
        );
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      } else if (this.savedCam) {
        cam.position.lerp(this.savedCam.pos, 0.14);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  // ─── 2 Neon Stride ─────────────────────────────────────────
  seqHyperNeon() {
    const neon = new THREE.Color(this.character.colors?.primary || "#00e5ff");
    const origin = this.active.origin;
    const dirs = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-0.7, 0, 0.7),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.7, 0, 0.7),
      this.active.dir.clone(),
    ];
    dirs.forEach((d, i) => {
      d.setY(0).normalize();
      this.active.beats.push({
        at: 0.25 + i * 0.22,
        run: () => {
          const p = origin.clone().addScaledVector(d, 4).setY(1.2);
          this.game.player.position.lerp(p, 0.85);
          this.vfx?.addDashTrail?.(p, neon);
          this.vfx?.addHitSpark?.(p, neon);
          this.safeDamage(p, 3, this.dmg(0.12), 2);
        },
      });
    });
    this.active.beats.push({
      at: 1.6,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().setY(1.4), neon);
        this.safeDamage(origin, 8, this.dmg(0.45), 5);
        this.hitStop(90);
        this.vfx?.addShake?.(0.9);
      },
    });
    this.active.duration = 2.3;
    this.active.camFn = (t, cam, player) => {
      cam.position.set(player.position.x + 5, player.position.y + 4, player.position.z + 5);
      cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
    };
  }

  // ─── 3 Brick Maul ──────────────────────────────────────────
  seqConcreteCataclysm() {
    const stone = new THREE.Color(this.character.colors?.secondary || "#8d6e63");
    const origin = this.active.origin;
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.4,
        run: () => {
          const p = origin.clone().setY(0.2);
          this.vfx?.addShockwave?.(p, stone, true);
          this.vfx?.addDebris?.(p.clone().setY(1), stone);
          this.safeDamage(origin, 5 + i * 1.5, this.dmg(0.18), 4 + i);
          this.hitStop(50);
        },
      });
    }
    this.active.beats.push({
      at: 1.9,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().setY(1), stone);
        this.safeDamage(origin, 10, this.dmg(0.5), 8);
        this.hitStop(130);
        this.vfx?.addShake?.(1.3);
      },
    });
    this.active.duration = 2.6;
    this.active.camFn = (t, cam, player) => {
      cam.position.set(player.position.x + 7, player.position.y + 6, player.position.z + 7);
      cam.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
    };
  }

  // ─── 4 Volt Jav ────────────────────────────────────────────
  seqDivineThunder() {
    const volt = new THREE.Color(this.character.colors?.accent || "#ffea00");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.3 + i * 0.25,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 2).setY(1.5);
          this.vfx?.addHitSpark?.(p, volt);
          this.vfx?.addGlow?.(p, volt, 2.5, 0.25);
          this.safeDamage(p, 3.5, this.dmg(0.12), 3);
          this.hitStop(30);
        },
      });
    }
    this.active.beats.push({
      at: 1.7,
      run: () => {
        this.safeBeam(origin, dir, volt, this.dmg(0.4));
        this.vfx?.addUltimateBurst?.(origin.clone().addScaledVector(dir, 6).setY(1.5), volt);
        this.hitStop(100);
        this.vfx?.addShake?.(1.0);
      },
    });
    this.active.duration = 2.4;
    this.active.camFn = (t, cam, player) => {
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      cam.position.copy(player.position).addScaledVector(side, 4).addScaledVector(dir, -3).setY(player.position.y + 3);
      cam.lookAt(player.position.x + dir.x * 4, player.position.y + 1.5, player.position.z + dir.z * 4);
    };
  }

  // ─── 5 Smoke Veil ──────────────────────────────────────────
  seqShadowExecution() {
    const smoke = new THREE.Color(this.character.colors?.primary || "#6a1b9a");
    const origin = this.active.origin;
    const dir = this.active.dir;
    this.active.beats.push({
      at: 0.3,
      run: () => {
        this.vfx?.addDust?.(origin);
        this.vfx?.addGlow?.(origin.clone().setY(1.5), smoke, 3, 0.4);
      },
    });
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.6 + i * 0.3,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 1.2).setY(1.4);
          this.vfx?.addHitSpark?.(p, smoke);
          this.safeDamage(p, 2.8, this.dmg(0.13), 2.5);
        },
      });
    }
    this.active.beats.push({
      at: 2.0,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().addScaledVector(dir, 3).setY(1.2), smoke);
        this.safeDamage(origin.clone().addScaledVector(dir, 3), 7, this.dmg(0.45), 5);
        this.hitStop(100);
        this.vfx?.addShake?.(0.85);
      },
    });
    this.active.duration = 2.5;
    this.active.camFn = (t, cam, player) => {
      const ang = t * Math.PI * 1.4;
      cam.position.set(
        player.position.x + Math.cos(ang) * 5,
        player.position.y + 2.5,
        player.position.z + Math.sin(ang) * 5
      );
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    };
  }

  // ─── 6 Cinder Roar ─────────────────────────────────────────
  seqInfernalBeast() {
    const fire = new THREE.Color(this.character.colors?.accent || "#ff5722");
    const origin = this.active.origin;
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.35 + i * 0.32,
        run: () => {
          const a = (i / 4) * Math.PI * 2;
          const p = origin.clone().add(new THREE.Vector3(Math.cos(a) * 3, 1.2, Math.sin(a) * 3));
          this.vfx?.addImpact?.(p, fire, 1.3);
          this.safeDamage(p, 3.5, this.dmg(0.14), 3);
          this.hitStop(35);
        },
      });
    }
    this.active.beats.push({
      at: 1.8,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().setY(1.5), fire);
        this.safeDamage(origin, 9, this.dmg(0.5), 7);
        this.hitStop(120);
        this.vfx?.addShake?.(1.2);
      },
    });
    this.active.duration = 2.5;
    this.active.camFn = (t, cam, player) => {
      cam.position.set(player.position.x + 6, player.position.y + 5, player.position.z + 6);
      cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
    };
  }

  // ─── 7 Frost Bite ──────────────────────────────────────────
  seqAbsoluteZero() {
    const ice = new THREE.Color(this.character.colors?.primary || "#4fc3f7");
    const origin = this.active.origin;
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.3 + i * 0.28,
        run: () => {
          const p = origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0.3, (Math.random() - 0.5) * 6));
          this.vfx?.addShockwave?.(p, ice, false);
          this.vfx?.addGlow?.(p.clone().setY(1), ice, 2, 0.3);
          this.safeDamage(p, 3, this.dmg(0.1), 1.5);
        },
      });
    }
    this.active.beats.push({
      at: 1.9,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().setY(1.2), ice);
        this.safeDamage(origin, 9, this.dmg(0.5), 4);
        this.hitStop(110);
        this.vfx?.addShake?.(0.95);
      },
    });
    this.active.duration = 2.6;
    this.active.camFn = (t, cam, player) => {
      cam.position.set(player.position.x - 5, player.position.y + 4, player.position.z + 6);
      cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
    };
  }

  // ─── 8 Quartz Golem ────────────────────────────────────────
  seqAncientQuartz() {
    const quartz = new THREE.Color(this.character.colors?.accent || "#e1bee7");
    const origin = this.active.origin;
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.45,
        run: () => {
          const p = origin.clone().setY(0.2);
          this.vfx?.addDebris?.(p.clone().setY(1.5), quartz);
          this.vfx?.addShockwave?.(p, quartz, true);
          this.safeDamage(origin, 6 + i, this.dmg(0.2), 5);
          this.hitStop(55);
        },
      });
    }
    this.active.beats.push({
      at: 2.0,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().setY(1.3), quartz);
        this.safeDamage(origin, 11, this.dmg(0.5), 9);
        this.hitStop(140);
        this.vfx?.addShake?.(1.4);
      },
    });
    this.active.duration = 2.7;
    this.active.camFn = (t, cam, player) => {
      cam.position.set(player.position.x + 8, player.position.y + 7, player.position.z + 3);
      cam.lookAt(player.position.x, player.position.y + 0.8, player.position.z);
    };
  }

  // ─── 9 Pulse Dash ──────────────────────────────────────────
  seqVelocityBreaker() {
    const pulse = new THREE.Color(this.character.colors?.primary || "#00e676");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 6; i++) {
      this.active.beats.push({
        at: 0.2 + i * 0.18,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 1.5 + i * 1.8).setY(1.2);
          this.game.player.position.copy(p);
          this.vfx?.addDashTrail?.(p, pulse);
          this.safeDamage(p, 2.8, this.dmg(0.1), 2.5);
        },
      });
    }
    this.active.beats.push({
      at: 1.5,
      run: () => {
        const p = this.game.player.position.clone();
        this.vfx?.addUltimateBurst?.(p.setY(1.4), pulse);
        this.safeDamage(p, 7, this.dmg(0.4), 6);
        this.hitStop(90);
        this.vfx?.addShake?.(0.9);
      },
    });
    this.active.duration = 2.2;
    this.active.camFn = (t, cam, player) => {
      cam.position.copy(player.position).add(new THREE.Vector3(0, 3, 6));
      cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
    };
  }

  // ─── 10 Rust Reaper ────────────────────────────────────────
  seqDecayOverlord() {
    const rust = new THREE.Color(this.character.colors?.secondary || "#bf360c");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.35 + i * 0.3,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 1.5).setY(1.3);
          this.vfx?.addImpact?.(p, rust, 1.1);
          this.vfx?.addDebris?.(p, rust);
          this.safeDamage(p, 3.2, this.dmg(0.13), 3);
          this.hitStop(40);
        },
      });
    }
    this.active.beats.push({
      at: 1.8,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().addScaledVector(dir, 3).setY(1.2), rust);
        this.safeDamage(origin.clone().addScaledVector(dir, 3), 8, this.dmg(0.48), 6);
        this.hitStop(110);
        this.vfx?.addShake?.(1.1);
      },
    });
    this.active.duration = 2.5;
    this.active.camFn = (t, cam, player) => {
      const ang = t * Math.PI;
      cam.position.set(
        player.position.x + Math.sin(ang) * 7,
        player.position.y + 4,
        player.position.z + Math.cos(ang) * 7
      );
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    };
  }

  // ─── 11 Echo Wraith ────────────────────────────────────────
  seqPhantomCataclysm() {
    const echo = new THREE.Color(this.character.colors?.accent || "#b39ddb");
    const origin = this.active.origin;
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.3 + i * 0.28,
        run: () => {
          const a = (i / 5) * Math.PI * 2;
          const p = origin.clone().add(new THREE.Vector3(Math.cos(a) * 4, 1.4, Math.sin(a) * 4));
          this.vfx?.addHitSpark?.(p, echo);
          this.vfx?.addGlow?.(p, echo, 2.2, 0.25);
          this.safeDamage(p, 3, this.dmg(0.11), 2);
        },
      });
    }
    this.active.beats.push({
      at: 1.9,
      run: () => {
        this.vfx?.addUltimateBurst?.(origin.clone().setY(1.5), echo);
        this.safeDamage(origin, 9, this.dmg(0.5), 5);
        this.hitStop(100);
        this.vfx?.addShake?.(1.0);
      },
    });
    this.active.duration = 2.5;
    this.active.camFn = (t, cam, player) => {
      const ang = t * Math.PI * 2;
      cam.position.set(
        player.position.x + Math.cos(ang) * 6,
        player.position.y + 3.5,
        player.position.z + Math.sin(ang) * 6
      );
      cam.lookAt(player.position.x, player.position.y + 1.3, player.position.z);
    };
  }

  // ─── 12 Custom ─────────────────────────────────────────────
  seqLimitlessAscension() {
    const colors = [
      new THREE.Color(this.character.colors?.primary || "#00e5ff"),
      new THREE.Color(this.character.colors?.secondary || "#d500f9"),
      new THREE.Color(this.character.colors?.accent || "#ffea00"),
    ];
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 6; i++) {
      this.active.beats.push({
        at: 0.25 + i * 0.25,
        run: () => {
          const col = colors[i % 3];
          const p = origin.clone().addScaledVector(dir, 1.5 + i * 0.8).setY(1.3);
          this.vfx?.addImpact?.(p, col, 1.1);
          this.safeDamage(p, 3, this.dmg(0.1), 2.5);
          this.hitStop(30);
        },
      });
    }
    this.active.beats.push({
      at: 2.0,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 3).setY(1.2);
        colors.forEach((c) => this.vfx?.addUltimateBurst?.(p.clone(), c));
        this.safeDamage(p, 9, this.dmg(0.5), 6);
        this.hitStop(120);
        this.vfx?.addShake?.(1.1);
      },
    });
    this.active.duration = 2.8;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.9) {
        const ang = t * Math.PI * 1.8;
        cam.position.set(
          player.position.x + Math.cos(ang) * 8,
          player.position.y + 5,
          player.position.z + Math.sin(ang) * 8
        );
        cam.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
      } else if (this.savedCam) {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }
}
