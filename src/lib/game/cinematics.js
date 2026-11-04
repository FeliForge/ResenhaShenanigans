// @ts-nocheck
// Cinemáticas de Ultimate (orden fácil → difícil).
// Cada secuencia: activación → cámara → impactos → daño → retorno.
import * as THREE from "three";

const TMP = new THREE.Vector3();
const TMP2 = new THREE.Vector3();

/**
 * CinematicUltimateManager
 * Congela input, mueve cámara, dispara VFX y aplica daño en beats definidos.
 */
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

  get inputBlocked() {
    return !!this.active;
  }

  /** Devuelve true si el personaje tiene cinemática y se inicia. */
  tryStart(characterId, origin, dir) {
    const id = characterId;
    const fn =
      id === "iron-fist" || id?.startsWith?.("iron-fist")
        ? this.seqIronOverdrive
        : id === "neon-stride" || id?.startsWith?.("neon-stride")
          ? this.seqHyperNeon
          : id === "brick-maul" || id?.startsWith?.("brick-maul")
            ? this.seqConcreteCataclysm
            : id === "volt-jav" || id?.startsWith?.("volt-jav")
              ? this.seqDivineThunder
              : null;
    if (!fn) return false;

    this.savedCam = {
      pos: this.camera.position.clone(),
      look: TMP.set(0, 0, 0),
    };
    // look-at target aproximado del player
    this.savedCam.look.copy(this.game.player.position).add(new THREE.Vector3(0, 1.2, 0));

    this.active = {
      id,
      t: 0,
      origin: origin.clone(),
      dir: dir.clone().setY(0).normalize(),
      phase: 0,
      done: false,
      beats: [],
    };
    this.game.stunUntil = performance.now() + 8000; // bloqueo corto
    this.game.velocity.set(0, 0, 0);
    this.game.dashTime = 0;
    this.audio?.playUltimate?.();
    fn.call(this);
    return true;
  }

  // ─── 1. FÁCIL: Iron Overdrive ───────────────────────────────────────────
  // Zoom cara → puños dorados → ráfaga → uppercut final.
  seqIronOverdrive() {
    const g = this.game;
    const color = new THREE.Color(this.character.colors.accent || "#f1c40f");
    const gold = new THREE.Color("#ffd700");
    const origin = this.active.origin;
    const dir = this.active.dir;
    const dmg = this.character.moves?.ultimate?.damage || 320;

    // Fase 0: zoom al rostro (0–0.6s)
    this.active.beats.push({
      at: 0,
      run: () => {
        this.vfx.addGlow(g.player.position.clone().setY(2.4), gold, 2.2, 0.5);
        this.vfx.addShake(0.15);
      },
    });
    // Fase 1: aura dorada + 4 golpes (0.6–1.8s)
    for (let i = 0; i < 4; i++) {
      this.active.beats.push({
        at: 0.55 + i * 0.28,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 1.8 + i * 0.4).setY(1.5);
          this.vfx.addImpact(p, gold, 1.2);
          this.skills.applyRadialDamage(p, 2.8, dmg * 0.12, 2.2, null);
          this.hitStop(40);
        },
      });
    }
    // Fase 2: golpe final (2.0s)
    this.active.beats.push({
      at: 2.05,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2.2).setY(1.2);
        this.vfx.addUltimateBurst(p, gold);
        this.vfx.addShockwave(p.clone().setY(0.15), gold, true);
        this.skills.applyRadialDamage(p, 6.5, dmg * 0.55, 6, null);
        this.hitStop(120);
        this.vfx.addShake(0.9);
      },
    });
    this.active.duration = 2.6;
    this.active.camFn = (t, cam, player) => {
      // 0-0.5: acercamiento al rostro
      if (t < 0.55) {
        const k = t / 0.55;
        const face = player.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        cam.position.lerpVectors(
          this.savedCam.pos,
          face.clone().add(side.multiplyScalar(1.8)).add(new THREE.Vector3(0, 0.3, 0)).addScaledVector(dir, -2.2),
          k * k
        );
        cam.lookAt(face);
      } else if (t < 2.0) {
        // orbital ligero durante combos
        const k = (t - 0.55) / 1.45;
        const ang = k * Math.PI * 0.7;
        const r = 6.5;
        cam.position.set(
          player.position.x + Math.sin(ang) * r * dir.z + Math.cos(ang) * r * dir.x * 0.3,
          player.position.y + 3.5,
          player.position.z + Math.cos(ang) * r * dir.z - Math.sin(ang) * r * dir.x * 0.3
        );
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      } else {
        // pull back final
        const k = Math.min(1, (t - 2.0) / 0.6);
        cam.position.lerp(this.savedCam.pos, k);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  // ─── 2. Hyper Neon Velocity ─────────────────────────────────────────────
  // Silueta neón + embestidas multi-dirección + colisión final.
  seqHyperNeon() {
    const g = this.game;
    const neon = new THREE.Color(this.character.colors.primary || "#00e5ff");
    const accent = new THREE.Color(this.character.colors.accent || "#ffea00");
    const origin = this.active.origin;
    const dmg = this.character.moves?.ultimate?.damage || 280;
    const dirs = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-0.7, 0, 0.7),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.7, 0, 0.7),
      this.active.dir.clone(),
    ];

    this.active.beats.push({
      at: 0,
      run: () => {
        this.vfx.addGlow(g.player.position.clone().setY(1.6), neon, 3, 0.6);
        this.vfx.addShockwave(g.player.position.clone().setY(0.15), neon, false);
      },
    });

    dirs.forEach((d, i) => {
      this.active.beats.push({
        at: 0.4 + i * 0.32,
        run: () => {
          const from = g.player.position.clone();
          const to = from.clone().addScaledVector(d.normalize(), 8);
          // trail visual
          this.vfx.addDashTrail(from, neon);
          this.vfx.addDashTrail(from.clone().lerp(to, 0.5), accent);
          g.player.position.lerp(to, 0.85);
          this.vfx.addImpact(g.player.position.clone().setY(1.4), neon, 1.1);
          this.skills.applyRadialDamage(g.player.position, 3.2, dmg * 0.14, 3, null);
          this.hitStop(30);
        },
      });
    });

    this.active.beats.push({
      at: 2.2,
      run: () => {
        const p = g.player.position.clone().setY(1.2);
        this.vfx.addUltimateBurst(p, neon);
        this.skills.applyRadialDamage(p, 7, dmg * 0.4, 5, null);
        this.hitStop(100);
        this.vfx.addShake(0.85);
      },
    });

    this.active.duration = 2.8;
    this.active.camFn = (t, cam, player) => {
      if (t < 0.35) {
        const k = t / 0.35;
        cam.position.lerpVectors(
          this.savedCam.pos,
          player.position.clone().add(new THREE.Vector3(0, 8, 10)),
          k
        );
        cam.lookAt(player.position);
      } else if (t < 2.15) {
        // follow rápido detrás del player
        const behind = player.position
          .clone()
          .add(new THREE.Vector3(0, 4.5, 0))
          .addScaledVector(this.active.dir, -7);
        cam.position.lerp(behind, 0.18);
        cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
      } else {
        const k = Math.min(1, (t - 2.15) / 0.65);
        cam.position.lerp(this.savedCam.pos, k);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };
  }

  // ─── 3. Concrete Cataclysm ──────────────────────────────────────────────
  // Slam al suelo → pilares de concreto → combo pesado → explosión final.
  seqConcreteCataclysm() {
    const g = this.game;
    const col = new THREE.Color(this.character.colors.primary || "#d35400");
    const stone = new THREE.Color("#8a6a3a");
    const origin = this.active.origin;
    const dir = this.active.dir;
    const dmg = this.character.moves?.ultimate?.damage || 360;
    const pillars = [];

    this.active.beats.push({
      at: 0,
      run: () => {
        this.vfx.addDust(origin.clone());
        this.vfx.addShake(0.25);
        this.vfx.addShockwave(origin.clone().setY(0.15), stone, true);
      },
    });

    // 3 pilares emergentes
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 0.35 + i * 0.25,
        run: () => {
          const p = origin
            .clone()
            .addScaledVector(dir, 2 + i * 2.2)
            .add(new THREE.Vector3((i - 1) * 2.5, 0, (i % 2 === 0 ? 1 : -1) * 1.5));
          this.vfx.addDebris(p.clone().setY(1), stone);
          this.vfx.addShockwave(p.clone().setY(0.15), col, false);
          this.skills.applyRadialDamage(p, 3, dmg * 0.1, 4, null);
          // pilar visual simple
          const mat = new THREE.MeshBasicMaterial({
            color: stone,
            transparent: true,
            opacity: 0.85,
          });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.4), mat);
          mesh.position.copy(p).setY(0.1);
          this.scene.add(mesh);
          pillars.push({ mesh, mat, age: 0 });
          // grow
          mesh.scale.y = 0.2;
        },
      });
    }

    // golpes pesados
    for (let i = 0; i < 3; i++) {
      this.active.beats.push({
        at: 1.2 + i * 0.35,
        run: () => {
          const p = origin.clone().addScaledVector(dir, 2.5).setY(1.4);
          this.vfx.addImpact(p, col, 1.5);
          this.vfx.addDebris(p, stone);
          this.skills.applyRadialDamage(p, 4, dmg * 0.12, 5, null);
          this.hitStop(50);
        },
      });
    }

    this.active.beats.push({
      at: 2.4,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2).setY(0.3);
        this.vfx.addUltimateBurst(p, col);
        this.vfx.addDebris(p.clone().setY(1.5), stone);
        this.vfx.addDebris(p.clone().setY(1.5), col);
        this.skills.applyRadialDamage(p, 9, dmg * 0.45, 8, null);
        this.hitStop(140);
        this.vfx.addShake(1.1);
        // romper pilares
        for (const pl of pillars) {
          this.scene.remove(pl.mesh);
          pl.mat.dispose();
        }
        pillars.length = 0;
      },
    });

    this.active.duration = 3.1;
    this.active._pillars = pillars;
    this.active.camFn = (t, cam, player) => {
      if (t < 0.4) {
        // cámara baja, dramática
        const k = t / 0.4;
        const low = player.position.clone().add(new THREE.Vector3(dir.x * 5, 1.2, dir.z * 5));
        cam.position.lerpVectors(this.savedCam.pos, low, k);
        cam.lookAt(player.position.x, player.position.y + 0.5, player.position.z);
      } else if (t < 2.3) {
        const ang = ((t - 0.4) / 1.9) * Math.PI * 0.9;
        const r = 9;
        cam.position.set(
          player.position.x + Math.cos(ang) * r,
          player.position.y + 5 + Math.sin(t * 2) * 0.5,
          player.position.z + Math.sin(ang) * r
        );
        cam.lookAt(player.position.x, player.position.y + 1, player.position.z);
      } else {
        const k = Math.min(1, (t - 2.3) / 0.8);
        cam.position.lerp(this.savedCam.pos, k);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };

    // grow pillars each frame
    this.active.onUpdate = (dt) => {
      for (const pl of pillars) {
        pl.age += dt;
        const h = Math.min(4.5, pl.age * 12);
        pl.mesh.scale.y = h;
        pl.mesh.position.y = h / 2;
        pl.mat.opacity = Math.max(0.2, 0.9 - pl.age * 0.15);
      }
    };
  }

  // ─── 4. DIFÍCIL: Divine Thunder Arsenal ─────────────────────────────────
  // Arsenal de lanzas flotantes → órbita cámara → lluvia eléctrica → rayo final.
  seqDivineThunder() {
    const g = this.game;
    const volt = new THREE.Color(this.character.colors.primary || "#f4d03f");
    const blue = new THREE.Color(this.character.colors.secondary || "#2e86c1");
    const origin = this.active.origin;
    const dir = this.active.dir;
    const dmg = this.character.moves?.ultimate?.damage || 300;
    const spears = [];

    this.active.beats.push({
      at: 0,
      run: () => {
        this.vfx.addGlow(g.player.position.clone().setY(2.5), volt, 3.5, 0.7);
        // spawnear 6 lanzas flotantes
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const mat = new THREE.MeshBasicMaterial({
            color: volt,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.8, 6), mat);
          mesh.position.set(
            origin.x + Math.cos(ang) * 3.5,
            2.8 + (i % 2) * 0.6,
            origin.z + Math.sin(ang) * 3.5
          );
          mesh.lookAt(origin.x, 1.5, origin.z);
          this.scene.add(mesh);
          spears.push({ mesh, mat, ang, radius: 3.5, baseY: mesh.position.y });
        }
      },
    });

    // lluvia de proyectiles (spears dive)
    for (let i = 0; i < 6; i++) {
      this.active.beats.push({
        at: 0.9 + i * 0.22,
        run: () => {
          const sp = spears[i];
          if (!sp) return;
          const target = origin
            .clone()
            .addScaledVector(dir, 3 + (i % 3))
            .add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
          this.vfx.addHitSpark(target.clone().setY(1.5), volt);
          this.vfx.addImpact(target.clone().setY(1.2), blue, 0.9);
          this.skills.applyRadialDamage(target, 2.8, dmg * 0.1, 2.5, null);
          // hide spear
          sp.mesh.visible = false;
          this.hitStop(25);
        },
      });
    }

    // rayo final concentrado
    this.active.beats.push({
      at: 2.5,
      run: () => {
        const end = origin.clone().addScaledVector(dir, 12);
        // beam visual via skills
        this.skills.spawnBeam({
          move: { damage: dmg * 0.5 },
          cfg: { range: 14, width: 2.2, hits: 2, hitDelay: 80, knock: 5, chain: 2 },
          origin,
          dir,
          color: volt,
        });
        this.vfx.addUltimateBurst(origin.clone().addScaledVector(dir, 4).setY(1.2), volt);
        this.vfx.addShake(1.0);
        this.hitStop(130);
        for (const sp of spears) {
          this.scene.remove(sp.mesh);
          sp.mat.dispose();
        }
        spears.length = 0;
      },
    });

    this.active.duration = 3.3;
    this.active._spears = spears;
    this.active.camFn = (t, cam, player) => {
      if (t < 0.85) {
        // órbita elevada alrededor del arsenal
        const ang = t * Math.PI * 1.6;
        const r = 8;
        cam.position.set(
          player.position.x + Math.cos(ang) * r,
          player.position.y + 6,
          player.position.z + Math.sin(ang) * r
        );
        cam.lookAt(player.position.x, player.position.y + 2, player.position.z);
      } else if (t < 2.4) {
        // follow rain impacts
        const k = (t - 0.85) / 1.55;
        const focus = player.position.clone().addScaledVector(dir, 4 * k);
        cam.position.lerp(
          focus.clone().add(new THREE.Vector3(-dir.z * 6, 5, dir.x * 6)),
          0.12
        );
        cam.lookAt(focus.x, 1.5, focus.z);
      } else {
        const k = Math.min(1, (t - 2.4) / 0.9);
        cam.position.lerp(this.savedCam.pos, k);
        cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
      }
    };

    this.active.onUpdate = (dt) => {
      for (const sp of spears) {
        if (!sp.mesh.visible) continue;
        sp.ang += dt * 1.8;
        sp.mesh.position.x = origin.x + Math.cos(sp.ang) * sp.radius;
        sp.mesh.position.z = origin.z + Math.sin(sp.ang) * sp.radius;
        sp.mesh.position.y = sp.baseY + Math.sin(performance.now() * 0.008 + sp.ang) * 0.25;
        sp.mesh.lookAt(origin.x, 1.5, origin.z);
      }
    };
  }

  hitStop(ms) {
    this.hitStopUntil = Math.max(this.hitStopUntil, performance.now() + ms);
  }

  update(dt) {
    if (!this.active) return false;

    // hit-stop: no avanzar tiempo de cinemática
    if (performance.now() < this.hitStopUntil) {
      return true;
    }

    this.active.t += dt;
    const t = this.active.t;

    // ejecutar beats
    while (this.active.beats.length && this.active.beats[0].at <= t) {
      const b = this.active.beats.shift();
      try {
        b.run();
      } catch (e) {
        console.warn("cinematic beat", e);
      }
    }

    this.active.onUpdate?.(dt);
    this.active.camFn?.(t, this.camera, this.game.player);

    if (t >= this.active.duration) {
      this.finish();
      return false;
    }
    return true;
  }

  finish() {
    // cleanup spears/pillars if any leftover
    for (const sp of this.active?._spears || []) {
      this.scene.remove(sp.mesh);
      sp.mat?.dispose?.();
    }
    for (const pl of this.active?._pillars || []) {
      this.scene.remove(pl.mesh);
      pl.mat?.dispose?.();
    }
    this.active = null;
    this.game.stunUntil = performance.now() + 200;
  }

  dispose() {
    if (this.active) this.finish();
  }
}

/** IDs con cinemática implementada (fácil → difícil). */
export const CINEMATIC_ULT_IDS = ["iron-fist", "neon-stride", "brick-maul", "volt-jav"];

export function hasCinematicUlt(characterId) {
  if (!characterId) return false;
  return CINEMATIC_ULT_IDS.some((id) => characterId === id || characterId.startsWith(id + "-"));
}
