// @ts-nocheck
// Extra cinematic ultimates 5–8
import * as THREE from "three";
import { CinematicUltimateManager, CINEMATIC_ULT_IDS } from "./cinematics";

const EXTRA = ["smoke-veil", "cinder-roar", "frost-bite", "quartz-golem"];

for (const id of EXTRA) {
  if (!CINEMATIC_ULT_IDS.includes(id)) CINEMATIC_ULT_IDS.push(id);
}

const proto = CinematicUltimateManager.prototype;
const _tryStart = proto.tryStart;

proto.tryStart = function (characterId, origin, dir) {
  const id = characterId;
  const extraMap = {
    "smoke-veil": proto.seqShadowExecution,
    "cinder-roar": proto.seqInfernalBeast,
    "frost-bite": proto.seqAbsoluteZero,
    "quartz-golem": proto.seqAncientQuartz,
  };
  for (const [key, seq] of Object.entries(extraMap)) {
    if (id === key || id?.startsWith?.(key + "-")) {
      this.savedCam = {
        pos: this.camera.position.clone(),
        look: this.game.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      };
      this.active = {
        id, t: 0, origin: origin.clone(), dir: dir.clone().setY(0).normalize(),
        phase: 0, done: false, beats: [],
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

const _finish = proto.finish;
proto.finish = function () {
  const bags = ["_spears", "_pillars", "_clones", "_crystals", "_lines"];
  for (const key of bags) {
    for (const it of this.active?.[key] || []) {
      this.scene.remove(it.mesh);
      it.mat?.dispose?.();
    }
  }
  if (this.game?.player) this.game.player.visible = true;
  _finish.call(this);
};

proto.seqShadowExecution = function () {
  const g = this.game;
  const smoke = new THREE.Color(this.character.colors.primary || "#7d6b94");
  const accent = new THREE.Color(this.character.colors.accent || "#b8a9c9");
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 270;
  const clones = [];

  this.active.beats.push({
    at: 0,
    run: () => {
      this.vfx.addDust(origin.clone());
      this.vfx.addGlow(g.player.position.clone().setY(1.6), smoke, 2.5, 0.4);
      g.player.visible = false;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + 0.3;
        const mat = new THREE.MeshBasicMaterial({ color: smoke, transparent: true, opacity: 0.55, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.8), mat);
        mesh.position.set(origin.x + Math.cos(ang) * 4, 1.6, origin.z + Math.sin(ang) * 4);
        this.scene.add(mesh);
        clones.push({ mesh, mat, ang });
      }
    },
  });

  for (let i = 0; i < 4; i++) {
    this.active.beats.push({
      at: 0.5 + i * 0.28,
      run: () => {
        const c = clones[i];
        if (!c) return;
        const p = c.mesh.position.clone();
        this.vfx.addImpact(p, accent, 1.0);
        this.skills.applyRadialDamage(p, 2.6, dmg * 0.12, 2, null);
        c.mat.opacity = 0.2;
        this.hitStop(35);
      },
    });
  }

  this.active.beats.push({
    at: 1.8,
    run: () => {
      g.player.visible = true;
      const behind = origin.clone().addScaledVector(dir, 3.5);
      g.player.position.copy(behind);
      this.vfx.addImpact(behind.clone().setY(1.4), smoke, 1.4);
      this.skills.applyRadialDamage(behind, 3.5, dmg * 0.25, 4, null);
      this.hitStop(60);
    },
  });

  this.active.beats.push({
    at: 2.3,
    run: () => {
      const p = g.player.position.clone().setY(1.2);
      this.vfx.addUltimateBurst(p, smoke);
      this.skills.applyRadialDamage(p, 7, dmg * 0.4, 5, null);
      this.hitStop(110);
      this.vfx.addShake(0.9);
      for (const c of clones) { this.scene.remove(c.mesh); c.mat.dispose(); }
      clones.length = 0;
    },
  });

  this.active.duration = 3.0;
  this.active._clones = clones;
  this.active.camFn = (t, cam, player) => {
    if (t < 0.45) {
      const k = t / 0.45;
      cam.position.lerpVectors(this.savedCam.pos, origin.clone().add(new THREE.Vector3(0, 10, 8)), k);
      cam.lookAt(origin.x, 1, origin.z);
    } else if (t < 1.7) {
      const ang = ((t - 0.45) / 1.25) * Math.PI * 1.2;
      cam.position.set(origin.x + Math.cos(ang) * 9, 5, origin.z + Math.sin(ang) * 9);
      cam.lookAt(origin.x, 1.5, origin.z);
    } else {
      cam.position.lerp(player.position.clone().add(new THREE.Vector3(0, 5, 10)), 0.15);
      if (t > 2.5) cam.position.lerp(this.savedCam.pos, (t - 2.5) / 0.5);
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
};

proto.seqInfernalBeast = function () {
  const g = this.game;
  const fire = new THREE.Color(this.character.colors.primary || "#e74c3c");
  const ember = new THREE.Color(this.character.colors.accent || "#ff7b00");
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 340;

  this.active.beats.push({
    at: 0,
    run: () => {
      this.vfx.addGlow(g.player.position.clone().setY(2), fire, 4, 0.6);
      this.vfx.addShockwave(origin.clone().setY(0.15), ember, true);
      this.vfx.addShake(0.3);
    },
  });

  for (let i = 0; i < 3; i++) {
    this.active.beats.push({
      at: 0.5 + i * 0.4,
      run: () => {
        const p = origin.clone().addScaledVector(dir, 2 + i * 2).setY(1.5);
        this.vfx.addImpact(p, fire, 1.3);
        this.vfx.addDebris(p, ember);
        this.skills.applyRadialDamage(p, 4 + i, dmg * 0.12, 3 + i, null);
        this.hitStop(40);
      },
    });
  }

  this.active.beats.push({
    at: 2.0,
    run: () => {
      const p = origin.clone().addScaledVector(dir, 3).setY(1);
      this.vfx.addUltimateBurst(p, fire);
      this.vfx.addShockwave(p.clone().setY(0.15), ember, true);
      this.skills.applyRadialDamage(p, 9, dmg * 0.5, 7, null);
      this.hitStop(130);
      this.vfx.addShake(1.15);
    },
  });

  this.active.duration = 2.9;
  this.active.camFn = (t, cam, player) => {
    if (t < 0.5) {
      const k = t / 0.5;
      const low = player.position.clone().add(new THREE.Vector3(dir.x * 6, 0.8, dir.z * 6));
      cam.position.lerpVectors(this.savedCam.pos, low, k);
      cam.lookAt(player.position.x, player.position.y + 3, player.position.z);
    } else if (t < 1.9) {
      const ang = ((t - 0.5) / 1.4) * Math.PI * 0.8;
      cam.position.set(player.position.x + Math.cos(ang) * 10, player.position.y + 4, player.position.z + Math.sin(ang) * 10);
      cam.lookAt(player.position.x, player.position.y + 2, player.position.z);
    } else {
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 1.9) / 1.0));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
};

proto.seqAbsoluteZero = function () {
  const g = this.game;
  const ice = new THREE.Color(this.character.colors.primary || "#aee6ff");
  const blue = new THREE.Color(this.character.colors.secondary || "#2980b9");
  const origin = this.active.origin;
  const dmg = this.character.moves?.ultimate?.damage || 310;
  const crystals = [];

  this.active.beats.push({
    at: 0,
    run: () => {
      this.vfx.addGlow(g.player.position.clone().setY(2), ice, 3, 0.5);
      this.vfx.addShockwave(origin.clone().setY(0.15), ice, true);
      const mat = new THREE.MeshBasicMaterial({ color: ice, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(3.5, 8, 6), mat);
      mesh.position.copy(origin).setY(0);
      mesh.scale.y = 0.1;
      this.scene.add(mesh);
      crystals.push({ mesh, mat, grow: true });
    },
  });

  for (let i = 0; i < 8; i++) {
    this.active.beats.push({
      at: 0.6 + i * 0.18,
      run: () => {
        const ang = Math.random() * Math.PI * 2;
        const p = origin.clone().add(new THREE.Vector3(Math.cos(ang) * (3 + Math.random() * 5), 0, Math.sin(ang) * (3 + Math.random() * 5)));
        this.vfx.addHitSpark(p.clone().setY(1.5), ice);
        this.vfx.addImpact(p.clone().setY(1.2), blue, 0.8);
        this.skills.applyRadialDamage(p, 2.5, dmg * 0.08, 2, null);
        this.hitStop(20);
      },
    });
  }

  this.active.beats.push({
    at: 2.4,
    run: () => {
      const p = origin.clone().setY(0.3);
      this.vfx.addUltimateBurst(p, ice);
      this.vfx.addDebris(p.clone().setY(2), ice);
      this.skills.applyRadialDamage(p, 10, dmg * 0.45, 6, null);
      this.hitStop(120);
      this.vfx.addShake(1.0);
      for (const c of crystals) { this.scene.remove(c.mesh); c.mat.dispose(); }
      crystals.length = 0;
    },
  });

  this.active.duration = 3.2;
  this.active._crystals = crystals;
  this.active.camFn = (t, cam, player) => {
    if (t < 0.55) {
      cam.position.lerpVectors(this.savedCam.pos, player.position.clone().add(new THREE.Vector3(0, 12, 6)), t / 0.55);
      cam.lookAt(player.position.x, 2, player.position.z);
    } else if (t < 2.3) {
      const ang = ((t - 0.55) / 1.75) * Math.PI * 1.4;
      cam.position.set(player.position.x + Math.cos(ang) * 11, 6, player.position.z + Math.sin(ang) * 11);
      cam.lookAt(player.position.x, 1.5, player.position.z);
    } else {
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 2.3) / 0.9));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
  this.active.onUpdate = (dt) => {
    for (const c of crystals) {
      if (c.grow) {
        c.mesh.scale.y = Math.min(1, c.mesh.scale.y + dt * 1.5);
        c.mesh.position.y = (c.mesh.scale.y * 8) / 2;
      }
    }
  };
};

proto.seqAncientQuartz = function () {
  const g = this.game;
  const quartz = new THREE.Color(this.character.colors.primary || "#d2b48c");
  const lime = new THREE.Color(this.character.colors.accent || "#c0ca33");
  const origin = this.active.origin;
  const dir = this.active.dir;
  const dmg = this.character.moves?.ultimate?.damage || 370;
  const lines = [];

  this.active.beats.push({
    at: 0,
    run: () => {
      this.vfx.addGlow(g.player.position.clone().setY(2), lime, 3.5, 0.7);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const mat = new THREE.MeshBasicMaterial({
          color: lime, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4), mat);
        mesh.position.set(origin.x + Math.cos(ang) * 2, 2, origin.z + Math.sin(ang) * 2);
        mesh.lookAt(origin.x, 2, origin.z);
        this.scene.add(mesh);
        lines.push({ mesh, mat, ang });
      }
    },
  });

  for (let i = 0; i < 3; i++) {
    this.active.beats.push({
      at: 0.5 + i * 0.35,
      run: () => {
        this.vfx.addShockwave(origin.clone().setY(0.15), lime, false);
        this.vfx.addGlow(g.player.position.clone().setY(1.8), quartz, 2 + i, 0.3);
        this.hitStop(30);
      },
    });
  }

  this.active.beats.push({
    at: 1.7,
    run: () => {
      this.skills.spawnBeam({
        move: { damage: dmg * 0.35 },
        cfg: { range: 16, width: 2.5, hits: 3, hitDelay: 90, knock: 5 },
        origin, dir, color: lime,
      });
      this.vfx.addImpact(origin.clone().addScaledVector(dir, 6).setY(1.5), lime, 1.5);
      this.hitStop(50);
    },
  });

  this.active.beats.push({
    at: 2.5,
    run: () => {
      const p = origin.clone().addScaledVector(dir, 4).setY(1.2);
      this.vfx.addUltimateBurst(p, lime);
      this.vfx.addDebris(p, quartz);
      this.skills.applyRadialDamage(p, 8, dmg * 0.45, 7, null);
      this.hitStop(130);
      this.vfx.addShake(1.05);
      for (const l of lines) { this.scene.remove(l.mesh); l.mat.dispose(); }
      lines.length = 0;
    },
  });

  this.active.duration = 3.3;
  this.active._lines = lines;
  this.active.camFn = (t, cam, player) => {
    if (t < 1.5) {
      const ang = t * Math.PI * 1.5;
      cam.position.set(player.position.x + Math.cos(ang) * 7, player.position.y + 5, player.position.z + Math.sin(ang) * 7);
      cam.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
    } else if (t < 2.4) {
      const focus = player.position.clone().addScaledVector(dir, 8);
      cam.position.lerp(focus.clone().add(new THREE.Vector3(-dir.z * 5, 4, dir.x * 5)), 0.12);
      cam.lookAt(focus.x, 1.5, focus.z);
    } else {
      cam.position.lerp(this.savedCam.pos, Math.min(1, (t - 2.4) / 0.9));
      cam.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    }
  };
  this.active.onUpdate = (dt) => {
    for (const l of lines) {
      l.ang += dt * 2.2;
      l.mesh.position.x = origin.x + Math.cos(l.ang) * 2;
      l.mesh.position.z = origin.z + Math.sin(l.ang) * 2;
      l.mesh.lookAt(origin.x, 2, origin.z);
    }
  };
};
