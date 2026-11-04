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

      // Garantizar al menos un burst visual inmediato
      const accent = new THREE.Color(
        this.character?.colors?.accent || this.character?.colors?.primary || "#ffffff"
      );
      this.vfx.addGlow(safeOrigin.clone().setY(1.8), accent, 3, 0.5);
      this.vfx.addShockwave(safeOrigin.clone().setY(0.15), accent, true);
      this.vfx.addShake(0.35);

      return true;
    } catch (e) {
      console.error("[cinematic] tryStart failed", e);
      this.active = null;
      return false;
    }
  }

  hitStop(ms) {
    this.hitStopUntil = Math.max(this.hitStopUntil, performance.now() + (ms || 0));
  }

  dmg(frac) {
    return (this.character?.moves?.ultimate?.damage || 300) * frac;
  }

  safeDamage(pos, radius, amount, knock) {
    try {
      this.skills?.applyRadialDamage?.(pos, radius, amount, knock || 3, null);
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
    } catch (_) {}
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
      }
    }
    if (this.game?.player) this.game.player.visible = true;
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
    this.active = null;
    this.game.stunUntil = performance.now() + 150;
  }

  dispose() {
    if (this.active) this.finish();
  }

  // ── sequences ──────────────────────────────────────────────────────────

  seqIronOverdrive() {
    const gold = new THREE.Color("#ffd700");
    const origin = this.active.origin;
    const dir = this.active.dir;
    const g = this.game;

    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.28,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 1.8 + i * 0.4).setY(1.5);
          this.vfx.addImpact(p, gold, 1.2);
          this.safeDamage(p, 2.8, this.dmg(0.12), 2.2);
          this.hitStop(35);
        },
      });
    }
    this.active.beats.push({
      at: 1.8,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2.2).setY(1.2);
        this.vfx.addUltimateBurst(p, gold);
        this.safeDamage(p, 6.5, this.dmg(0.55), 6);
        this.hitStop(100);
        this.vfx.addShake(0.9);
      },
    });
    this.active.duration = 2.5;
    this.active.camFn = (t, cam, player) => {
      if (t < 0.5) {
        const face = player.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        cam.position.lerp(face.clone().add(side.multiplyScalar(2)).addScaledVector(dir, -2.5), 0.15);
        cam.lookAt(face);
      } else if (t < 1.8) {
        const ang = ((t - 0.5) / 1.3) * Math.PI * 0.8;
        cam.position.set(
          player.position.x + Math.sin(ang) * 6,
          player.position.y + 3.5,
          player.position.z + Math.cos(ang) * 6
        );
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqHyperNeon() {
    const neon = new THREE.Color(this.character.colors?.primary || "#00e5ff");
    const g = this.game;
    const dirs = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-0.7, 0, 0.7),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.7, 0, 0.7),
      this.active.dir.clone(),
    ];
    dirs.forEach((d, i) => {
      this.active.beats.push({
        at: 0.35 + i * 0.3,
        run: () => {
          const from = g.player.position.clone();
          const to = from.clone().addScaledVector(d.clone().normalize(), 7);
          this.vfx.addDashTrail(from, neon);
          g.player.position.lerp(to, 0.85);
          this.vfx.addImpact(g.player.position.clone().setY(1.4), neon, 1.1);
          this.safeDamage(g.player.position, 3.2, this.dmg(0.14), 3);
          this.hitStop(25);
        },
      });
    });
    this.active.beats.push({
      at: 2.0,
      run: () => {
        const p = g.player.position.clone().setY(1.2);
        this.vfx.addUltimateBurst(p, neon);
        this.safeDamage(p, 7, this.dmg(0.4), 5);
        this.hitStop(90);
        this.vfx.addShake(0.85);
      },
    });
    this.active.duration = 2.7;
    this.active.camFn = (t, cam, player) => {
      if (t < 2.0) {
        cam.position.lerp(player.position.clone().add(new THREE.Vector3(0, 5, 8)), 0.18);
        cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqConcreteCataclysm() {
    const col = new THREE.Color(this.character.colors?.primary || "#d35400");
    const stone = new THREE.Color("#8a6a3a");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 0.3 + i * 0.35,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 2).setY(0.2);
          this.vfx.addDebris(p.clone().setY(1), stone);
          this.vfx.addShockwave(p, col, true);
          this.safeDamage(p, 3.5, this.dmg(0.12), 4);
          this.hitStop(40);
        },
      });
    }
    this.active.beats.push({
      at: 1.8,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2.5).setY(0.3);
        this.vfx.addUltimateBurst(p, col);
        this.safeDamage(p, 9, this.dmg(0.5), 8);
        this.hitStop(120);
        this.vfx.addShake(1.1);
      },
    });
    this.active.duration = 2.6;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.7) {
        const ang = t * Math.PI * 0.9;
        cam.position.set(player.position.x + Math.cos(ang) * 9, 5, player.position.z + Math.sin(ang) * 9);
        cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqDivineThunder() {
    const volt = new THREE.Color(this.character.colors?.primary || "#f4d03f");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.25,
        run: () => {
          const p = origin
            .clone()
            .addScaledVector(dir, 2 + i)
            .add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
          this.vfx.addHitSpark(p.clone().setY(1.5), volt);
          this.vfx.addImpact(p.clone().setY(1.2), volt, 1);
          this.safeDamage(p, 2.8, this.dmg(0.1), 2.5);
          this.hitStop(20);
        },
      });
    }
    this.active.beats.push({
      at: 2.0,
      run: () => {
        this.safeBeam(origin, dir, volt, this.dmg(0.45));
        this.vfx.addUltimateBurst(origin.clone().addScaledVector(dir, 4).setY(1.2), volt);
        this.hitStop(100);
        this.vfx.addShake(1);
      },
    });
    this.active.duration = 2.8;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.8) {
        const ang = t * Math.PI * 1.5;
        cam.position.set(player.position.x + Math.cos(ang) * 8, 6, player.position.z + Math.sin(ang) * 8);
        cam.lookAt(player.position.x, player.position.y + 2, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqShadowExecution() {
    const smoke = new THREE.Color(this.character.colors?.primary || "#7d6b94");
    const origin = this.active.origin;
    const dir = this.active.dir;
    const g = this.game;
    this.active.beats.push({
      at: 0.1,
      run: () => {
        g.player.visible = false;
        this.vfx.addDust(origin.clone());
      },
    });
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.28,
        run: () => {
          const ang = (i / 4) * Math.PI * 2;
          const p = origin.clone().add(new THREE.Vector3(Math.cos(ang) * 4, 0, Math.sin(ang) * 4));
          this.vfx.addImpact(p.clone().setY(1.4), smoke, 1);
          this.safeDamage(p, 2.6, this.dmg(0.12), 2);
          this.hitStop(30);
        },
      });
    }
    this.active.beats.push({
      at: 1.7,
      run: () => {
        g.player.visible = true;
        g.player.position.copy(origin.clone().addScaledVector(dir, 3.5));
        this.vfx.addImpact(g.player.position.clone().setY(1.4), smoke, 1.4);
        this.safeDamage(g.player.position, 3.5, this.dmg(0.25), 4);
      },
    });
    this.active.beats.push({
      at: 2.2,
      run: () => {
        const p = g.player.position.clone().setY(1.2);
        this.vfx.addUltimateBurst(p, smoke);
        this.safeDamage(p, 7, this.dmg(0.4), 5);
        this.hitStop(100);
        this.vfx.addShake(0.9);
      },
    });
    this.active.duration = 2.8;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.6) {
        const ang = t * Math.PI * 1.2;
        cam.position.set(origin.x + Math.cos(ang) * 9, 5, origin.z + Math.sin(ang) * 9);
        cam.lookAt(origin.x, 1.5, origin.z);
      } else {
        cam.position.lerp(player.position.clone().add(new THREE.Vector3(0, 5, 10)), 0.15);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqInfernalBeast() {
    const fire = new THREE.Color(this.character.colors?.primary || "#e74c3c");
    const ember = new THREE.Color(this.character.colors?.accent || "#ff7b00");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.4,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 2).setY(1.5);
          this.vfx.addImpact(p, fire, 1.3);
          this.vfx.addDebris(p, ember);
          this.safeDamage(p, 4 + i, this.dmg(0.12), 3 + i);
          this.hitStop(35);
        },
      });
    }
    this.active.beats.push({
      at: 1.9,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 3).setY(1);
        this.vfx.addUltimateBurst(p, fire);
        this.safeDamage(p, 9, this.dmg(0.5), 7);
        this.hitStop(120);
        this.vfx.addShake(1.15);
      },
    });
    this.active.duration = 2.7;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.8) {
        const low = player.position.clone().add(new THREE.Vector3(dir.x * 6, 1.2, dir.z * 6));
        cam.position.lerp(low, 0.12);
        cam.lookAt(player.position.x, player.position.y + 3, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqAbsoluteZero() {
    const ice = new THREE.Color(this.character.colors?.primary || "#aee6ff");
    const origin = this.active.origin;
    for (let i = 0; i < 8; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.18,
        run: () => {
          const ang = Math.random() * Math.PI * 2;
          const p = origin.clone().add(new THREE.Vector3(Math.cos(ang) * (3 + Math.random() * 5), 0, Math.sin(ang) * (3 + Math.random() * 5)));
          this.vfx.addHitSpark(p.clone().setY(1.5), ice);
          this.vfx.addImpact(p.clone().setY(1.2), ice, 0.8);
          this.safeDamage(p, 2.5, this.dmg(0.08), 2);
          this.hitStop(15);
        },
      });
    }
    this.active.beats.push({
      at: 2.1,
      run: () => {
        const p = origin.clone().setY(0.3);
        this.vfx.addUltimateBurst(p, ice);
        this.safeDamage(p, 10, this.dmg(0.45), 6);
        this.hitStop(110);
        this.vfx.addShake(1);
      },
    });
    this.active.duration = 2.9;
    this.active.camFn = (t, cam, player) => {
      if (t < 2.0) {
        const ang = t * Math.PI * 1.3;
        cam.position.set(player.position.x + Math.cos(ang) * 11, 6, player.position.z + Math.sin(ang) * 11);
        cam.lookAt(player.position.x, 1.5, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqAncientQuartz() {
    const lime = new THREE.Color(this.character.colors?.accent || "#c0ca33");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 0.35 + i * 0.35,
        run: () => {
          this.vfx.addShockwave(origin.clone().setY(0.15), lime, false);
          this.vfx.addGlow(this.game.player.position.clone().setY(1.8), lime, 2 + i, 0.3);
          this.hitStop(25);
        },
      });
    }
    this.active.beats.push({
      at: 1.5,
      run: () => {
        this.safeBeam(origin, dir, lime, this.dmg(0.35));
        this.vfx.addImpact(origin.clone().addScaledVector(dir, 6).setY(1.5), lime, 1.5);
      },
    });
    this.active.beats.push({
      at: 2.2,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 4).setY(1.2);
        this.vfx.addUltimateBurst(p, lime);
        this.safeDamage(p, 8, this.dmg(0.45), 7);
        this.hitStop(120);
        this.vfx.addShake(1.05);
      },
    });
    this.active.duration = 3.0;
    this.active.camFn = (t, cam, player) => {
      if (t < 2.0) {
        const ang = t * Math.PI * 1.5;
        cam.position.set(player.position.x + Math.cos(ang) * 7, 5, player.position.z + Math.sin(ang) * 7);
        cam.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqVelocityBreaker() {
    const pink = new THREE.Color(this.character.colors?.primary || "#ec407a");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.3 + i * 0.28,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 2.5);
          this.vfx.addDashTrail(p, pink);
          this.vfx.addImpact(p.clone().setY(1.3), pink, 1);
          this.safeDamage(p, 3, this.dmg(0.12), 3);
          this.hitStop(20);
        },
      });
    }
    this.active.beats.push({
      at: 1.9,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 14).setY(1.2);
        this.vfx.addUltimateBurst(p, pink);
        this.safeDamage(p, 7, this.dmg(0.45), 6);
        this.hitStop(110);
        this.vfx.addShake(1);
      },
    });
    this.active.duration = 2.7;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.8) {
        const focus = origin.clone().addScaledVector(dir, t * 6);
        cam.position.lerp(focus.clone().add(new THREE.Vector3(-dir.z * 5, 4, dir.x * 5)), 0.2);
        cam.lookAt(focus.x, 1.5, focus.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqDecayOverlord() {
    const rust = new THREE.Color(this.character.colors?.primary || "#a93226");
    const dark = new THREE.Color(this.character.colors?.secondary || "#5d4037");
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.35 + i * 0.35,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 1.8).setY(1.4);
          this.vfx.addImpact(p, rust, 1.2);
          this.vfx.addDebris(p, dark);
          this.safeDamage(p, 3.5, this.dmg(0.12), 3.5);
          this.hitStop(35);
        },
      });
    }
    this.active.beats.push({
      at: 2.0,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 3).setY(1);
        this.vfx.addUltimateBurst(p, rust);
        this.safeDamage(p, 9, this.dmg(0.5), 7);
        this.hitStop(120);
        this.vfx.addShake(1.1);
      },
    });
    this.active.duration = 2.8;
    this.active.camFn = (t, cam, player) => {
      if (t < 1.9) {
        const ang = t * Math.PI * 0.9;
        cam.position.set(player.position.x + Math.cos(ang) * 10, 5, player.position.z + Math.sin(ang) * 10);
        cam.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqPhantomCataclysm() {
    const violet = new THREE.Color(this.character.colors?.primary || "#8e44ad");
    const origin = this.active.origin;
    const dir = this.active.dir;
    const g = this.game;
    this.active.beats.push({
      at: 0.1,
      run: () => {
        g.player.visible = false;
        this.vfx.addGlow(origin.clone().setY(2), violet, 3, 0.5);
      },
    });
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.4 + i * 0.3,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 1.5 + i * 1.5).setY(1.5);
          this.vfx.addHitSpark(p, violet);
          this.vfx.addImpact(p, violet, 0.9);
          this.safeDamage(p, 3, this.dmg(0.1), 2.5);
          this.hitStop(25);
        },
      });
    }
    this.active.beats.push({
      at: 2.1,
      run: () => {
        g.player.visible = true;
        const p = origin.clone().addScaledVector(dir, 3).setY(1.2);
        this.vfx.addUltimateBurst(p, violet);
        this.safeDamage(p, 8, this.dmg(0.5), 5);
        this.hitStop(110);
        this.vfx.addShake(0.95);
      },
    });
    this.active.duration = 2.9;
    this.active.camFn = (t, cam, player) => {
      if (t < 2.0) {
        const ang = t * Math.PI * 1.3;
        cam.position.set(origin.x + Math.cos(ang) * 9, 5, origin.z + Math.sin(ang) * 9);
        cam.lookAt(origin.x, 2, origin.z);
      } else {
        g.player.visible = true;
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  seqLimitlessAscension() {
    const colors = [
      new THREE.Color("#00e5ff"),
      new THREE.Color("#d500f9"),
      new THREE.Color("#ffea00"),
      new THREE.Color("#00e676"),
      new THREE.Color("#ff1744"),
    ];
    const origin = this.active.origin;
    const dir = this.active.dir;
    for (let i = 0; i < 5; i++) {
      this.active.beats.push({
        at: 0.3 + i * 0.3,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2 + i * 1.5).setY(1.4);
          this.vfx.addImpact(p, colors[i % colors.length], 1.1);
          this.safeDamage(p, 3, this.dmg(0.1), 2.5);
          this.hitStop(25);
        },
      });
    }
    this.active.beats.push({
      at: 2.0,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 3).setY(1.2);
        colors.forEach((c) => this.vfx.addUltimateBurst(p.clone(), c));
        this.safeDamage(p, 9, this.dmg(0.5), 6);
        this.hitStop(120);
        this.vfx.addShake(1.1);
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
      } else {
        cam.position.lerp(this.savedCam.pos, 0.12);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }
}
