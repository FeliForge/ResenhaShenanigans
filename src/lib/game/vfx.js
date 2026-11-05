// @ts-nocheck
import * as THREE from "three";

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.7)");
  g.addColorStop(0.55, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class VfxManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.items = [];
    this.shake = 0;
    this.dashStyle = null;
    this.dashTex = null;
    this.dashCache = new Map();
    this.glowTex = makeGlowTexture();
    this.geo = {
      spark: new THREE.OctahedronGeometry(0.2, 0),
      shard: new THREE.TetrahedronGeometry(0.26, 0),
      dust: new THREE.PlaneGeometry(0.55, 0.55),
      ring: new THREE.RingGeometry(0.4, 0.75, 48),
      ringInner: new THREE.RingGeometry(0.15, 0.36, 32),
      debris: new THREE.BoxGeometry(0.28, 0.28, 0.28),
    };
  }

  addShake(v) { this.shake = Math.min(1.4, this.shake + v); }

  addGlow(position, color, size = 2.4, life = 0.3, stretch = 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: this.glowTex, color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(this.geo.dust, mat);
    m.position.copy(position);
    m.scale.set(size * 2 * stretch, size * 2, 1);
    m.quaternion.copy(this.camera.quaternion);
    this.scene.add(m);
    this.items.push({ mesh: m, mat, shared: true, life, age: 0, kind: "glow", size, stretch });
  }

  addHitSpark(position, color) {
    const white = new THREE.Color(0xffffff);
    const base = new THREE.Color(color);
    for (let i = 0; i < 10; i++) {
      const col = i % 3 === 0 ? white : base;
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
      const m = new THREE.Mesh(i % 4 === 0 ? this.geo.shard : this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const sp = 5 + Math.random() * 8;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 4, Math.sin(a) * sp),
        life: 0.35 + Math.random() * 0.15, age: 0, kind: "spark",
      });
    }
    this.addGlow(position, color, 1.3, 0.22);
  }

  addImpact(position, color, strength = 1) {
    this.addHitSpark(position, color);
    this.addShockwave(position, color, strength > 1.15);
    this.addShake(0.1 * strength);
  }

  addDust(position) {
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xb9b3a8, transparent: true, opacity: 0.5, depthWrite: false });
      const m = new THREE.Mesh(this.geo.dust, mat);
      m.position.copy(position);
      m.position.y = 0.1;
      m.rotation.x = -Math.PI / 2;
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 2, 0.4, Math.sin(a) * 2),
        life: 0.5, age: 0, kind: "dust",
      });
    }
  }

  addShockwave(position, color, big = false) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(this.geo.ring, mat);
    m.position.copy(position); m.position.y = 0.12;
    m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    this.items.push({
      mesh: m, mat, shared: true, life: big ? 0.55 : 0.32, age: 0, kind: "ring",
      big, inner: false, spin: 0.6,
    });
  }

  addDebris(position, color) {
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(this.geo.debris, mat);
      m.position.copy(position);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 4, 4 + Math.random() * 3, Math.sin(a) * 4),
        life: 0.7, age: 0, kind: "debris",
      });
    }
  }

  dashTexture(style) {
    const key = `${style.a}|${style.b}|${style.emoji}`;
    if (this.dashCache.has(key)) return this.dashCache.get(key);
    const c = document.createElement("canvas");
    c.width = 96; c.height = 96;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 96, 96);
    g.addColorStop(0, style.a);
    g.addColorStop(1, style.b);
    x.fillStyle = g;
    x.beginPath();
    x.arc(48, 48, 40, 0, Math.PI * 2);
    x.fill();
    x.font = "50px serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(style.emoji, 48, 52);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.dashCache.set(key, t);
    return t;
  }

  setDashStyle(style) {
    this.dashStyle = style || null;
    this.dashTex = style ? this.dashTexture(style) : null;
  }

  addDashTrail(position, color) {
    const tex = this.dashTex;
    const mat = new THREE.MeshBasicMaterial(
      tex
        ? { map: tex, transparent: true, opacity: 0.85, depthWrite: false }
        : { color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }
    );
    const m = new THREE.Mesh(this.geo.dust, mat);
    m.position.copy(position); m.position.y = 1.6;
    m.scale.set(1.6, 2.8, 1);
    m.lookAt(this.camera.position.x, m.position.y, this.camera.position.z);
    this.scene.add(m);
    this.items.push({ mesh: m, mat, shared: true, life: 0.28, age: 0, kind: "trail", op: tex ? 0.85 : 0.55 });
  }

  addEmoteBurst(position, color) {
    this.addShockwave(position, color, false);
    this.addGlow(position.clone().setY(position.y + 1.6), color, 1.6, 0.28);
  }

  addUltimateBurst(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.2), color, 5.0, 0.45);
    this.addGlow(position.clone().setY(position.y + 0.4), new THREE.Color(0xffffff), 2.2, 0.2);
    this.addShockwave(position, color, true);
    const fmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), fmat);
    flash.position.copy(position);
    this.scene.add(flash);
    this.items.push({ mesh: flash, mat: fmat, shared: false, life: 0.22, age: 0, kind: "flash" });
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffffff : color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
      const m = new THREE.Mesh(this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const sp = 8 + Math.random() * 10;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 4 + Math.random() * 6, Math.sin(a) * sp),
        life: 0.55, age: 0, kind: "spark",
      });
    }
    this.addShake(0.75);
  }

  addDefeatBurst(position, color, style = {}) {
    const tint = style.tint ? new THREE.Color(style.tint) : color;
    this.addGlow(position.clone().setY(position.y + 1.5), tint, 4, 0.5);
    this.addShockwave(position.clone().setY(0.2), tint, true);
    this.addShake(style.shake ?? 0.4);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(this.geo.spark, mat);
      mesh.position.copy(position).setY(position.y + 1.1);
      const a = (i / 8) * Math.PI * 2;
      this.scene.add(mesh);
      this.items.push({
        mesh, mat, shared: true, kind: "spark",
        vel: new THREE.Vector3(Math.cos(a) * 8, 5, Math.sin(a) * 8),
        life: 0.6, age: 0,
      });
    }
  }

  addRespawnRing(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.4), color, 2.5, 0.4);
    this.addShockwave(position, color, false);
  }

  update(dt) {
    while (this.items.length > 64) {
      const it = this.items.shift();
      this.scene.remove(it.mesh);
      it.mat.dispose();
      if (!it.shared) it.mesh.geometry?.dispose?.();
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      if (it.age < 0) continue;
      const t = it.age / it.life;
      if (t >= 1) {
        this.scene.remove(it.mesh);
        it.mat.dispose();
        if (!it.shared) it.mesh.geometry.dispose();
        this.items.splice(i, 1);
        continue;
      }
      if (it.vel) {
        it.mesh.position.x += it.vel.x * dt;
        it.mesh.position.y += it.vel.y * dt;
        it.mesh.position.z += it.vel.z * dt;
      }
      if (it.kind === "spark" || it.kind === "debris") {
        it.vel.y -= 18 * dt;
        if (it.mesh.position.y < 0.2) { it.mesh.position.y = 0.2; it.vel.y *= -0.35; }
        it.mat.opacity = 1 - t;
        it.mesh.rotation.x += dt * 8;
        if (it.kind === "spark") it.mesh.scale.setScalar(1 - t * 0.7);
      } else if (it.kind === "dust") {
        it.mat.opacity = 0.5 * (1 - t);
        it.mesh.scale.setScalar(1 + t * 2);
      } else if (it.kind === "ring") {
        const grow = it.big ? 14 : 6;
        const s = 0.6 + t * grow;
        it.mesh.scale.set(s, s, s);
        it.mat.opacity = (it.big ? 0.7 : 0.75) * (1 - t);
      } else if (it.kind === "flash") {
        const s = 1 + t * 4;
        it.mesh.scale.set(s, s, s);
        it.mat.opacity = 0.9 * (1 - t);
      } else if (it.kind === "glow") {
        it.mesh.quaternion.copy(this.camera.quaternion);
        const s = 1 + t * 0.9;
        it.mesh.scale.set(it.size * 2 * it.stretch * s, it.size * 2 * s, 1);
        it.mat.opacity = 0.95 * (1 - t) * (1 - t);
      } else if (it.kind === "trail") {
        it.mat.opacity = (it.op ?? 0.5) * (1 - t);
        const s = 1 - t * 0.4;
        it.mesh.scale.set(1.6 * s, 2.8 * s, 1);
      }
    }
  }

  applyShake() {
    if (this.shake > 0.001) {
      const o = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * o * 0.9;
      this.camera.position.y += (Math.random() - 0.5) * o * 0.7;
      this.shake *= 0.8;
    } else this.shake = 0;
  }

  dispose() {
    for (const it of this.items) {
      this.scene.remove(it.mesh);
      it.mat.dispose();
      if (!it.shared) it.mesh.geometry.dispose();
    }
    this.items = [];
    Object.values(this.geo).forEach((g) => g.dispose());
    this.glowTex.dispose();
    this.dashCache.forEach((t) => t.dispose());
    this.dashCache.clear();
  }
}
