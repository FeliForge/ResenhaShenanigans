// @ts-nocheck
import * as THREE from "three";
import { makeBuildingTextures } from "@/lib/gameTexture";
import { FIXED_BILLBOARD_IMAGES } from "@/lib/game/fixedBillboardImages";
import { buildCentralPlaza } from "@/lib/game/buildCityPlaza";
import { addCityDecor } from "@/lib/game/buildCityDecor";
import { buildHollowBuilding } from "@/lib/game/buildHollow";

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
    return m < 7 || m > 49;
  };
  return near(x) || near(z);
}

function makeTree() {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 3.5 + Math.random() * 1.5, 5),
    new THREE.MeshStandardMaterial({ color: 0x5a3a22, flatShading: true })
  );
  trunk.position.y = 2;
  trunk.castShadow = true;
  const leafColor = [0x2e7d32, 0x388e3c, 0x1b5e20, 0x4caf50][Math.floor(Math.random() * 4)];
  const fol = new THREE.Mesh(
    new THREE.ConeGeometry(1.8 + Math.random() * 1.2, 4 + Math.random() * 2, 6),
    new THREE.MeshStandardMaterial({ color: leafColor, flatShading: true })
  );
  fol.position.y = 5.5;
  fol.castShadow = true;
  t.add(trunk, fol);
  return t;
}

function Occupancy(minDist) {
  const pts = [];
  return {
    tryAdd(x, z, r = minDist) {
      for (const p of pts) {
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz < (r + p.r) * (r + p.r) * 0.25) return false;
      }
      pts.push({ x, z, r });
      return true;
    },
  };
}

function makeTvTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 144;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a0e18";
  ctx.fillRect(0, 0, 256, 144);
  const g = ctx.createLinearGradient(0, 0, 256, 144);
  g.addColorStop(0, "#1a3a5a");
  g.addColorStop(0.5, "#2a1a4a");
  g.addColorStop(1, "#0a2a3a");
  ctx.fillStyle = g;
  ctx.fillRect(8, 8, 240, 128);
  ctx.fillStyle = "#00e5ff";
  ctx.font = "bold 28px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RESENHA", 128, 60);
  ctx.fillStyle = "#ff2d95";
  ctx.font = "18px system-ui,sans-serif";
  ctx.fillText("TV · ON AIR", 128, 95);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.strokeRect(12, 12, 232, 120);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const occ = Occupancy(4);

  const { map, emissive } = makeBuildingTextures();
  const buildingMat = new THREE.MeshStandardMaterial({
    map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 1.05,
    flatShading: true, roughness: 0.82, metalness: 0.08,
  });
  const altMat = new THREE.MeshStandardMaterial({ color: 0x5a6570, flatShading: true, roughness: 0.86, metalness: 0.06 });

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const placed = [];
  const treeColliders = [];
  const platforms = [];

  const COLS = 15, COUNT = 185;
  const buildings = new THREE.InstancedMesh(boxGeo, buildingMat, COUNT);
  buildings.castShadow = false; buildings.receiveShadow = false;
  const buildingsB = new THREE.InstancedMesh(boxGeo, altMat, 90);
  buildingsB.castShadow = false; buildingsB.receiveShadow = false;
  let idxB = 0;

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x7a7e86, roughness: 0.92, metalness: 0.05, flatShading: true });
  const sidewalks = new THREE.InstancedMesh(boxGeo, sidewalkMat, COUNT + 40);
  sidewalks.receiveShadow = false;

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3e46, roughness: 0.78, flatShading: true });
  const roofs = new THREE.InstancedMesh(boxGeo, roofMat, COUNT * 2);
  roofs.castShadow = false;

  const facadeTrimMat = new THREE.MeshStandardMaterial({ color: 0x202a38, roughness: 0.62, metalness: 0.38, flatShading: true });
  const facadeEdgeMat = new THREE.MeshStandardMaterial({ color: 0x496174, emissive: 0x102938, emissiveIntensity: 0.42, roughness: 0.48, metalness: 0.5, flatShading: true });
  const facadeBands = new THREE.InstancedMesh(boxGeo, facadeTrimMat, COUNT * 28);
  const facadeCorners = new THREE.InstancedMesh(boxGeo, facadeEdgeMat, COUNT * 4);
  facadeBands.castShadow = false; facadeBands.receiveShadow = false;
  facadeCorners.castShadow = false; facadeCorners.receiveShadow = false;

  const hollowMats = {
    emissiveMap: emissive,
    wall: null,
    floor: new THREE.MeshStandardMaterial({ color: 0x6a6a6e, roughness: 0.95, flatShading: true }),
    trim: new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.7, metalness: 0.25, flatShading: true }),
    col: new THREE.MeshStandardMaterial({ color: 0x6e6e72, roughness: 0.8, metalness: 0.12, flatShading: true }),
    stair: new THREE.MeshStandardMaterial({ color: 0x5a5a5e, roughness: 0.9, flatShading: true }),
    sidewalk: sidewalkMat,
  };
  const tvTex = makeTvTexture();

  const HOLLOW_SLOTS = [
    { gx: 2, gz: 0, withTv: true },
    { gx: -2, gz: 0, withTv: true },
    { gx: 0, gz: 2, withTv: false },
    { gx: 0, gz: -2, withTv: true },
    { gx: 2, gz: 1, withTv: false },
    { gx: -2, gz: -1, withTv: true },
    { gx: 1, gz: 2, withTv: false },
    { gx: -1, gz: -2, withTv: true },
  ];
  const hollowKeys = new Set(HOLLOW_SLOTS.map((s) => `${s.gx},${s.gz}`));
  let hollowBuilt = 0;

  const parkSlots = new Set(["2,1", "-3,2", "4,-2", "-1,-4", "5,3", "-5,0", "0,4", "3,-5"]);
  let idx = 0, swIdx = 0, roofIdx = 0, facadeBandIdx = 0, facadeCornerIdx = 0;
  const PLAZA_R = 58;

  for (let i = 0; i < COUNT; i++) {
    const gx = (i % COLS) - 7;
    const gz = Math.floor(i / COLS) - 5;
    const px = gx * 56 + (Math.random() * 10 - 5);
    const pz = gz * 56 + (Math.random() * 10 - 5);
    if (Math.abs(px) < PLAZA_R && Math.abs(pz) < PLAZA_R) continue;

    const slotKey = `${gx},${gz}`;

    if (hollowKeys.has(slotKey) && hollowBuilt < HOLLOW_SLOTS.length) {
      const slot = HOLLOW_SLOTS.find((s) => `${s.gx},${s.gz}` === slotKey) || HOLLOW_SLOTS[hollowBuilt];
      const w = 32 + Math.random() * 10;
      const d = 28 + Math.random() * 10;
      const yaw = (Math.random() - 0.5) * 0.08;
      buildHollowBuilding(group, px, pz, w, d, yaw, hollowMats, treeColliders, platforms, tvTex, !!slot.withTv);
      occ.tryAdd(px, pz, Math.max(w, d) * 0.55);
      hollowBuilt++;
      continue;
    }

    if (parkSlots.has(slotKey) || (Math.abs(gx) > 2 && Math.random() < 0.07)) {
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(22 + Math.random() * 10, 0.35, 22 + Math.random() * 10),
        new THREE.MeshStandardMaterial({ color: 0x2f5a32, roughness: 0.95, flatShading: true })
      );
      grass.position.set(px, 0.15, pz);
      grass.receiveShadow = true;
      group.add(grass);
      for (let t = 0; t < 2 + Math.floor(Math.random() * 3); t++) {
        const tree = makeTree();
        const tx = px + (Math.random() - 0.5) * 14;
        const tz = pz + (Math.random() - 0.5) * 14;
        if (!occ.tryAdd(tx, tz, 3)) continue;
        tree.position.set(tx, 0, tz);
        group.add(tree);
        treeColliders.push({ x: tx, z: tz, w: 1.15, d: 1.15 });
      }
      continue;
    }

    const ring = Math.abs(gx) + Math.abs(gz);
    let distIdx;
    if (ring < 3) distIdx = Math.random() < 0.55 ? 3 : 1;
    else if (ring < 5) distIdx = Math.random() < 0.4 ? 3 : 1;
    else if (Math.abs(gx) > 5) distIdx = 4;
    else if (Math.abs(gz) > 4) distIdx = 2;
    else distIdx = ring % 5;
    const dist = DISTRICTS[distIdx] || DISTRICTS[0];

    let w, d;
    if (dist.name === "industrial") { w = 20 + Math.random() * 22; d = 14 + Math.random() * 18; }
    else if (dist.name === "suburb" || dist.name === "residential") { w = 10 + Math.random() * 12; d = 10 + Math.random() * 12; }
    else { w = 14 + Math.random() * 18; d = 14 + Math.random() * 18; }
    const h = pickHeight(dist);

    dummy.position.set(px, h / 2, pz);
    dummy.scale.set(w, h, d);
    const buildingYaw = Math.random() * 0.08;
    dummy.rotation.set(0, buildingYaw, 0);
    dummy.updateMatrix();
    if (Math.random() < 0.26 && idxB < 90) buildingsB.setMatrixAt(idxB++, dummy.matrix);
    else if (idx < COUNT) buildings.setMatrixAt(idx++, dummy.matrix);
    placed.push({ x: px, z: pz, w, d, h });
    occ.tryAdd(px, pz, Math.max(w, d) * 0.55);

    const rotCos = Math.cos(buildingYaw);
    const rotSin = Math.sin(buildingYaw);
    const rotateOffset = (localX, localZ) => ({ x: localX * rotCos + localZ * rotSin, z: -localX * rotSin + localZ * rotCos });

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const off = rotateOffset(sx * w * 0.5, sz * d * 0.5);
        dummy.position.set(px + off.x, h * 0.5, pz + off.z);
        dummy.scale.set(0.22, Math.max(2.4, h * 0.94), 0.22);
        dummy.rotation.set(0, buildingYaw, 0);
        dummy.updateMatrix();
        facadeCorners.setMatrixAt(facadeCornerIdx++, dummy.matrix);
      }
    }

    const detailLevels = Math.min(7, Math.max(1, Math.floor(h / 8)));
    for (let floor = 1; floor <= detailLevels; floor++) {
      const levelY = Math.min(h - 0.35, (h / (detailLevels + 1)) * floor);
      for (const side of [-1, 1]) {
        const frontOff = rotateOffset(0, side * (d * 0.5 + 0.055));
        dummy.position.set(px + frontOff.x, levelY, pz + frontOff.z);
        dummy.scale.set(w + 0.34, 0.14, 0.18);
        dummy.rotation.set(0, buildingYaw, 0);
        dummy.updateMatrix();
        facadeBands.setMatrixAt(facadeBandIdx++, dummy.matrix);
        const sideOff = rotateOffset(side * (w * 0.5 + 0.055), 0);
        dummy.position.set(px + sideOff.x, levelY, pz + sideOff.z);
        dummy.scale.set(0.18, 0.14, d + 0.34);
        dummy.rotation.set(0, buildingYaw, 0);
        dummy.updateMatrix();
        facadeBands.setMatrixAt(facadeBandIdx++, dummy.matrix);
      }
    }

    dummy.position.set(px, 0.12, pz);
    dummy.scale.set(w + 3.2, 0.25, d + 3.2);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    sidewalks.setMatrixAt(swIdx++, dummy.matrix);

    const roofN = h > 40 ? 2 : h > 20 ? 1 : Math.random() < 0.4 ? 1 : 0;
    for (let r = 0; r < roofN; r++) {
      dummy.position.set(px + (Math.random() - 0.5) * w * 0.4, h + 1, pz + (Math.random() - 0.5) * d * 0.4);
      dummy.scale.set(2 + Math.random() * 4, 1.2 + Math.random() * 2.5, 2 + Math.random() * 4);
      dummy.updateMatrix();
      roofs.setMatrixAt(roofIdx++, dummy.matrix);
    }

    if (h > 28 && Math.random() < 0.45) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4 + Math.random() * 5, 5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      antenna.position.set(px, h + 3, pz);
      group.add(antenna);
    }

    if ((dist.name === "neon" || dist.name === "commercial") && Math.random() < 0.55) {
      const neonMat = new THREE.MeshBasicMaterial({ color: dist.neon, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false });
      const neonH = Math.min(h * 0.55, 22);
      const neon = new THREE.Mesh(new THREE.BoxGeometry(0.22, neonH, 0.35), neonMat);
      neon.position.set(px + w * 0.52, Math.min(h * 0.42, 14), pz);
      group.add(neon);
      if (Math.random() < 0.5) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.28, 0.2), neonMat.clone());
        band.position.set(px, Math.min(h * 0.65, 22), pz + d * 0.51);
        group.add(band);
      }
    }
  }

  buildings.count = idx; buildings.instanceMatrix.needsUpdate = true;
  buildingsB.count = idxB; buildingsB.instanceMatrix.needsUpdate = true;
  sidewalks.count = swIdx; sidewalks.instanceMatrix.needsUpdate = true;
  roofs.count = roofIdx; roofs.instanceMatrix.needsUpdate = true;
  facadeBands.count = facadeBandIdx; facadeBands.instanceMatrix.needsUpdate = true;
  facadeCorners.count = facadeCornerIdx; facadeCorners.instanceMatrix.needsUpdate = true;
  group.add(buildings, buildingsB, sidewalks, roofs, facadeBands, facadeCorners);

  buildCentralPlaza(group, occ, makeTree);

  const sidewalkSlots = [];
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const sides = [{ x: p.x - p.w / 2 - 2.2, z: p.z }, { x: p.x + p.w / 2 + 2.2, z: p.z }, { x: p.x, z: p.z - p.d / 2 - 2.2 }, { x: p.x, z: p.z + p.d / 2 + 2.2 }];
    const side = sides[i % 4];
    if (Math.abs(side.x) < PLAZA_R && Math.abs(side.z) < PLAZA_R) continue;
    if (isOnRoad(side.x, side.z)) continue;
    if (!occ.tryAdd(side.x, side.z, 3.5)) continue;
    sidewalkSlots.push(side);
  }

  const kioskColors = [0xe07020, 0x2080c0, 0xc02050, 0x40a060, 0x9060c0];
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
    const cycle = ((now || 0) % 240000) / 240000;
    const autoNight = THREE.MathUtils.smoothstep(Math.max(0, Math.sin((cycle - 0.25) * Math.PI * 2)), 0.05, 0.82);
    const night = Number.isFinite(nightF) ? THREE.MathUtils.clamp(nightF, 0, 1) : autoNight;
    setNight(night);
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
