// @ts-nocheck
import * as THREE from "three";

// VFX potenciado: más partículas, brillos más grandes, sacudidas más fuertes.

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.35)");
  g.addColorStop(0.75, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
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
      ring: new THREE.RingGeometry(0.4, 0.75, 64),
      ringInner: new THREE.RingGeometry(0.15, 0.36, 40),
      debris: new THREE.BoxGeometry(0.28, 0.28, 0.28),
    };
  }

  addShake(v) { this.shake = Math.min(2.2, this.shake + v); }

  addGlow(position, color, size = 2.8, life = 0.36, stretch = 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: this.glowTex, color, transparent: true, opacity: 1.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(this.geo.dust, mat);
    m.position.copy(position);
    m.scale.set(size * 2.2 * stretch, size * 2.2, 1);
    m.quaternion.copy(this.camera.quaternion);
    this.scene.add(m);
    this.items.push({ mesh: m, mat, shared: true, life, age: 0, kind: "glow", size, stretch });
  }

  addHitSpark(position, color) {
    const white = new THREE.Color(0xffffff);
    const base = new THREE.Color(color);
    for (let i = 0; i < 22; i++) {
      const col = i % 3 === 0 ? white : base;
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
      const m = new THREE.Mesh(i % 4 === 0 ? this.geo.shard : this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 11;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 2.5 + Math.random() * 6, Math.sin(a) * sp),
        life: 0.5 + Math.random() * 0.25, age: 0, kind: "spark",
      });
    }
    this.addGlow(position, color, 1.7, 0.3);
    this.addGlow(position, white, 0.9, 0.18);
  }

  addImpact(position, color, strength = 1) {
    this.addHitSpark(position, color);
    this.addShockwave(position, color, strength > 1.15);
    this.addShake(0.16 * strength);
    this.addGlow(position, color, 2.0 * strength, 0.26);
  }

  addDust(position) {
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xb9b3a8, transparent: true, opacity: 0.6, depthWrite: false });
      const m = new THREE.Mesh(this.geo.dust, mat);
      m.position.copy(position);
      m.position.y = 0.1;
      m.rotation.x = -Math.PI / 2;
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 2.6, 0.5, Math.sin(a) * 2.6),
        life: 0.75, age: 0, kind: "dust",
      });
    }
  }

  addShockwave(position, color, big = false) {
    for (const inner of [false, true]) {
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: inner ? 0.95 : 0.8, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.Mesh(inner ? this.geo.ringInner : this.geo.ring, mat);
      m.position.copy(position); m.position.y = 0.12;
      m.rotation.x = -Math.PI / 2;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true, life: big ? 0.75 : 0.42, age: 0, kind: "ring",
        big, inner, spin: (Math.random() > 0.5 ? 1 : -1) * 0.85,
      });
    }
  }

  addDebris(position, color) {
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, emissive: color, emissiveIntensity: 0.25 });
      const m = new THREE.Mesh(this.geo.debris, mat);
      m.position.copy(position);
      m.castShadow = true;
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 5, 5 + Math.random() * 5, Math.sin(a) * 5),
        life: 1.0, age: 0, kind: "debris",
      });
    }
  }

  dashTexture(style) {
    const key = `${style.a}|${style.b}|${style.emoji}`;
    if (this.dashCache.has(key)) return this.dashCache.get(key);
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, style.a);
    g.addColorStop(1, style.b);
    x.save();
    x.filter = "blur(10px)";
    x.fillStyle = g;
    x.beginPath();
    x.arc(64, 64, 54, 0, Math.PI * 2);
    x.fill();
    x.restore();
    const g2 = x.createRadialGradient(64, 52, 2, 64, 64, 48);
    g2.addColorStop(0, "rgba(255,255,255,0.9)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g2;
    x.beginPath();
    x.arc(64, 64, 48, 0, Math.PI * 2);
    x.fill();
    x.font = "66px serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(style.emoji, 64, 68);
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
        ? { map: tex, transparent: true, opacity: 0.95, depthWrite: false }
        : { color, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false }
    );
    const m = new THREE.Mesh(this.geo.dust, mat);
    m.position.copy(position); m.position.y = 1.6;
    m.scale.set(2.0, 3.4, 1);
    m.lookAt(this.camera.position.x, m.position.y, this.camera.position.z);
    this.scene.add(m);
    this.items.push({ mesh: m, mat, shared: true, life: tex ? 0.4 : 0.34, age: 0, kind: "trail", op: tex ? 0.95 : 0.65 });
    this.addGlow(position.clone().setY(1.4), color, 1.4, 0.2);

    if (Math.random() < 0.7) {
      const sparkColor = tex && this.dashStyle ? this.dashStyle.b : color;
      const smat = new THREE.MeshBasicMaterial({ color: sparkColor, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
      const s = new THREE.Mesh(this.geo.spark, smat);
      s.position.copy(position);
      s.position.x += (Math.random() - 0.5) * 1.4;
      s.position.z += (Math.random() - 0.5) * 1.4;
      s.position.y = 0.6 + Math.random() * 1.8;
      s.scale.setScalar(0.85);
      this.scene.add(s);
      this.items.push({
        mesh: s, mat: smat, shared: true,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4),
        life: 0.4, age: 0, kind: "spark",
      });
    }
  }

  addEmoteBurst(position, color) {
    this.addShockwave(position, color, false);
    this.addGlow(position.clone().setY(position.y + 1.6), color, 2.0, 0.36);
  }

  addUltimateBurst(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.2), color, 7.5, 0.7);
    this.addGlow(position.clone().setY(position.y + 0.4), new THREE.Color(0xffffff), 4.0, 0.32);
    this.addShockwave(position, color, true);
    const mat2 = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const r2 = new THREE.Mesh(this.geo.ring, mat2);
    r2.position.copy(position); r2.position.y = 0.14; r2.rotation.x = -Math.PI / 2;
    this.scene.add(r2);
    this.items.push({ mesh: r2, mat: mat2, shared: true, life: 1.05, age: -0.12, kind: "ring", big: true, spin: -1.0 });
    const pmat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 4.6, 24, 24, 1, true), pmat);
    pillar.position.copy(position); pillar.position.y = 12;
    this.scene.add(pillar);
    this.items.push({ mesh: pillar, mat: pmat, shared: false, life: 0.95, age: 0, kind: "pillar" });
    const fmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(3.0, 18, 14), fmat);
    flash.position.copy(position);
    this.scene.add(flash);
    this.items.push({ mesh: flash, mat: fmat, shared: false, life: 0.32, age: 0, kind: "flash" });
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xffffff : color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
      const m = new THREE.Mesh(this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const sp = 11 + Math.random() * 14;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 6 + Math.random() * 11, Math.sin(a) * sp),
        life: 0.85, age: 0, kind: "spark",
      });
    }
    this.addShake(1.45);
  }

  addDefeatBurst(position, color, style = {}) {
    const tint = style.tint ? new THREE.Color(style.tint) : color;
    this.addGlow(position.clone().setY(position.y + 1.5), tint, 7, 0.9);
    this.addShockwave(position.clone().setY(0.2), tint, true);
    this.addShake(style.shake ?? 0.75);
    const kind = style.particle || "sparks";
    const count = kind === "debris" ? 22 : kind === "smoke" ? 12 : 18;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffffff : tint, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(kind === "debris" ? this.geo.debris : this.geo.spark, mat);
      mesh.position.copy(position).setY(position.y + 1.1);
      mesh.scale.setScalar(kind === "debris" ? 1.3 : 1.8);
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const sp = (kind === "streaks" ? 15 : kind === "smoke" ? 3 : 9) + Math.random() * 6;
      this.scene.add(mesh);
      this.items.push({
        mesh, mat, shared: true,
        kind: kind === "debris" ? "debris" : "spark",
        vel: new THREE.Vector3(Math.cos(a) * sp, kind === "smoke" ? 3 + Math.random() * 2 : 7 + Math.random() * 8, Math.sin(a) * sp),
        life: 0.9 + Math.random() * 0.5, age: 0,
      });
    }
  }

  addRespawnRing(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.4), color, 3.8, 0.65);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(this.geo.ring, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).setY(0.12);
    this.scene.add(ring);
    this.items.push({ mesh: ring, mat, shared: true, kind: "ring", life: 1.0, age: 0, inner: true });
  }

  update(dt) {
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
        it.vel.y -= 20 * dt;
        if (it.mesh.position.y < 0.2) { it.mesh.position.y = 0.2; it.vel.y *= -0.4; it.vel.x *= 0.7; it.vel.z *= 0.7; }
        it.mat.opacity = 1 - t;
        it.mesh.rotation.x += dt * 10; it.mesh.rotation.y += dt * 8;
        if (it.kind === "spark") it.mesh.scale.setScalar(1 - t * 0.7);
      } else if (it.kind === "dust") {
        it.mat.opacity = 0.6 * (1 - t);
        it.mesh.scale.setScalar(1 + t * 2.8);
      } else if (it.kind === "ring") {
        const base = it.inner ? 0.8 : (it.big ? 1 : 0.6);
        const grow = it.inner ? 3.6 : (it.big ? 18 : 7.5);
        const s = base + t * grow;
        it.mesh.scale.set(s, s, s);
        it.mesh.rotation.z += dt * (it.spin || 0);
        it.mat.opacity = (it.big ? 0.75 : it.inner ? 0.95 : 0.8) * (1 - t);
      } else if (it.kind === "pillar") {
        const s = 0.7 + t * 1.8;
        it.mesh.scale.set(s, 1 - t * 0.25, s);
        it.mat.opacity = 0.6 * (1 - t);
      } else if (it.kind === "flash") {
        const s = 1 + t * 6;
        it.mesh.scale.set(s, s, s);
        it.mat.opacity = 1.0 * (1 - t);
      } else if (it.kind === "glow") {
        it.mesh.quaternion.copy(this.camera.quaternion);
        const s = 1 + t * 1.25;
        it.mesh.scale.set(it.size * 2.2 * it.stretch * s, it.size * 2.2 * s, 1);
        it.mat.opacity = 1.0 * (1 - t) * (1 - t);
      } else if (it.kind === "trail") {
        it.mat.opacity = (it.op ?? 0.5) * (1 - t);
        const s = 1 - t * 0.4;
        it.mesh.scale.set(2.0 * s, 3.4 * s, 1);
      }
    }
  }

  applyShake() {
    if (this.shake > 0.001) {
      const o = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * o * 1.15;
      this.camera.position.y += (Math.random() - 0.5) * o * 0.9;
      this.shake *= 0.82;
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
