// @ts-nocheck
// Cinematic ultimates 9–12
import * as THREE from "three";
import { CinematicUltimateManager, CINEMATIC_ULT_IDS } from "./cinematics";

const EXTRA = ["pulse-dash", "rust-reaper", "echo-wraith", "custom"];
for (const id of EXTRA) {
  if (!CINEMATIC_ULT_IDS.includes(id)) CINEMATIC_ULT_IDS.push(id);
}

const proto = CinematicUltimateManager.prototype;
const _tryStart = proto.tryStart;

proto.tryStart = function (characterId, origin, dir) {
  const id = characterId;
  const map = {
    "pulse-dash": proto.seqVelocityBreaker,
    "rust-reaper": proto.seqDecayOverlord,
    "echo-wraith": proto.seqPhantomCataclysm,
    custom: proto.seqLimitlessAscension,
  };
  for (const [key, seq] of Object.entries(map)) {
    if (id === key || id?.startsWith?.(key + "-")) {
      this.savedCam = {
        pos: this.camera.position.clone(),
        look: this.game.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      };
      this.active = {
        id,
        t: 0,
        origin: origin.clone(),
        dir: dir.clone().setY(0).normalize(),
        phase: 0,
        done: false,
        beats: [],
      };
      this.game.stunUntil = performance.now() + 8000;
      this.game.velocity.set(0, 0, 0);
      this.game.dashTime = 0;
      this.audio?.playUltimate?.();
      seq.call(this);
      return true;
    }
  }
  return _tryStart.call(this, characterId, origin, dir);
};

// ─── 9. Velocity Breaker (Pulse Dasher) ───────────────────────────────────
proto.seqVelocityBreaker = function () {
  const g = this.game;
  const pink = new THREE.Color(this.character.colors.primary || "#ec407a");
  const teal = new THREE.Color(this.character.colors.secondary || "#26a69a");
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 260;
  const vehicle = { mesh: null, mat: null };

  this.active.beats.push({
    at: 0,
    run: () => {
      this.vfx.addGlow(g.player.position.clone().setY(1.6), pink, 3, 0.5);
      this.vfx.addShockwave(origin.clone().setY(0.15), teal, false);
      const mat = new THREE.MeshBasicMaterial({
        color: pink,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2.4), mat);
      mesh.position.copy(origin).addScaledVector(dir, -2).setY(1);
      this.scene.add(mesh);
      vehicle.mesh = mesh;
      vehicle.mat = mat;
    },
  });

  for (let i = 0; i < 5; i++) {
    this.active.beats.push({
      at: 0.4 + i * 0.28,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2 + i * 2.5);
        if (vehicle.mesh) vehicle.mesh.position.lerp(p.clone().setY(1), 0.9);
        this.vfx.addDashTrail(p, pink);
        this.vfx.addImpact(p.clone().setY(1.3), teal, 1.0);
        this.skills.applyRadialDamage(p, 3, dmg * 0.12, 3, null);
        this.hitStop(25);
      },
    });
  }

  this.active.beats.push({
    at: 2.1,
    run: () => {
      const p = origin.clone().addScaledVector(dir, 14).setY(1.2);
      if (vehicle.mesh) vehicle.mesh.position.copy(p);
      this.vfx.addUltimateBurst(p, pink);
      this.skills.applyRadialDamage(p, 7, dmg * 0.45, 6, null);
      this.hitStop(120);
      this.vfx.addShake(1.0);
      if (vehicle.mesh) {
        this.scene.remove(vehicle.mesh);
        vehicle.mat.dispose();
        vehicle.mesh = null;
      }
    },
  });

  this.active.duration = 2.9;
  this.active._vehicle = vehicle;
  this.active.camFn = (t, cam, player) => {
    if (t < 0.35) {
      cam.position.lerpVectors(
        this.savedCam.pos,
        player.position.clone().add(new THREE.Vector3(0, 6, 12)),
        t / 0.35
      );
      cam.lookAt(player.position);
    } else if (t < 2.0) {
      const focus = origin.clone().addScaledVector(dir, (t - 0.35) * 8);
      cam.position.lerp(focus.clone().add(new THREE.Vector3(-dir.z * 5, 4, dir.x * 5)), 0.2);
      cam.lookAt(focus.x, 1.5, focus.z);
    } else {
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 2.0) / 0.9));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
};

// ─── 10. Decay Overlord (Rust Reaper) ─────────────────────────────────────
proto.seqDecayOverlord = function () {
  const g = this.game;
  const rust = new THREE.Color(this.character.colors.primary || "#a93226");
  const dark = new THREE.Color(this.character.colors.secondary || "#5d4037");
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 330;

  this.active.beats.push({
    at: 0,
    run: () => {
      this.vfx.addGlow(g.player.position.clone().setY(2.5), rust, 4, 0.6);
      this.vfx.addShockwave(origin.clone().setY(0.15), dark, true);
      this.vfx.addShake(0.25);
    },
  });

  for (let i = 0; i < 4; i++) {
    this.active.beats.push({
      at: 0.45 + i * 0.35,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2 + i * 1.8).setY(1.4);
        this.vfx.addImpact(p, rust, 1.2);
        this.vfx.addDebris(p, dark);
        this.skills.applyRadialDamage(p, 3.5, dmg * 0.12, 3.5, null);
        this.hitStop(40);
      },
    });
  }

  this.active.beats.push({
    at: 2.2,
    run: () => {
      const p = origin.clone().addScaledVector(dir, 3).setY(1);
      this.vfx.addUltimateBurst(p, rust);
      this.vfx.addDebris(p.clone().setY(1.5), dark);
      this.skills.applyRadialDamage(p, 9, dmg * 0.5, 7, null);
      this.hitStop(130);
      this.vfx.addShake(1.1);
    },
  });

  this.active.duration = 3.0;
  this.active.camFn = (t, cam, player) => {
    if (t < 0.5) {
      const low = player.position.clone().add(new THREE.Vector3(dir.x * 5, 1, dir.z * 5));
      cam.position.lerpVectors(this.savedCam.pos, low, t / 0.5);
      cam.lookAt(player.position.x, player.position.y + 3.5, player.position.z);
    } else if (t < 2.1) {
      const ang = ((t - 0.5) / 1.6) * Math.PI * 0.9;
      cam.position.set(
        player.position.x + Math.cos(ang) * 10,
        player.position.y + 5,
        player.position.z + Math.sin(ang) * 10
      );
      cam.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
    } else {
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 2.1) / 0.9));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
};

