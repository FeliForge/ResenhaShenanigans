// @ts-nocheck
import * as THREE from "three";
import { makeBuildingTextures } from "@/lib/gameTexture";
import { FIXED_BILLBOARD_IMAGES } from "@/lib/game/fixedBillboardImages";
import { buildCentralPlaza } from "@/lib/game/buildCityPlaza";
import { addCityDecor } from "@/lib/game/buildCityDecor";

const DISTRICTS = [
  { name: "residential", colors: [0x7a8a7a, 0x8a9a8a, 0x6a7a6a], minH: 8, maxH: 22, neon: 0x88ccaa, tallChance: 0.05 },
  { name: "commercial", colors: [0x7a8490, 0x909aa6, 0x5a6470], minH: 14, maxH: 36, neon: 0x00e5ff, tallChance: 0.12 },
  { name: "industrial", colors: [0x8a7a5a, 0x6f6450, 0x7a6a52], minH: 10, maxH: 28, neon: 0xff7b00, tallChance: 0.04 },
  { name: "neon", colors: [0x4a3a6a, 0x5a4a7a, 0x3a2a5a], minH: 16, maxH: 42, neon: 0xd500f9, tallChance: 0.15 },
  { name: "suburb", colors: [0x9a8a7a, 0xaa9a8a, 0x8a7a6a], minH: 6, maxH: 16, neon: 0xffcc66, tallChance: 0.02 },
];

function pickHeight(dist) {
  const r = Math.random();
  if (r < 0.42) return dist.minH + Math.random() * Math.min(12, dist.maxH - dist.minH) * 0.5;
  if (r < 0.78) return dist.minH + (dist.maxH - dist.minH) * (0.35 + Math.random() * 0.35);
  if (r < 0.92 || Math.random() > dist.tallChance) return dist.minH + (dist.maxH - dist.minH) * (0.55 + Math.random() * 0.35);
  return dist.maxH + 10 + Math.random() * 35;
}

function isOnRoad(x, z) {
  const near = (v) => { const m = ((v % 56) + 56) % 56; return m < 7 || m > 49; };
  return near(x) || near(z);
}

function makeTree() {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 3.5 + Math.random() * 1.5, 5),
    new THREE.MeshStandardMaterial({ color: 0x5a3a22, flatShading: true })
  );
  trunk.position.y = 2; trunk.castShadow = true;
  const leafColor = [0x2e7d32, 0x388e3c, 0x1b5e20, 0x4caf50][Math.floor(Math.random() * 4)];
  const fol = new THREE.Mesh(
    new THREE.ConeGeometry(1.8 + Math.random() * 1.2, 4 + Math.random() * 2, 6),
    new THREE.MeshStandardMaterial({ color: leafColor, flatShading: true })
  );
  fol.position.y = 5.5; fol.castShadow = true;
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

