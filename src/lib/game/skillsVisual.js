// @ts-nocheck
// Mejora visual de cada tipo de ataque sin reescribir SkillSystem.
import * as THREE from "three";
import { SkillSystem } from "./skills.js";

if (!SkillSystem.__visualBoost) {
  SkillSystem.__visualBoost = true;

  const _proj = SkillSystem.prototype.spawnProjectile;
  SkillSystem.prototype.spawnProjectile = function (args) {
    _proj.call(this, args);
    const p = this.projectiles[this.projectiles.length - 1];
    if (!p?.mesh) return;
    // Forma de misil / proyectil (alargado)
    const r = p.radius || 0.45;
    p.mesh.scale.set(r * 0.7, r * 0.7, r * 2.4);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const core = new THREE.Mesh(this.geo.sphere, coreMat);
    core.scale.setScalar(0.35);
    p.mesh.add(core);
    p.coreMat = coreMat;
  };

  const _wall = SkillSystem.prototype.spawnWall;
  SkillSystem.prototype.spawnWall = function (args) {
    _wall.call(this, args);
    const w = this.walls[this.walls.length - 1];
    if (!w?.mesh) return;
    w.mat.opacity = 0.82;
    w.mat.depthWrite = true;
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const rim = new THREE.Mesh(this.geo.box, rimMat);
    rim.position.set(0, 0.52, 0);
    rim.scale.set(1.02, 0.06, 1.08);
    w.mesh.add(rim);
  };

  const _trap = SkillSystem.prototype.spawnTrap;
  SkillSystem.prototype.spawnTrap = function (args) {
    _trap.call(this, args);
    const tr = this.traps[this.traps.length - 1];
    if (!tr?.ring) return;
    const center = tr.center;
    const fillMat = new THREE.MeshBasicMaterial({
      color: tr.color, transparent: true, opacity: 0.32, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const fill = new THREE.Mesh(this.geo.disc, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.position.copy(center);
    fill.position.y = 0.04;
    fill.scale.setScalar(tr.radius || 2);
    this.scene.add(fill);
    tr.fill = fill;
    tr.fillMat = fillMat;
    const spikeMat = new THREE.MeshBasicMaterial({
      color: tr.color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    tr.spikes = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const sp = new THREE.Mesh(this.geo.box, spikeMat);
      const r = (tr.radius || 2) * 0.65;
      sp.position.set(center.x + Math.cos(ang) * r, 0.55, center.z + Math.sin(ang) * r);
      sp.scale.set(0.18, 1.1, 0.18);
      this.scene.add(sp);
      tr.spikes.push(sp);
    }
    tr.spikeMat = spikeMat;
  };

  const _beam = SkillSystem.prototype.spawnBeam;
  SkillSystem.prototype.spawnBeam = function (args) {
    _beam.call(this, args);
    const b = this.beams[this.beams.length - 1];
    if (!b?.mesh) return;
    b.mat.opacity = 0.5;
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const core = new THREE.Mesh(this.geo.box, coreMat);
    core.position.copy(b.mesh.position);
    core.rotation.copy(b.mesh.rotation);
    core.scale.set(b.mesh.scale.x * 0.3, b.mesh.scale.y * 0.3, b.mesh.scale.z);
    this.scene.add(core);
    b.core = core;
    b.coreMat = coreMat;
  };

  // Limpieza extra de meshes visuales
  const _drop = SkillSystem.prototype.dropProjectile;
  SkillSystem.prototype.dropProjectile = function (p, index) {
    p.coreMat?.dispose?.();
    return _drop.call(this, p, index);
  };

  const _ub = SkillSystem.prototype.updateBeams;
  SkillSystem.prototype.updateBeams = function (dt) {
    for (const b of this.beams) {
      if (b.core && b.coreMat) {
        const k = Math.max(0, 1 - b.age / b.life);
        b.coreMat.opacity = 0.95 * k;
        b.core.scale.x *= 0.94;
        b.core.scale.y *= 0.94;
      }
    }
    const before = this.beams.slice();
    _ub.call(this, dt);
    for (const b of before) {
      if (!this.beams.includes(b) && b.core) {
        this.scene.remove(b.core);
        b.coreMat?.dispose?.();
      }
    }
  };

  const _ut = SkillSystem.prototype.updateTraps;
  SkillSystem.prototype.updateTraps = function (dt) {
    for (const tr of this.traps) {
      if (tr.fillMat) {
        const fade = tr.age > tr.life - 0.5 ? Math.max(0, (tr.life - tr.age) / 0.5) : 1;
        tr.fillMat.opacity = 0.32 * fade;
        if (tr.spikes) {
          const pulse = 0.9 + Math.sin(tr.age * 8) * 0.15;
          for (const sp of tr.spikes) sp.scale.y = 1.1 * pulse * fade;
        }
      }
    }
    const before = this.traps.slice();
    _ut.call(this, dt);
    for (const tr of before) {
      if (!this.traps.includes(tr)) {
        if (tr.fill) { this.scene.remove(tr.fill); tr.fillMat?.dispose?.(); }
        if (tr.spikes) for (const sp of tr.spikes) this.scene.remove(sp);
        tr.spikeMat?.dispose?.();
      }
    }
  };
}

export { SkillSystem };
