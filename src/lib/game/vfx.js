// @ts-nocheck
import * as THREE from "three";

// Gestor de VFX: chispas, polvo, ondas de choque, escombros, brillos aditivos,
// estelas de dash con textura, golpes con impacto y estallidos de ultimate.
// Geometrías y texturas compartidas para evitar GC.

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.15)");
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
      spark: new THREE.OctahedronGeometry(0.18, 0),
      shard: new THREE.TetrahedronGeometry(0.22, 0),
      dust: new THREE.PlaneGeometry(0.5, 0.5),
      ring: new THREE.RingGeometry(0.4, 0.7, 32),
      ringInner: new THREE.RingGeometry(0.18, 0.34, 24),
      debris: new THREE.BoxGeometry(0.25, 0.25, 0.25),
    };
  }

  addShake(v) { this.shake = Math.min(1.4, this.shake + v); }

  // Brillo aditivo con textura radial: la base de casi todo el "jugo" visual.
  addGlow(position, color, size = 2, life = 0.28, stretch = 1) {
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
      const sp = 4 + Math.random() * 7;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp),
        life: 0.42 + Math.random() * 0.18, age: 0, kind: "spark",
      });
    }
    this.addGlow(position, color, 1.15, 0.24);
  }

  // Golpe completo: brillo, anillo, chispas y sacudida proporcional.
  addImpact(position, color, strength = 1) {
    this.addHitSpark(position, color);
    this.addShockwave(position, color, strength > 1.3);
    this.addShake(0.08 * strength);
  }

  addDust(position) {
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xb9b3a8, transparent: true, opacity: 0.55, depthWrite: false });
      const m = new THREE.Mesh(this.geo.dust, mat);
      m.position.copy(position);
      m.position.y = 0.1;
      m.rotation.x = -Math.PI / 2;
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 2.2, 0.4, Math.sin(a) * 2.2),
        life: 0.65, age: 0, kind: "dust",
      });
    }
  }

  addShockwave(position, color, big = false) {
    // anillo exterior + núcleo brillante
    for (const inner of [false, true]) {
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: inner ? 0.9 : 0.75, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.Mesh(inner ? this.geo.ringInner : this.geo.ring, mat);
      m.position.copy(position); m.position.y = 0.12;
      m.rotation.x = -Math.PI / 2;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true, life: big ? 0.65 : 0.38, age: 0, kind: "ring",
        big, inner, spin: (Math.random() > 0.5 ? 1 : -1) * 0.6,
      });
    }
  }

  addDebris(position, color) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
      const m = new THREE.Mesh(this.geo.debris, mat);
      m.position.copy(position);
      m.castShadow = true;
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 4, 4 + Math.random() * 4, Math.sin(a) * 4),
        life: 0.9, age: 0, kind: "debris",
      });
    }
  }

  // Estela con los dos colores del efecto en degradado y su emoji encima.
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
    // destello interior para dar volumen
    const g2 = x.createRadialGradient(64, 52, 2, 64, 64, 48);
    g2.addColorStop(0, "rgba(255,255,255,0.85)");
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

  // Estela del dash: fantasma texturizado + chispas del color secundario.
  addDashTrail(position, color) {
    const tex = this.dashTex;
    const mat = new THREE.MeshBasicMaterial(
      tex
        ? { map: tex, transparent: true, opacity: 0.9, depthWrite: false }
        : { color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }
    );
    const m = new THREE.Mesh(this.geo.dust, mat);
    m.position.copy(position); m.position.y = 1.6;
    m.scale.set(1.7, 3.1, 1);
    m.lookAt(this.camera.position.x, m.position.y, this.camera.position.z);
    this.scene.add(m);
    this.items.push({ mesh: m, mat, shared: true, life: tex ? 0.36 : 0.3, age: 0, kind: "trail", op: tex ? 0.9 : 0.55 });

    // pequeña chispa de velocidad
    if (Math.random() < 0.55) {
      const sparkColor = tex && this.dashStyle ? this.dashStyle.b : color;
      const smat = new THREE.MeshBasicMaterial({ color: sparkColor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
      const s = new THREE.Mesh(this.geo.spark, smat);
      s.position.copy(position);
      s.position.x += (Math.random() - 0.5) * 1.2;
      s.position.z += (Math.random() - 0.5) * 1.2;
      s.position.y = 0.6 + Math.random() * 1.6;
      s.scale.setScalar(0.7);
      this.scene.add(s);
      this.items.push({
        mesh: s, mat: smat, shared: true,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3),
        life: 0.35, age: 0, kind: "spark",
      });
    }
  }

  // Emote: destello corto alrededor del personaje para acompañar el movimiento.
  addEmoteBurst(position, color) {
    this.addShockwave(position, color, false);
    this.addGlow(position.clone().setY(position.y + 1.6), color, 1.6, 0.32);
  }

  // Estallido épico para ultimates: brillo, ondas, pilar de luz, flash y chispas.
  addUltimateBurst(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.2), color, 4.5, 0.5);
    this.addShockwave(position, color, true);
    const mat2 = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const r2 = new THREE.Mesh(this.geo.ring, mat2);
    r2.position.copy(position); r2.position.y = 0.14; r2.rotation.x = -Math.PI / 2;
    this.scene.add(r2);
    this.items.push({ mesh: r2, mat: mat2, shared: true, life: 0.95, age: -0.12, kind: "ring", big: true, spin: -0.8 });
    // pilar de luz
    const pmat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.2, 16, 18, 1, true), pmat);
    pillar.position.copy(position); pillar.position.y = 8;
    this.scene.add(pillar);
    this.items.push({ mesh: pillar, mat: pmat, shared: false, life: 0.7, age: 0, kind: "pillar" });
    // flash esférico blanco
    const fmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), fmat);
    flash.position.copy(position);
    this.scene.add(flash);
    this.items.push({ mesh: flash, mat: fmat, shared: false, life: 0.26, age: 0, kind: "flash" });
    // lluvia de chispas
    for (let i = 0; i < 26; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0xffffff : color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
      const m = new THREE.Mesh(this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const sp = 7 + Math.random() * 10;
      this.scene.add(m);
      this.items.push({
        mesh: m, mat, shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 5 + Math.random() * 9, Math.sin(a) * sp),
        life: 0.75, age: 0, kind: "spark",
      });
    }
    this.addShake(1.0);
  }

  // Derrota cinematográfica: cambia la lluvia de partículas según el estilo.
  addDefeatBurst(position, color, style = {}) {
    const tint = style.tint ? new THREE.Color(style.tint) : color;
    this.addGlow(position.clone().setY(position.y + 1.5), tint, 6, 0.8);
    this.addShockwave(position.clone().setY(0.2), tint, true);
    this.addShake(style.shake ?? 0.6);

    const kind = style.particle || "sparks";
    const count = kind === "debris" ? 18 : kind === "smoke" ? 9 : 14;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffffff : tint, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(kind === "debris" ? this.geo.debris : this.geo.spark, mat);
      mesh.position.copy(position).setY(position.y + 1.1);
      mesh.scale.setScalar(kind === "debris" ? 1.2 : 1.6);
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const sp = (kind === "streaks" ? 13 : kind === "smoke" ? 2.6 : 7.5) + Math.random() * 5;
      this.scene.add(mesh);
      this.items.push({
        mesh, mat, shared: true,
        kind: kind === "debris" ? "debris" : "spark",
        vel: new THREE.Vector3(Math.cos(a) * sp, kind === "smoke" ? 3 + Math.random() * 2 : 6 + Math.random() * 7, Math.sin(a) * sp),
        life: 0.8 + Math.random() * 0.5, age: 0,
      });
    }

    if (kind === "shards" || kind === "freeze") {
      const mat = new THREE.MeshBasicMaterial({
        color: tint, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const disc = new THREE.Mesh(this.geo.ring, mat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(position).setY(0.12);
      disc.scale.setScalar(3.4);
      this.scene.add(disc);
      this.items.push({ mesh: disc, mat, shared: true, kind: "ring", life: 1.6, age: 0, big: true });
    }
  }

  // Aro de protección al reaparecer.
  addRespawnRing(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.4), color, 3.2, 0.6);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(this.geo.ring, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).setY(0.12);
    this.scene.add(ring);
    this.items.push({ mesh: ring, mat, shared: true, kind: "ring", life: 0.9, age: 0, inner: true });
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
        it.vel.y -= 18 * dt;
        if (it.mesh.position.y < 0.2) { it.mesh.position.y = 0.2; it.vel.y *= -0.4; it.vel.x *= 0.7; it.vel.z *= 0.7; }
        it.mat.opacity = 1 - t;
        it.mesh.rotation.x += dt * 9; it.mesh.rotation.y += dt * 7;
        if (it.kind === "spark") it.mesh.scale.setScalar(1 - t * 0.7);
      } else if (it.kind === "dust") {
        it.mat.opacity = 0.55 * (1 - t);
        it.mesh.scale.setScalar(1 + t * 2.4);
      } else if (it.kind === "ring") {
        const base = it.inner ? 0.8 : (it.big ? 1 : 0.6);
        const grow = it.inner ? 3.2 : (it.big ? 16 : 6.5);
        const s = base + t * grow;
        it.mesh.scale.set(s, s, s);
        it.mesh.rotation.z += dt * (it.spin || 0);
        it.mat.opacity = (it.big ? 0.7 : it.inner ? 0.9 : 0.75) * (1 - t);
      } else if (it.kind === "pillar") {
        const s = 0.6 + t * 1.6;
        it.mesh.scale.set(s, 1 - t * 0.3, s);
        it.mat.opacity = 0.5 * (1 - t);
      } else if (it.kind === "flash") {
        const s = 1 + t * 5;
        it.mesh.scale.set(s, s, s);
        it.mat.opacity = 0.85 * (1 - t);
      } else if (it.kind === "glow") {
        it.mesh.quaternion.copy(this.camera.quaternion);
        const s = 1 + t * 1.1;
        it.mesh.scale.set(it.size * 2 * it.stretch * s, it.size * 2 * s, 1);
        it.mat.opacity = 0.95 * (1 - t) * (1 - t);
      } else if (it.kind === "trail") {
        it.mat.opacity = (it.op ?? 0.5) * (1 - t);
        const s = 1 - t * 0.45;
        it.mesh.scale.set(1.7 * s, 3.1 * s, 1);
      }
    }
  }

  applyShake() {
    if (this.shake > 0.001) {
      const o = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * o;
      this.camera.position.y += (Math.random() - 0.5) * o;
      this.shake *= 0.84;
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