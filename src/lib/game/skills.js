// @ts-nocheck
// Sistema modular de habilidades.
// Cada comportamiento tiene implementación real: colisiones, daño, duración,
// animación de aparición/desaparición y limpieza de recursos.
// Tipos: melee · projectile · wall · area · dash · trap · nova · buff · heal
import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);
const V = new THREE.Vector3();

export class SkillSystem {
  constructor({ scene, vfx, colliders = [], onHit, onHeal, onDash }) {
    this.scene = scene;
    this.vfx = vfx;
    this.staticColliders = colliders;
    this.onHit = onHit;
    this.onHeal = onHeal;
    this.onDash = onDash;

    this.targets = [];
    this.props = [];

    this.projectiles = [];
    this.zones = [];
    this.traps = [];
    this.walls = [];
    this.timers = [];
    this.buffs = [];
    this.mods = { speed: 1, damage: 1, defense: 1 };

    // Rayos instantáneos y postura de contraataque.
    this.beams = [];
    this.counter = null;

    this._blockers = [];
    this._blockersDirty = true;

    // Geometrías compartidas (nunca se disponen por entidad).
    this.geo = {
      sphere: new THREE.SphereGeometry(1, 16, 12),
      box: new THREE.BoxGeometry(1, 1, 1),
      ring: new THREE.RingGeometry(0.82, 1, 48),
      disc: new THREE.CircleGeometry(1, 36),
    };
  }

  get blockers() {
    if (this._blockersDirty) {
      this._blockers = this.walls.map((w) => w.collider);
      this._blockersDirty = false;
    }
    return this._blockers;
  }

  setTargets(targets) { this.targets = targets; }
  setProps(props) { this.props = props; }

  // ---------- ejecución ----------

  later(delayMs, fn) {
    if (delayMs <= 0) { fn(); return; }
    this.timers.push({ t: delayMs, fn });
  }

  cast(move, { config, origin, dir, color }) {
    const cfg = config || {};
    const ctx = {
      move,
      cfg,
      origin: origin.clone().setY(0),
      dir: new THREE.Vector3(dir.x, 0, dir.z).normalize(),
      color,
    };
    if (cfg.buff) this.addBuff(cfg.buff);
    if (cfg.heal) this.onHeal?.(cfg.heal);
    this.later((cfg.windup || 0) * 1000, () => this.execute(ctx));
  }

  execute({ move, cfg, origin, dir, color }) {
    switch (cfg.type) {
      case "projectile": this.fireVolley({ move, cfg, origin, dir, color }); break;
      case "wall": this.spawnWall({ move, cfg, origin, dir, color }); break;
      case "area": this.spawnZone({ move, cfg, origin, dir, color }); break;
      case "trap": this.spawnTrap({ move, cfg, origin, dir, color }); break;
      case "dash":
        this.onDash?.({
          dir, distance: cfg.distance || 8, speed: cfg.speed || 28,
          damage: move.damage, radius: cfg.radius || 2.2, phase: !!cfg.phase,
        });
        break;
      case "beam": this.spawnBeam({ move, cfg, origin, dir, color }); break;
      case "counter": this.startCounter(cfg); break;
      case "nova": this.spawnNova({ move, cfg, origin, dir, color }); break;
      case "buff": break;
      default: this.melee({ move, cfg, origin, dir, color });
    }
  }

  // ---------- daño ----------

  hurtTarget(target, dmg, from, knock) {
    const total = dmg * this.mods.damage;
    target.hurt(total, from, knock);
    this.onHit?.(target, total);
  }

  hurtProps(origin, radius, dmg) {
    for (const p of this.props) {
      if (p.dead && p.dead()) continue;
      V.copy(p.pos).sub(origin).setY(0);
      if (V.length() > radius + (p.radius || 0.8)) continue;
      p.hurt(dmg * this.mods.damage);
    }
  }