// ─── 11. Phantom Cataclysm (Echo Wraith) ──────────────────────────────────
proto.seqPhantomCataclysm = function () {
  const g = this.game;
  const violet = new THREE.Color(this.character.colors.primary || "#8e44ad");
  const pale = new THREE.Color(this.character.colors.secondary || "#ecf0f1");
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 290;
  const phantom = { mesh: null, mat: null };

  this.active.beats.push({
    at: 0,
    run: () => {
      g.player.visible = false;
      this.vfx.addGlow(origin.clone().setY(2), violet, 3, 0.5);
      const mat = new THREE.MeshBasicMaterial({
        color: violet,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), mat);
      mesh.position.copy(origin).addScaledVector(dir, -1.5).setY(3);
      this.scene.add(mesh);
      phantom.mesh = mesh;
      phantom.mat = mat;
    },
  });

  for (let i = 0; i < 5; i++) {
    this.active.beats.push({
      at: 0.5 + i * 0.3,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 1.5 + i * 1.5).setY(1.5);
        this.vfx.addHitSpark(p, violet);
        this.vfx.addImpact(p, pale, 0.9);
        this.skills.applyRadialDamage(p, 3, dmg * 0.1, 2.5, null);
        this.hitStop(30);
      },
    });
  }

  this.active.beats.push({
    at: 2.3,
    run: () => {
      g.player.visible = true;
      const p = origin.clone().addScaledVector(dir, 3).setY(1.2);
      this.vfx.addUltimateBurst(p, violet);
      this.skills.applyRadialDamage(p, 8, dmg * 0.5, 5, null);
      this.hitStop(120);
      this.vfx.addShake(0.95);
      if (phantom.mesh) {
        this.scene.remove(phantom.mesh);
        phantom.mat.dispose();
        phantom.mesh = null;
      }
    },
  });

  this.active.duration = 3.1;
  this.active._phantom = phantom;
  this.active.camFn = (t, cam, player) => {
    if (t < 0.5) {
      cam.position.lerpVectors(
        this.savedCam.pos,
        origin.clone().add(new THREE.Vector3(0, 8, 6)),
        t / 0.5
      );
      cam.lookAt(origin.x, 2, origin.z);
    } else if (t < 2.2) {
      const ang = ((t - 0.5) / 1.7) * Math.PI * 1.3;
      cam.position.set(origin.x + Math.cos(ang) * 9, 5, origin.z + Math.sin(ang) * 9);
      cam.lookAt(origin.x, 2, origin.z);
    } else {
      if (player.visible === false) player.visible = true;
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 2.2) / 0.9));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
  this.active.onUpdate = (dt) => {
    if (phantom.mesh) {
      phantom.mesh.scale.multiplyScalar(1 + dt * 0.15);
      phantom.mat.opacity = Math.max(0.15, phantom.mat.opacity - dt * 0.05);
    }
  };
};

// ─── 12. Limitless Ascension (Custom Moveset) ─────────────────────────────
proto.seqLimitlessAscension = function () {
  const g = this.game;
  const colors = [
    new THREE.Color("#00e5ff"),
    new THREE.Color("#d500f9"),
    new THREE.Color("#ffea00"),
    new THREE.Color("#00e676"),
    new THREE.Color("#ff1744"),
  ];
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 300;

  this.active.beats.push({
    at: 0,
    run: () => {
      colors.forEach((c, i) => {
        this.vfx.addGlow(
          g.player.position.clone().setY(1.5 + i * 0.3),
          c,
          1.5,
          0.4
        );
      });
      this.vfx.addShake(0.2);
    },
  });

  for (let i = 0; i < 5; i++) {
    this.active.beats.push({
      at: 0.4 + i * 0.3,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2 + i * 1.5).setY(1.4);
        this.vfx.addImpact(p, colors[i % colors.length], 1.1);
        this.skills.applyRadialDamage(p, 3, dmg * 0.1, 2.5, null);
        this.hitStop(30);
      },
    });
  }

  this.active.beats.push({
    at: 2.2,
    run: () => {
      const p = origin.clone().addScaledVector(dir, 3).setY(1.2);
      colors.forEach((c) => this.vfx.addUltimateBurst(p.clone(), c));
      this.skills.applyRadialDamage(p, 9, dmg * 0.5, 6, null);
      this.hitStop(130);
      this.vfx.addShake(1.1);
    },
  });

  this.active.duration = 3.0;
  this.active.camFn = (t, cam, player) => {
    if (t < 2.0) {
      const ang = t * Math.PI * 1.8;
      cam.position.set(
        player.position.x + Math.cos(ang) * 8,
        player.position.y + 5 + Math.sin(t * 4) * 0.5,
        player.position.z + Math.sin(ang) * 8
      );
      cam.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
    } else {
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 2.0) / 1.0));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
};
