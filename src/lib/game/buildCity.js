// @ts-nocheck
import * as THREE from "three";
import { makeBuildingTextures } from "@/lib/gameTexture";
import { FIXED_BILLBOARD_IMAGES } from "@/lib/game/fixedBillboardImages";
import { buildCentralPlaza } from "@/lib/game/buildCityPlaza";
import { addCityDecor } from "@/lib/game/buildCityDecor";
import { buildHollowBuilding } from "@/lib/game/buildHollow";
import { createSkyCycle } from "@/lib/game/buildSkyCycle";
import { updateHollowEffects } from "@/lib/game/buildHollowAds";

const DISTRICTS = [
  { name: "residential", colors: [0x6a7a72, 0x7a8a7a, 0x5a6a5a], minH: 8, maxH: 22, neon: 0x88ccaa, tallChance: 0.06 },
  { name: "commercial", colors: [0x5a6470, 0x707a88, 0x4a5460], minH: 16, maxH: 40, neon: 0x00e5ff, tallChance: 0.18 },
  { name: "industrial", colors: [0x7a6a52, 0x6f6450, 0x5a5040], minH: 10, maxH: 28, neon: 0xff7b00, tallChance: 0.05 },
  { name: "neon", colors: [0x3a2a52, 0x4a3a62, 0x2a1a42], minH: 18, maxH: 48, neon: 0xff2d95, tallChance: 0.22 },
  { name: "suburb", colors: [0x8a7a6a, 0x9a8a7a, 0x7a6a5a], minH: 6, maxH: 16, neon: 0xffcc66, tallChance: 0.03 },
];

function pickHeight(dist) {
  const r = Math.random();
  if (r < 0.4) return dist.minH + Math.random() * Math.min(12, dist.maxH - dist.minH) * 0.5;
  if (r < 0.75) return dist.minH + (dist.maxH - dist.minH) * (0.35 + Math.random() * 0.35);
  if (r < 0.9 || Math.random() > dist.tallChance) return dist.minH + (dist.maxH - dist.minH) * (0.55 + Math.random() * 0.35);
  return dist.maxH + 12 + Math.random() * 40;
}

function isOnRoad(x, z) {
  const near = (v) => {
    const m = ((v % 56) + 56) % 56;
    return m < 10 || m > 46;
  };
  return near(x) || near(z);
}

const PLAZA_PATH = 14;
const SHOP_ZONE = { x: 16, z: 20, r: 14 };

function footprintOnRoad(x, z, w, d) {
  const hw = (w || 10) * 0.5 + 1.5;
  const hd = (d || 10) * 0.5 + 1.5;
  const samples = [
    [x, z],
    [x + hw, z], [x - hw, z], [x, z + hd], [x, z - hd],
    [x + hw * 0.7, z + hd * 0.7], [x - hw * 0.7, z + hd * 0.7],
    [x + hw * 0.7, z - hd * 0.7], [x - hw * 0.7, z - hd * 0.7],
  ];
  for (const [sx, sz] of samples) {
    if (isOnRoad(sx, sz)) return true;
  }
  if (Math.abs(x) < 8 + hw && Math.abs(z) < PLAZA_PATH + hd) return true;
  if (Math.abs(z) < 8 + hd && Math.abs(x) < PLAZA_PATH + hw) return true;
  return false;
}

function districtAt(x, z) {
  const a = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  let t = 0;
  if (r < 80) t = 1;
  else if (a > -Math.PI * 0.2 && a < Math.PI * 0.4) t = 3;
  else if (a > Math.PI * 0.4 && a < Math.PI * 0.9) t = 2;
  else if (a > -Math.PI * 0.9 && a < -Math.PI * 0.2) t = 0;
  else t = 4;
  return DISTRICTS[t];
}

function makeOcc(minDist = 10) {
  const pts = [];
  return {
    tryAdd(x, z, r = minDist) {
      for (const p of pts) {
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz < (r + p.r) * (r + p.r)) return false;
      }
      pts.push({ x, z, r });
      return true;
    },
    free(x, z, r = minDist) {
      for (const p of pts) {
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz < (r + p.r) * (r + p.r)) return false;
      }
      return true;
    },
    add(x, z, r = minDist) {
      pts.push({ x, z, r });
    },
  };
}

function makeTVTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 144;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a0a12"; ctx.fillRect(0, 0, 256, 144);
  ctx.fillStyle = "#1a2030"; ctx.fillRect(16, 16, 224, 112);
  ctx.fillStyle = "#00e5ff"; ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
  ctx.fillText("RESENHA TV", 128, 80);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const { map, emissive } = makeBuildingTextures();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const buildingMat = new THREE.MeshStandardMaterial({
    map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0.22,
    roughness: 0.85, metalness: 0.05, flatShading: true,
  });
  const altMat = buildingMat.clone();
  altMat.color = new THREE.Color(0xc8c8d0);

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.95, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.9, flatShading: true });
  const facadeTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.7, metalness: 0.2, flatShading: true });
  const facadeEdgeMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.8, flatShading: true });

  // Many hollow multi-floor buildings, dispersed in rings around the plaza
  const COUNT = 130;
  const dummy = new THREE.Object3D();
  const placed = [];
  const platforms = [];
  const treeColliders = [];
  const occ = makeOcc(12);
  const PLAZA_R = 58;
  occ.add(SHOP_ZONE.x, SHOP_ZONE.z, SHOP_ZONE.r);
  occ.add(0, 0, 22);

  const hollowMats = {
    emissiveMap: emissive,
    sidewalk: sidewalkMat,
  };
  const tvTex = makeTVTexture();

  const HOLLOW_SLOTS = [
    { gx: 3, gz: 0, w: 28, d: 24, withTv: true },
    { gx: -3, gz: 0, w: 26, d: 26, withTv: false },
    { gx: 0, gz: 3, w: 26, d: 22, withTv: true },
    { gx: 0, gz: -3, w: 24, d: 28, withTv: false },
    { gx: 2, gz: 2, w: 24, d: 24, withTv: true },
    { gx: -2, gz: -2, w: 22, d: 26, withTv: false },
    { gx: 2, gz: -2, w: 24, d: 22, withTv: false },
    { gx: -2, gz: 2, w: 22, d: 24, withTv: true },
  ];
  let hollowBuilt = 0;
  for (const slot of HOLLOW_SLOTS) {
    const px = slot.gx * 28, pz = slot.gz * 28;
    if (footprintOnRoad(px, pz, slot.w, slot.d)) continue;
    if (Math.hypot(px - SHOP_ZONE.x, pz - SHOP_ZONE.z) < SHOP_ZONE.r + Math.max(slot.w, slot.d) * 0.4) continue;
    if (!occ.tryAdd(px, pz, Math.max(slot.w, slot.d) * 0.55)) continue;
    buildHollowBuilding(group, px, pz, slot.w, slot.d, 0, hollowMats, treeColliders, platforms, tvTex, !!slot.withTv);
    placed.push({ x: px, z: pz, w: slot.w, d: slot.d, h: 36 });
    hollowBuilt++;
  }

  for (let attempt = 0; attempt < COUNT * 14 && hollowBuilt < COUNT; attempt++) {
    // Even angular spread + rings so the whole map fills (N/S/E/W)
    const ang = (attempt / (COUNT * 14)) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const ring = Math.floor(attempt / 18) % 6;
    const rad = PLAZA_R + 28 + ring * 32 + Math.random() * 28;
    let px = Math.cos(ang) * rad;
    let pz = Math.sin(ang) * rad;
    px = Math.round(px / 18) * 18;
    pz = Math.round(pz / 18) * 18;
    if (Math.hypot(px, pz) < PLAZA_R + 16) continue;

    const w = 16 + Math.floor(Math.random() * 10);
    const d = 14 + Math.floor(Math.random() * 10);
    if (footprintOnRoad(px, pz, w, d)) continue;
    if (Math.hypot(px - SHOP_ZONE.x, pz - SHOP_ZONE.z) < SHOP_ZONE.r + Math.max(w, d) * 0.45) continue;
    if (!occ.tryAdd(px, pz, Math.max(w, d) * 0.55)) continue;

    const withTv = hollowBuilt % 3 === 0;
    try {
      buildHollowBuilding(group, px, pz, w, d, 0, hollowMats, treeColliders, platforms, tvTex, withTv);
      placed.push({ x: px, z: pz, w, d, h: 36 });
      hollowBuilt++;
    } catch (e) {
      console.warn("hollow fail", e);
    }

    if (Math.random() > 0.8) {
      for (let t = 0; t < 1 + Math.floor(Math.random() * 2); t++) {
        const tx = px + (Math.random() - 0.5) * (w + 10);
        const tz = pz + (Math.random() - 0.5) * (d + 10);
        if (!occ.tryAdd(tx, tz, 3)) continue;
        if (isOnRoad(tx, tz)) continue;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, 3.2, 5),
          new THREE.MeshStandardMaterial({ color: 0x5a3a20, flatShading: true })
        );
        trunk.position.set(tx, 1.6, tz);
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(2.0, 4.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true })
        );
        leaf.position.set(tx, 4.4, tz);
        group.add(trunk, leaf);
        treeColliders.push({ x: tx, z: tz, w: 1.2, d: 1.2 });
      }
    }
  }

  try { buildCentralPlaza(group, occ, PLAZA_R); } catch (e) { console.warn(e); }

  const sidewalkSlots = [];
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const side = Math.random() > 0.5
      ? { x: p.x + (Math.random() > 0.5 ? 1 : -1) * (p.w / 2 + 2.2), z: p.z + (Math.random() - 0.5) * p.d * 0.6 }
      : { x: p.x + (Math.random() - 0.5) * p.w * 0.6, z: p.z + (Math.random() > 0.5 ? 1 : -1) * (p.d / 2 + 2.2) };
    if (Math.abs(side.x) < PLAZA_R && Math.abs(side.z) < PLAZA_R) continue;
    if (isOnRoad(side.x, side.z)) continue;
    if (Math.hypot(side.x - SHOP_ZONE.x, side.z - SHOP_ZONE.z) < SHOP_ZONE.r) continue;
    if (!occ.tryAdd(side.x, side.z, 3.5)) continue;
    sidewalkSlots.push(side);
  }

  const kioskColors = [0xc45c26, 0x2a6a8a, 0x6a2a5a, 0x4a7a3a, 0x8a6a2a];
  let slotI = 0;
  for (let k = 0; k < 8 && slotI < sidewalkSlots.length; k++, slotI += 3) {
    const { x: kx, z: kz } = sidewalkSlots[slotI];
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 2.6), new THREE.MeshStandardMaterial({ color: kioskColors[k % 5], flatShading: true }));
    body.position.set(kx, 1.1, kz); body.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true }));
    roof.position.set(kx, 2.9, kz); roof.rotation.y = Math.PI / 4;
    group.add(body, roof);
  }

  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, flatShading: true });
  const crates = [];
  for (let i = 0; i < 10 && slotI < sidewalkSlots.length; i++, slotI += 2) {
    const { x, z } = sidewalkSlots[slotI];
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMat);
    m.castShadow = true; m.receiveShadow = true; m.position.set(x, 0.75, z);
    group.add(m);
    crates.push({ mesh: m, health: 50, respawnAt: 0 });
  }

  const { billboards, streetLights, bulbMaterial } = addCityDecor(group, occ, PLAZA_R);

  const cityAmbient = new THREE.HemisphereLight(0xb8d5ff, 0x343044, 1.15);
  const citySun = new THREE.DirectionalLight(0xffe2b5, 1.25);
  citySun.position.set(-45, 85, 35); citySun.castShadow = false;
  group.add(cityAmbient, citySun);

  let skyCycle = null;
  try { skyCycle = createSkyCycle(group); } catch (e) { console.warn("[city] sky cycle", e); }

  const p1 = new THREE.PointLight(0x00e5ff, 0.55, 140); p1.position.set(0, 28, 0);
  const p2 = new THREE.PointLight(0xff2d95, 0.42, 130); p2.position.set(55, 26, 55);
  const p3 = new THREE.PointLight(0xd500f9, 0.35, 120); p3.position.set(-50, 24, -40);
  const p4 = new THREE.PointLight(0xff6b00, 0.28, 100); p4.position.set(40, 22, -55);
  group.add(p1, p2, p3, p4);

  const neons = [];
  group.traverse((o) => {
    if (o.material && o.material.blending === THREE.AdditiveBlending) {
      neons.push({ mat: o.material, base: o.material.opacity || 0.7, phase: Math.random() * 10 });
    }
  });

  function setNight(value) {
    const night = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
    for (const n of neons) n.mat.opacity = n.base * (0.28 + 0.72 * night);
    cityAmbient.intensity = 0.78 - 0.18 * night;
    citySun.intensity = 1.25 * (1 - night) + 0.12 * night;
    bulbMaterial.emissiveIntensity = 0.05 + 2.8 * night;
    p1.intensity = 0.25 + 0.45 * night;
    p2.intensity = 0.18 + 0.38 * night;
    p3.intensity = 0.14 + 0.32 * night;
    p4.intensity = 0.1 + 0.28 * night;
    for (const light of streetLights) light.intensity = 30 * night;
  }

  function update(now, nightF) {
    const cycle = ((now || 0) % 180000) / 180000;
    const autoNight = THREE.MathUtils.smoothstep(Math.max(0, Math.sin((cycle - 0.25) * Math.PI * 2)), 0.05, 0.82);
    const night = Number.isFinite(nightF) ? THREE.MathUtils.clamp(nightF, 0, 1) : autoNight;
    setNight(night);
    try { skyCycle?.update?.(now, night); } catch (_) {}
    try { updateHollowEffects?.(now, night); } catch (_) {}
    for (const n of neons) {
      const flick = 0.72 + 0.28 * Math.sin(now * 0.0045 + n.phase) + (Math.random() < 0.015 ? -0.35 : 0);
      n.mat.opacity = n.base * (0.28 + 0.72 * night) * flick;
    }
    for (const c of crates) {
      if (c.respawnAt > 0 && now > c.respawnAt) { c.mesh.visible = true; c.health = 50; c.respawnAt = 0; }
    }
  }

  function dispose() {
    scene.remove(group);
    boxGeo.dispose(); buildingMat.dispose(); map.dispose(); emissive.dispose(); altMat.dispose();
    sidewalkMat.dispose(); roofMat.dispose(); facadeTrimMat.dispose(); facadeEdgeMat.dispose();
    for (const b of billboards) { b.mat.map?.dispose(); b.mat.dispose(); }
  }

  const colliders = placed.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d }));
  colliders.push(...treeColliders);
  colliders.push({ x: 0, z: 0, w: 15.5, d: 15.5 });
  colliders.push({ x: 0, z: 0, w: 3.6, d: 3.6 });
  return { group, crates, neons, colliders, platforms, billboards, setNight, update, dispose };
}