  damageRadius(origin, radius, dmg, knock, hitSet) {
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (hitSet && hitSet.has(t.id)) continue;
      V.copy(t.pos).sub(origin).setY(0);
      if (V.length() > radius + (t.radius || 1)) continue;
      if (hitSet) hitSet.add(t.id);
      this.hurtTarget(t, dmg, origin.clone(), knock);
    }
    this.hurtProps(origin, radius, dmg);
  }

  applyRadialDamage(origin, radius, dmg, knock, hitSet) {
    this.damageRadius(origin, radius, dmg, knock, hitSet);
  }

  damageCone(origin, dir, range, halfArc, dmg, knock) {
    const cos = Math.cos(halfArc);
    for (const t of this.targets) {
      if (!t.alive) continue;
      V.copy(t.pos).sub(origin).setY(0);
      const dist = V.length();
      if (dist > range + (t.radius || 1)) continue;
      if (dist > 0.01) {
        V.divideScalar(dist);
        if (V.dot(dir) < cos) continue;
      }
      this.hurtTarget(t, dmg, origin.clone(), knock);
    }
    this.hurtProps(origin, range, dmg);
  }

  // ---------- melee ----------

  melee({ move, cfg, origin, dir, color }) {
    const hits = Math.max(1, cfg.hits || 1);
    const dmg = move.damage / hits;
    const range = cfg.range || 2.2;
    const point = origin.clone().addScaledVector(dir, range * 0.65).setY(1.6);
    for (let i = 0; i < hits; i++) {
      this.later(i * (cfg.hitDelay || 90), () => {
        this.vfx.addHitSpark(point.clone(), color);
        this.vfx.addShockwave(point.clone(), color, !!cfg.big);
        this.damageCone(origin, dir, range, cfg.arc || 1.2, dmg, cfg.knock || 1.4);
      });
    }
  }

  // ---------- rayo ----------

  // Rayo instantáneo con cadena opcional entre objetivos cercanos.
  spawnBeam({ move, cfg, origin, dir, color }) {
    const range = cfg.range || 10;
    const width = cfg.width || 1.2;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo.box, mat);
    mesh.position.copy(origin).addScaledVector(dir, range / 2).setY(1.5);
    mesh.scale.set(width, width * 0.8, range);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.scene.add(mesh);
    this.beams.push({ mesh, mat, age: 0, life: 0.3 });

    const hits = Math.max(1, cfg.hits || 1);
    const per = move.damage / hits;
    for (let i = 0; i < hits; i++) {
      this.later(i * (cfg.hitDelay || 110), () => {
        this.damageRay(origin, dir, range, width, per, cfg.knock || 2.6, color, cfg.chain || 0, cfg.chainRange || 7);
      });
    }
  }

  damageRay(origin, dir, range, width, dmg, knock, color, chain = 0, chainRange = 7) {
    const hitList = [];
    for (const t of this.targets) {
      if (!t.alive) continue;
      V.copy(t.pos).sub(origin).setY(0);
      const along = V.dot(dir);
      if (along < -1.5 || along > range) continue;
      const perp = Math.sqrt(Math.max(0, V.lengthSq() - along * along));
      if (perp > width * 0.5 + (t.radius || 1)) continue;
      hitList.push({ t, along });
      this.hurtTarget(t, dmg, origin.clone(), knock);
      this.vfx.addHitSpark(t.pos.clone().setY(1.6), color);
    }
    hitList.sort((a, b) => a.along - b.along);
    if (chain > 0 && hitList.length) {
      const used = new Set(hitList.map((h) => h.t.id));
      let last = hitList[0].t;
      let left = chain;
      while (left-- > 0) {
        let best = null;
        let bestD = chainRange;
        for (const t of this.targets) {
          if (!t.alive || used.has(t.id)) continue;
          const d = t.pos.distanceTo(last.pos);
          if (d < bestD) { best = t; bestD = d; }
        }
        if (!best) break;
        used.add(best.id);
        this.later(90, () => {
          this.vfx.addHitSpark(best.pos.clone().setY(1.6), color);
          this.vfx.addShockwave(best.pos.clone().setY(0.2), color, false);
        });
        this.hurtTarget(best, dmg * 0.6, last.pos.clone(), knock * 0.8);
        last = best;
      }
    }
    this.hurtProps(origin.clone().addScaledVector(dir, range * 0.5), width, dmg);
  }

  updateBeams(dt) {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.age += dt;
      const k = Math.max(0, 1 - b.age / b.life);
      b.mat.opacity = 0.9 * k;
      b.mesh.scale.x = b.mesh.scale.x * 0.94;
      b.mesh.scale.y = b.mesh.scale.y * 0.94;
      if (b.age >= b.life) {
        this.scene.remove(b.mesh);
        b.mat.dispose();
        this.beams.splice(i, 1);
      }
    }
  }

  // ---------- contraataque ----------

  // Postura defensiva: reduce el daño entrante y devuelve parte al atacante.
  startCounter(cfg) {
    this.counter = { until: performance.now() + (cfg.window || 700), reflect: cfg.reflect ?? 0.6 };
    this.vfx.addShockwave(new THREE.Vector3(0, 0.2, 0), new THREE.Color(cfg.color || 0xffffff), false);
    this.onCounter?.();
  }

  get counterActive() {
    return !!this.counter && performance.now() < this.counter.until;
  }

  // Devuelve cuánto daño reflejar y consume la postura (una sola vez).
  consumeCounter() {
    if (!this.counterActive) return 0;
    const reflect = this.counter.reflect;
    this.counter = null;
    return reflect;
  }

  // ---------- proyectiles ----------

  fireVolley({ move, cfg, origin, dir, color }) {
    const count = cfg.count || 1;
    const spread = cfg.spread || 0;
    for (let i = 0; i < count; i++) {
      this.later(i * (cfg.volleyDelay || 0), () => {
        const d = dir.clone();
        if (count > 1) d.applyAxisAngle(UP, (i - (count - 1) / 2) * spread);
        this.spawnProjectile({ move, cfg, origin, dir: d, color });
      });
    }
  }

  spawnProjectile({ move, cfg, origin, dir, color }) {
    const radius = cfg.radius || 0.45;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo.sphere, mat);
    mesh.scale.setScalar(radius);
    mesh.position.copy(origin).setY(1.4);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh, mat, radius, color, move, cfg,
      vel: dir.clone().multiplyScalar(cfg.speed || 18),
      traveled: 0,
      range: cfg.range || 14,
      hit: new Set(),
      bounces: cfg.bounces || 0,
      chain: cfg.chain || 0,
    });
  }

  pointBlocked(pos) {
    const test = (c) => Math.abs(pos.x - c.x) < c.w / 2 && Math.abs(pos.z - c.z) < c.d / 2;
    for (const c of this.staticColliders) if (test(c)) return true;
    for (const c of this.blockers) if (test(c)) return true;
    return false;
  }

  dropProjectile(p, index) {
    this.scene.remove(p.mesh);
    p.mat.dispose();
    this.projectiles.splice(index, 1);
  }

  explodeProjectile(p, index) {
    const pos = p.mesh.position.clone();
    const r = p.cfg.explodeRadius || 2.6;
    this.vfx.addHitSpark(pos, p.color);
    this.vfx.addShockwave(pos.clone().setY(0.2), p.color, true);
    this.vfx.addDebris(pos.clone().setY(1), p.color);
    this.damageRadius(pos, r, p.move.damage * 0.7, 3.2, p.hit);
    this.dropProjectile(p, index);
  }

  chainTo(p, lastTarget) {
    if (p.chain <= 0) return;
    let best = null;
    let bestD = p.cfg.chainRange || 7;
    for (const t of this.targets) {
      if (!t.alive || p.hit.has(t.id)) continue;
      const d = t.pos.distanceTo(lastTarget.pos);
      if (d < bestD) { best = t; bestD = d; }
    }
    if (!best) return;
    p.hit.add(best.id);
    p.chain -= 1;
    this.later(90, () => {
      this.vfx.addHitSpark(best.pos.clone().setY(1.6), p.color);
      this.hurtTarget(best, p.move.damage * 0.6, best.pos.clone(), 1.5);
      this.chainTo(p, best);
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Persecución: gira la velocidad hacia el objetivo más cercano.
      if (p.cfg.homing) {
        let best = null;
        let bestD = 20;
        for (const t of this.targets) {
          if (!t.alive || p.hit.has(t.id)) continue;
          const d = p.mesh.position.distanceTo(t.pos);
          if (d < bestD) { best = t; bestD = d; }
        }
        if (best) {
          V.copy(best.pos).sub(p.mesh.position).setY(0);
          if (V.lengthSq() > 0.0001) {
            V.normalize().multiplyScalar(p.vel.length());
            p.vel.lerp(V, Math.min(1, p.cfg.homing * dt));
          }
        }
      }

      const step = V.copy(p.vel).multiplyScalar(dt);
      p.mesh.position.add(step);
      p.traveled += step.length();
      p.mesh.rotation.y += dt * 6;

      // Bumerán: vuelve hacia el lanzador y puede golpear de nuevo.
      if (p.cfg.boomerang && !p.returning && p.traveled > p.range * 0.55) {
        p.returning = true;
        p.vel.multiplyScalar(-1);
        p.traveled = 0;
        p.range = p.range * 0.7;
        p.hit.clear();
      }

      let dead = false;

      if (p.cfg.arc) {
        p.vel.y -= 24 * dt;
        if (p.mesh.position.y <= 0.35) {
          this.explodeProjectile(p, i);
          dead = true;
        }
      }

      if (!dead && this.pointBlocked(p.mesh.position)) {
        if (p.bounces > 0) {
          p.bounces -= 1;
          p.vel.multiplyScalar(-1);
          p.traveled = 0;
          p.mesh.position.add(V.copy(p.vel).multiplyScalar(dt * 2));
          this.vfx.addHitSpark(p.mesh.position.clone(), p.color);
        } else {
          this.explodeProjectile(p, i);
          dead = true;
        }
      }

      if (!dead) {
        for (const t of this.targets) {
          if (!t.alive || p.hit.has(t.id)) continue;
          if (p.mesh.position.distanceTo(t.pos) > p.radius + (t.radius || 1)) continue;
          p.hit.add(t.id);
          this.hurtTarget(t, p.move.damage, p.mesh.position.clone(), 2.2);
          this.vfx.addHitSpark(p.mesh.position.clone(), p.color);
          if (p.chain > 0) this.chainTo(p, t);
          this.hurtProps(p.mesh.position, p.radius + 0.6, p.move.damage);
          if (!p.cfg.pierce) {
            if (p.cfg.explodeRadius) this.explodeProjectile(p, i);
            else this.dropProjectile(p, i);
            dead = true;
          }
          break;
        }
      }

      if (!dead && p.traveled > p.range) this.dropProjectile(p, i);
    }
  }

  // ---------- pared ----------

  spawnWall({ move, cfg, origin, dir, color }) {
    const length = cfg.length || 4;
    const height = cfg.height || 3;
    const thick = cfg.thickness || 0.6;
    const center = origin.clone().addScaledVector(dir, cfg.distance || 3);
    const right = new THREE.Vector3(dir.z, 0, -dir.x);

    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo.box, mat);
    mesh.position.set(center.x, height / 2, center.z);
    mesh.scale.set(0.1, height, thick);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.scene.add(mesh);

    const hx = (Math.abs(right.x) * length) / 2 + (Math.abs(dir.x) * thick) / 2;
    const hz = (Math.abs(right.z) * length) / 2 + (Math.abs(dir.z) * thick) / 2;

    this.walls.push({
      mesh, mat, length, height,
      collider: { x: center.x, z: center.z, w: Math.max(hx * 2, thick), d: Math.max(hz * 2, thick) },
      life: cfg.duration || 4000,
      age: 0,
    });
    this._blockersDirty = true;
    this.vfx.addShockwave(center.clone().setY(0.2), color, false);
    if (cfg.spawnDamage) this.damageRadius(center, length * 0.8, move.damage * 0.4, 3, null);
  }

  updateWalls(dt) {
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      w.age += dt * 1000;
      const grow = Math.min(1, w.age / 200);
      w.mesh.scale.x = w.length * grow;
      const left = w.life - w.age;
      if (left < 400) {
        w.mat.opacity = Math.max(0, 0.55 * (left / 400));
        w.mesh.scale.y = w.height * Math.max(0.12, left / 400);
      }
      if (w.age >= w.life) {
        this.scene.remove(w.mesh);
        w.mat.dispose();
        this.walls.splice(i, 1);
        this._blockersDirty = true;
      }
    }
  }

  // ---------- área ----------

  spawnZone({ move, cfg, origin, dir, color }) {
    const radius = cfg.radius || 4;
    const center = origin.clone();
    if (cfg.atForward) center.addScaledVector(dir, cfg.atForward);
    center.y = 0.05;

    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(this.geo.ring, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(center);
    ring.scale.setScalar(radius);
    this.scene.add(ring);

    const fillMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false,
    });
    const fill = new THREE.Mesh(this.geo.disc, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.position.copy(center).setY(0.04);
    fill.scale.setScalar(radius * 0.97);
    this.scene.add(fill);

    this.zones.push({
      ring, ringMat, fill, fillMat, center, radius, color,
      interval: (cfg.interval || 500) / 1000,
      nextTick: 0,
      age: 0,
      life: (cfg.duration || 1500) / 1000,
      dmg: move.damage * (cfg.tickDamage ?? 0.3),
      knock: cfg.knock || 1.2,
    });
  }

  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.age += dt;
      if (z.age >= z.life) {
        this.scene.remove(z.ring);
        this.scene.remove(z.fill);
        z.ringMat.dispose();
        z.fillMat.dispose();
        this.zones.splice(i, 1);
        continue;
      }
      z.nextTick -= dt;
      if (z.nextTick <= 0) {
        z.nextTick = z.interval;
        this.damageRadius(z.center, z.radius, z.dmg, z.knock, null);
        this.vfx.addShockwave(z.center.clone().setY(0.2), z.color, false);
      }
      const fade = z.age > z.life - 0.35 ? Math.max(0, (z.life - z.age) / 0.35) : 1;
      z.ringMat.opacity = 0.75 * fade;
      z.fillMat.opacity = 0.14 * fade;
      const pulse = 1 + Math.sin(z.age * 8) * 0.02;
      z.ring.scale.setScalar(z.radius * pulse);
    }
  }

  // ---------- trampa ----------

  spawnTrap({ move, cfg, origin, dir, color }) {
    const center = origin.clone().addScaledVector(dir, cfg.distance || 3);
    center.y = 0.06;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(this.geo.ring, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(center);
    ring.scale.setScalar(cfg.radius || 2);
    this.scene.add(ring);
    this.traps.push({
      ring, mat, center, color,
      radius: cfg.radius || 2,
      life: (cfg.duration || 8000) / 1000,
      age: 0,
      uses: cfg.uses || 1,
      dmg: move.damage,
      knock: cfg.knock || 6,
      cooldown: 0,
    });
  }

  updateTraps(dt) {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.age += dt;
      tr.ring.rotation.z += dt * 1.2;
      const fade = tr.age > tr.life - 0.5 ? Math.max(0, (tr.life - tr.age) / 0.5) : 1;
      tr.mat.opacity = 0.8 * fade;
      if (tr.cooldown > 0) tr.cooldown -= dt;
      if (tr.cooldown <= 0) {
        for (const t of this.targets) {
          if (!t.alive) continue;
          V.copy(t.pos).sub(tr.center).setY(0);
          if (V.length() > tr.radius + (t.radius || 1)) continue;
          this.hurtTarget(t, tr.dmg, tr.center.clone(), tr.knock);
          this.vfx.addHitSpark(tr.center.clone().setY(1.2), tr.color);
          tr.uses -= 1;
          tr.cooldown = 0.4;
          if (tr.uses <= 0) break;
        }
      }
      if (tr.age >= tr.life || tr.uses <= 0) {
        this.scene.remove(tr.ring);
        tr.mat.dispose();
        this.traps.splice(i, 1);
      }
    }
  }

  // ---------- ultimate ----------

  spawnNova({ move, cfg, origin, dir, color }) {
    const waves = cfg.waves || 3;
    const radius = cfg.radius || 7;
    const gap = cfg.waveDelay || 200;
    for (let w = 0; w < waves; w++) {
      this.later(w * gap, () => {
        this.vfx.addUltimateBurst(origin.clone().setY(1.6), color);
        if (cfg.pull) {
          for (const t of this.targets) {
            if (!t.alive) continue;
            V.copy(origin).sub(t.pos).setY(0);
            if (V.length() > radius) continue;
            if (V.lengthSq() < 0.0001) continue;
            V.normalize();
            if (typeof t.pos.addScaledVector === "function") t.pos.addScaledVector(V, cfg.pull * 0.3);
          }
          this.vfx.addShockwave(origin.clone().setY(0.2), color, true);
        }
        this.damageRadius(origin, radius, move.damage / waves, cfg.knock || 3, null);
      });
    }
  }

  // ---------- buffs ----------

  addBuff(buff) {
    this.buffs.push({
      stat: buff.stat || "damage",
      mult: buff.mult ?? 1.2,
      remaining: (buff.duration || 3000) / 1000,
    });
    this.recalcMods();
  }

  recalcMods() {
    const mods = { speed: 1, damage: 1, defense: 1 };
    for (const b of this.buffs) {
      if (mods[b.stat] !== undefined) mods[b.stat] *= b.mult;
    }
    this.mods = mods;
  }

  // ---------- ciclo ----------

  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt * 1000;
      if (t.t <= 0) {
        this.timers.splice(i, 1);
        t.fn();
      }
    }
    this.updateProjectiles(dt);
    this.updateBeams(dt);
    this.updateZones(dt);
    this.updateTraps(dt);
    this.updateWalls(dt);

    if (this.buffs.length) {
      let changed = false;
      for (let i = this.buffs.length - 1; i >= 0; i--) {
        this.buffs[i].remaining -= dt;
        if (this.buffs[i].remaining <= 0) {
          this.buffs.splice(i, 1);
          changed = true;
        }
      }
      if (changed) this.recalcMods();
    }
  }

  dispose() {
    this.timers.length = 0;
    for (const p of this.projectiles) { this.scene.remove(p.mesh); p.mat.dispose(); }
    for (const z of this.zones) { this.scene.remove(z.ring); this.scene.remove(z.fill); z.ringMat.dispose(); z.fillMat.dispose(); }
    for (const t of this.traps) { this.scene.remove(t.ring); t.mat.dispose(); }
    for (const w of this.walls) { this.scene.remove(w.mesh); w.mat.dispose(); }
    for (const b of this.beams) { this.scene.remove(b.mesh); b.mat.dispose(); }
    this.beams.length = 0;
    this.counter = null;
    this.projectiles.length = 0;
    this.zones.length = 0;
    this.traps.length = 0;
    this.walls.length = 0;
    Object.values(this.geo).forEach((g) => g.dispose());
  }
}