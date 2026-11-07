// @ts-nocheck
import * as THREE from "three";
import { makeAttackSpriteCanvas, resolveAttackSprite } from "@/lib/game/attackSprites";

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.85)");
  g.addColorStop(0.5, "rgba(255,255,255,0.28)");
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
    this.attackSprites = [];
    this._texLoader = new THREE.TextureLoader();
    this.glowTex = makeGlowTexture();
    this.geo = {
      spark: new THREE.OctahedronGeometry(0.22, 0),
      shard: new THREE.TetrahedronGeometry(0.3, 0),
      dust: new THREE.PlaneGeometry(0.6, 0.6),
      ring: new THREE.RingGeometry(0.35, 0.85, 56),
      ringInner: new THREE.RingGeometry(0.12, 0.4, 36),
      debris: new THREE.BoxGeometry(0.3, 0.3, 0.3),
    };
  }

  addShake(v) {
    this.shake = Math.min(1.85, this.shake + v);
  }

  addGlow(position, color, size = 2.4, life = 0.3, stretch = 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: this.glowTex,
      color,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
    const cyan = new THREE.Color(0x66f0ff);
    for (let i = 0; i < 16; i++) {
      const col = i % 4 === 0 ? white : i % 5 === 0 ? cyan : base;
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(i % 3 === 0 ? this.geo.shard : this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 11;
      this.scene.add(m);
      this.items.push({
        mesh: m,
        mat,
        shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp, 2.5 + Math.random() * 5, Math.sin(a) * sp),
        life: 0.38 + Math.random() * 0.18,
        age: 0,
        kind: "spark",
      });
    }
    this.addGlow(position, color, 1.55, 0.26);
    this.addGlow(position, 0xffffff, 0.7, 0.12);
  }

  addImpact(position, color, strength = 1) {
    this.addHitSpark(position, color);
    this.addShockwave(position, color, strength > 1.1);
    if (strength > 1.25) this.addShockwave(position.clone().setY(position.y + 0.05), 0xffffff, false);
    this.addShake(0.14 * strength);
  }

  addDust(position) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xb9b3a8,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const m = new THREE.Mesh(this.geo.dust, mat);
      m.position.copy(position);
      m.position.y = 0.12;
      m.rotation.x = -Math.PI / 2;
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m,
        mat,
        shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 2.4, 0.5, Math.sin(a) * 2.4),
        life: 0.55,
        age: 0,
        kind: "dust",
      });
    }
  }

  addShockwave(position, color, big = false) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: big ? 0.85 : 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = new THREE.Mesh(this.geo.ring, mat);
    m.position.copy(position);
    m.position.y = 0.14;
    m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    this.items.push({
      mesh: m,
      mat,
      shared: true,
      life: big ? 0.62 : 0.36,
      age: 0,
      kind: "ring",
      big,
      inner: false,
      spin: 0.7,
    });

    if (big) {
      const mat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const m2 = new THREE.Mesh(this.geo.ringInner, mat2);
      m2.position.copy(position);
      m2.position.y = 0.16;
      m2.rotation.x = -Math.PI / 2;
      this.scene.add(m2);
      this.items.push({
        mesh: m2,
        mat: mat2,
        shared: true,
        life: 0.4,
        age: 0,
        kind: "ring",
        big: false,
        inner: true,
        spin: 1.2,
      });
    }
  }

  addDebris(position, color) {
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(this.geo.debris, mat);
      m.position.copy(position);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      this.items.push({
        mesh: m,
        mat,
        shared: true,
        vel: new THREE.Vector3(Math.cos(a) * 5, 4.5 + Math.random() * 4, Math.sin(a) * 5),
        life: 0.75,
        age: 0,
        kind: "debris",
      });
    }
  }

  dashTexture(style) {
    const key = `${style.a}|${style.b}|${style.emoji}`;
    if (this.dashCache.has(key)) return this.dashCache.get(key);
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
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
        ? { map: tex, transparent: true, opacity: 0.9, depthWrite: false }
        : {
            color,
            transparent: true,
            opacity: 0.62,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }
    );
    const m = new THREE.Mesh(this.geo.dust, mat);
    m.position.copy(position);
    m.position.y = 1.6;
    m.scale.set(1.8, 3.1, 1);
    m.lookAt(this.camera.position.x, m.position.y, this.camera.position.z);
    this.scene.add(m);
    this.items.push({
      mesh: m,
      mat,
      shared: true,
      life: 0.32,
      age: 0,
      kind: "trail",
      op: tex ? 0.9 : 0.62,
    });
  }

  addEmoteBurst(position, color) {
    this.addShockwave(position, color, false);
    this.addGlow(position.clone().setY(position.y + 1.6), color, 1.8, 0.3);
  }

  addUltimateBurst(position, color) {
    const c = new THREE.Color(color);
    // Layered core flash — Shibuya-style energy detonation
    this.addGlow(position.clone().setY(position.y + 1.4), c, 6.2, 0.55);
    this.addGlow(position.clone().setY(position.y + 0.5), 0xffffff, 3.0, 0.28);
    this.addGlow(position.clone().setY(position.y + 2.0), c, 3.5, 0.4, 1.4);
    this.addShockwave(position, color, true);
    this.addShockwave(position.clone().setY(0.18), 0xffffff, false);

    const fmat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), fmat);
    flash.position.copy(position);
    this.scene.add(flash);
    this.items.push({ mesh: flash, mat: fmat, shared: false, life: 0.26, age: 0, kind: "flash" });

    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffffff : i % 4 === 0 ? 0x88eeff : color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(i % 4 === 0 ? this.geo.shard : this.geo.spark, mat);
      m.position.copy(position);
      const a = Math.random() * Math.PI * 2;
      const elev = 0.3 + Math.random() * 0.9;
      const sp = 9 + Math.random() * 14;
      this.scene.add(m);
      this.items.push({
        mesh: m,
        mat,
        shared: true,
        vel: new THREE.Vector3(Math.cos(a) * sp * elev, 5 + Math.random() * 8, Math.sin(a) * sp * elev),
        life: 0.6 + Math.random() * 0.2,
        age: 0,
        kind: "spark",
      });
    }
    this.addDebris(position.clone().setY(position.y + 0.4), color);
    this.addShake(1.05);
  }

  addDefeatBurst(position, color, style = {}) {
    const tint = style.tint ? new THREE.Color(style.tint) : color;
    this.addGlow(position.clone().setY(position.y + 1.5), tint, 4.5, 0.55);
    this.addShockwave(position.clone().setY(0.2), tint, true);
    this.addShake(style.shake ?? 0.55);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.geo.spark, mat);
      mesh.position.copy(position).setY(position.y + 1.1);
      const a = (i / 12) * Math.PI * 2;
      this.scene.add(mesh);
      this.items.push({
        mesh,
        mat,
        shared: true,
        kind: "spark",
        vel: new THREE.Vector3(Math.cos(a) * 9, 5.5, Math.sin(a) * 9),
        life: 0.65,
        age: 0,
      });
    }
  }

  addRespawnRing(position, color) {
    this.addGlow(position.clone().setY(position.y + 1.4), color, 2.8, 0.45);
    this.addShockwave(position, color, false);
    this.addGlow(position.clone().setY(position.y + 0.3), 0xffffff, 1.2, 0.2);
  }

  /** Sprite de habilidad breve delante del personaje. */
  addAttackSprite(origin, dir, move, colorHex) {
    const resolved = resolveAttackSprite(move, move?.category);
    const life = move?.attackSpriteDuration ?? (move?.category === "ultimate" ? 0.45 : 0.24);
    const size = move?.attackSpriteSize ?? (move?.category === "ultimate" ? 3.9 : 2.55);
    const pos = (origin || new THREE.Vector3()).clone();
    pos.y = (pos.y || 0) + 1.35;
    pos.x += (dir?.x || 0) * 1.35;
    pos.z += (dir?.z || 0) * 1.35;

    const mat = new THREE.SpriteMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1,
      color: 0xffffff,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(size, size, 1);
    spr.position.copy(pos);
    this.scene.add(spr);
    const entry = { mesh: spr, mat, life, maxLife: life, kind: "attackSprite", baseScale: size };
    this.attackSprites.push(entry);

    const applyTex = (tex) => {
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    };

    if (resolved.kind === "url") {
      this._texLoader.load(
        resolved.src,
        applyTex,
        undefined,
        () => {
          const canvas = makeAttackSpriteCanvas("punch", colorHex || "#ffffff");
          if (canvas) {
            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            applyTex(tex);
          }
        }
      );
    } else {
      const canvas = makeAttackSpriteCanvas(resolved.id, colorHex || "#ffffff");
      if (canvas) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        applyTex(tex);
      }
    }
    return entry;
  }

  update(dt) {
    while (this.items.length > 80) {
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
        it.vel.y -= 20 * dt;
        if (it.mesh.position.y < 0.2) {
          it.mesh.position.y = 0.2;
          it.vel.y *= -0.32;
        }
        it.mat.opacity = 1 - t;
        it.mesh.rotation.x += dt * 10;
        if (it.kind === "spark") it.mesh.scale.setScalar(1 - t * 0.75);
      } else if (it.kind === "dust") {
        it.mat.opacity = 0.55 * (1 - t);
        it.mesh.scale.setScalar(1 + t * 2.4);
      } else if (it.kind === "ring") {
        const grow = it.inner ? 10 : it.big ? 16 : 7;
        const s = 0.55 + t * grow;
        it.mesh.scale.set(s, s, s);
        it.mat.opacity = (it.big ? 0.8 : it.inner ? 0.55 : 0.75) * (1 - t);
        if (it.spin) it.mesh.rotation.z += dt * it.spin;
      } else if (it.kind === "flash") {
        const s = 1 + t * 5.5;
        it.mesh.scale.set(s, s, s);
        it.mat.opacity = 0.95 * (1 - t);
      } else if (it.kind === "glow") {
        it.mesh.quaternion.copy(this.camera.quaternion);
        const s = 1 + t * 1.05;
        it.mesh.scale.set(it.size * 2 * it.stretch * s, it.size * 2 * s, 1);
        it.mat.opacity = 0.98 * (1 - t) * (1 - t);
      } else if (it.kind === "trail") {
        it.mat.opacity = (it.op ?? 0.5) * (1 - t);
        const s = 1 - t * 0.45;
        it.mesh.scale.set(1.8 * s, 3.1 * s, 1);
      }
    }

    for (let i = this.attackSprites.length - 1; i >= 0; i--) {
      const it = this.attackSprites[i];
      it.life -= dt;
      const t = 1 - Math.max(0, it.life) / (it.maxLife || 0.25);
      const base = it.baseScale || 2.4;
      const s = base * (1 + t * 0.7);
      it.mesh.scale.set(s, s, 1);
      it.mat.opacity = Math.max(0, 1 - t * t);
      if (it.life <= 0) {
        this.scene.remove(it.mesh);
        it.mat.map?.dispose();
        it.mat.dispose();
        this.attackSprites.splice(i, 1);
      }
    }
  }

  applyShake() {
    if (this.shake > 0.001) {
      const o = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * o * 1.05;
      this.camera.position.y += (Math.random() - 0.5) * o * 0.8;
      this.shake *= 0.78;
    } else this.shake = 0;
  }

  dispose() {
    for (const it of this.attackSprites) {
      this.scene.remove(it.mesh);
      it.mat.map?.dispose();
      it.mat.dispose();
    }
    this.attackSprites = [];
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