export function buildCity(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const occ = Occupancy(4);

  const { map, emissive } = makeBuildingTextures();
  const buildingMat = new THREE.MeshStandardMaterial({
    map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0.8,
    flatShading: true, roughness: 0.85, metalness: 0.05,
  });
  const altMat = new THREE.MeshStandardMaterial({ color: 0x6a7580, flatShading: true, roughness: 0.88 });

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const placed = [];

  const COLS = 15, COUNT = 175;
  const buildings = new THREE.InstancedMesh(boxGeo, buildingMat, COUNT);
  buildings.castShadow = true; buildings.receiveShadow = true;
  const buildingsB = new THREE.InstancedMesh(boxGeo, altMat, 80);
  buildingsB.castShadow = true; buildingsB.receiveShadow = true;
  let idxB = 0;

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9a9ca0, roughness: 0.95, flatShading: true });
  const sidewalks = new THREE.InstancedMesh(boxGeo, sidewalkMat, COUNT + 40);
  sidewalks.receiveShadow = true;

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.8, flatShading: true });
  const roofs = new THREE.InstancedMesh(boxGeo, roofMat, COUNT * 2);
  roofs.castShadow = true;

  const parkSlots = new Set(["2,1", "-3,2", "4,-2", "-1,-4", "5,3", "-5,0", "0,4", "3,-5"]);
  let idx = 0, swIdx = 0, roofIdx = 0;
  const PLAZA_R = 58;

  for (let i = 0; i < COUNT; i++) {
    const gx = (i % COLS) - 7;
    const gz = Math.floor(i / COLS) - 5;
    const px = gx * 56 + (Math.random() * 10 - 5);
    const pz = gz * 56 + (Math.random() * 10 - 5);
    if (Math.abs(px) < PLAZA_R && Math.abs(pz) < PLAZA_R) continue;

    const slotKey = `${gx},${gz}`;
    if (parkSlots.has(slotKey) || (Math.abs(gx) > 2 && Math.random() < 0.08)) {
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(22 + Math.random() * 10, 0.35, 22 + Math.random() * 10),
        new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.95, flatShading: true })
      );
      grass.position.set(px, 0.15, pz); grass.receiveShadow = true; group.add(grass);
      for (let t = 0; t < 2 + Math.floor(Math.random() * 3); t++) {
        const tree = makeTree();
        const tx = px + (Math.random() - 0.5) * 14;
        const tz = pz + (Math.random() - 0.5) * 14;
        if (!occ.tryAdd(tx, tz, 3)) continue;
        tree.position.set(tx, 0, tz);
        group.add(tree);
      }
      continue;
    }

    const distIdx = Math.abs(gx) + Math.abs(gz) < 3 ? 1 : Math.abs(gx) > 5 ? 4 : Math.abs(gz) > 4 ? 2 : (Math.abs(gx) + Math.abs(gz)) % 5;
    const dist = DISTRICTS[distIdx] || DISTRICTS[0];
    let w, d;
    if (dist.name === "industrial") { w = 20 + Math.random() * 22; d = 14 + Math.random() * 18; }
    else if (dist.name === "suburb" || dist.name === "residential") { w = 10 + Math.random() * 12; d = 10 + Math.random() * 12; }
    else { w = 14 + Math.random() * 16; d = 14 + Math.random() * 16; }
    const h = pickHeight(dist);

    dummy.position.set(px, h / 2, pz);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, Math.random() * 0.08, 0);
    dummy.updateMatrix();
    if (Math.random() < 0.28 && idxB < 80) buildingsB.setMatrixAt(idxB++, dummy.matrix);
    else if (idx < COUNT) buildings.setMatrixAt(idx++, dummy.matrix);
    placed.push({ x: px, z: pz, w, d, h });
    occ.tryAdd(px, pz, Math.max(w, d) * 0.55);

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

    if (h > 28 && Math.random() < 0.4) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4 + Math.random() * 4, 5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      antenna.position.set(px, h + 3, pz); group.add(antenna);
    }
    if ((dist.name === "neon" || dist.name === "commercial") && Math.random() < 0.3) {
      const neonMat = new THREE.MeshBasicMaterial({ color: dist.neon, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
      const neon = new THREE.Mesh(new THREE.BoxGeometry(0.2, Math.min(h * 0.5, 18), 0.3), neonMat);
      neon.position.set(px + w * 0.52, Math.min(h * 0.4, 12), pz); group.add(neon);
    }
  }

  buildings.count = idx; buildings.instanceMatrix.needsUpdate = true;
  buildingsB.count = idxB; buildingsB.instanceMatrix.needsUpdate = true;
  sidewalks.count = swIdx; sidewalks.instanceMatrix.needsUpdate = true;
  roofs.count = roofIdx; roofs.instanceMatrix.needsUpdate = true;
  group.add(buildings, buildingsB, sidewalks, roofs);

  // Plaza central detallada
  buildCentralPlaza(group, occ, makeTree);

  // Sidewalk props (ordered, outside plaza)
  const sidewalkSlots = [];
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const sides = [
      { x: p.x - p.w / 2 - 2.2, z: p.z },
      { x: p.x + p.w / 2 + 2.2, z: p.z },
      { x: p.x, z: p.z - p.d / 2 - 2.2 },
      { x: p.x, z: p.z + p.d / 2 + 2.2 },
    ];
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
    m.castShadow = true; m.receiveShadow = true;
    m.position.set(x, 0.75, z);
    group.add(m);
    crates.push({ mesh: m, health: 50, respawnAt: 0 });
  }

  const { billboards } = addCityDecor(group, occ, PLAZA_R);

  const p1 = new THREE.PointLight(0x00e5ff, 0.35, 120); p1.position.set(0, 30, 0);
  const p2 = new THREE.PointLight(0xd500f9, 0.28, 120); p2.position.set(60, 30, 60);
  group.add(p1, p2);

  const neons = [];
  group.traverse((o) => {
    if (o.material && o.material.blending === THREE.AdditiveBlending) {
      neons.push({ mat: o.material, base: o.material.opacity || 0.7, phase: Math.random() * 10 });
    }
  });

  function setNight(nightF) {
    for (const n of neons) {
      n.mat.opacity = n.base * (0.35 + 0.65 * nightF);
    }
  }

  function update(now, nightF) {
    for (const n of neons) {
      const flick = 0.7 + 0.3 * Math.sin(now * 0.004 + n.phase) + (Math.random() < 0.02 ? -0.4 : 0);
      n.mat.opacity = n.base * (0.35 + 0.65 * nightF) * flick;
    }
    for (const c of crates) {
      if (c.respawnAt > 0 && now > c.respawnAt) {
        c.mesh.visible = true; c.health = 50; c.respawnAt = 0;
      }
    }
  }

  function dispose() {
    scene.remove(group);
    boxGeo.dispose(); buildingMat.dispose(); map.dispose(); emissive.dispose();
    altMat.dispose(); sidewalkMat.dispose(); roofMat.dispose();
    for (const b of billboards) { b.mat.map?.dispose(); b.mat.dispose(); }
  }

  const colliders = placed.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d }));
  // Fuente central: base circular (~r 8) aproximada con AABB + pedestal
  colliders.push({ x: 0, z: 0, w: 15.5, d: 15.5 }); // base / pileta
  colliders.push({ x: 0, z: 0, w: 3.6, d: 3.6 });   // pedestal central
  return { group, crates, neons, colliders, billboards, setNight, update, dispose };
}
