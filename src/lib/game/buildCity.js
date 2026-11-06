// @ts-nocheck
import * as THREE from "three";
import { makeBuildingTextures } from "@/lib/gameTexture";

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

function sidewalkNear(p) {
  const side = Math.floor(Math.random() * 4);
  const margin = 1.8 + Math.random() * 1.4;
  if (side === 0) return { x: p.x - p.w / 2 - margin, z: p.z + (Math.random() - 0.5) * p.d * 0.7 };
  if (side === 1) return { x: p.x + p.w / 2 + margin, z: p.z + (Math.random() - 0.5) * p.d * 0.7 };
  if (side === 2) return { x: p.x + (Math.random() - 0.5) * p.w * 0.7, z: p.z - p.d / 2 - margin };
  return { x: p.x + (Math.random() - 0.5) * p.w * 0.7, z: p.z + p.d / 2 + margin };
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

function makeBillboardTex(label, accent) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0e1118"; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = accent || "#2a3040"; x.lineWidth = 10; x.strokeRect(6, 6, 500, 244);
  x.fillStyle = accent || "#3a4252"; x.font = "bold 48px sans-serif"; x.textAlign = "center";
  x.fillText(label, 256, 115);
  x.fillStyle = "#7a8292"; x.font = "22px sans-serif"; x.fillText("Sube tu PNG / GIF", 256, 168);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene) {
  const group = new THREE.Group();
  scene.add(group);

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

  for (let i = 0; i < COUNT; i++) {
    const gx = (i % COLS) - 7;
    const gz = Math.floor(i / COLS) - 5;
    const px = gx * 56 + (Math.random() * 10 - 5);
    const pz = gz * 56 + (Math.random() * 10 - 5);
    if (Math.abs(px) < 34 && Math.abs(pz) < 34) continue;

    const slotKey = `${gx},${gz}`;
    if (parkSlots.has(slotKey) || (Math.abs(gx) > 2 && Math.random() < 0.08)) {
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(22 + Math.random() * 10, 0.35, 22 + Math.random() * 10),
        new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.95, flatShading: true })
      );
      grass.position.set(px, 0.15, pz); grass.receiveShadow = true; group.add(grass);
      for (let t = 0; t < 2 + Math.floor(Math.random() * 3); t++) {
        const tree = makeTree();
        tree.position.set(px + (Math.random() - 0.5) * 14, 0, pz + (Math.random() - 0.5) * 14);
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

  // Obras junto a edificios
  const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, flatShading: true, roughness: 0.9 });
  for (let s = 0; s < 10; s++) {
    const bp = placed[Math.floor(Math.random() * Math.max(1, placed.length))] || { x: 100, z: 100, w: 20, d: 20 };
    const sp = sidewalkNear(bp);
    let sx = sp.x, sz = sp.z;
    if (Math.abs(sx) < 40 && Math.abs(sz) < 40) continue;
    if (isOnRoad(sx, sz)) { sx += 12; sz += 8; }
    for (let k = 0; k < 3; k++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 1.2, 2 + Math.random()), scaffoldMat);
      box.position.set(sx + k * 0.5, 0.6 + k * 1.2, sz + k * 0.3); box.castShadow = true; group.add(box);
    }
  }

  // Kioskos en banqueta
  const kioskColors = [0xe07020, 0x2080c0, 0xc02050, 0x40a060, 0x9060c0];
  for (let k = 0; k < 14; k++) {
    const bp = placed[Math.floor(Math.random() * Math.max(1, placed.length))] || { x: 80, z: 80, w: 16, d: 16 };
    let { x: kx, z: kz } = sidewalkNear(bp);
    if (Math.abs(kx) < 36 && Math.abs(kz) < 36) { kx += 50; kz += 40; }
    if (isOnRoad(kx, kz)) { kx += 8; kz += 8; }
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3), new THREE.MeshStandardMaterial({ color: kioskColors[k % 5], flatShading: true }));
    body.position.set(kx, 1.2, kz); body.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true }));
    roof.position.set(kx, 3.1, kz); roof.rotation.y = Math.PI / 4;
    group.add(body, roof);
  }

  // Billboards — more, closer, and varied
  const billboards = [];
  const bbLabels = [
    ["Arena", "#ff9620"], ["Shop", "#00e5ff"], ["News", "#d500f9"], ["Ads", "#88ccaa"],
    ["Fight", "#ff3b2f"], ["Resenha", "#ffcc66"], ["Dash", "#5a9fff"], ["Combo", "#ff66aa"],
    ["Night", "#a070ff"], ["City", "#40c080"],
  ];
  bbLabels.forEach(([label, accent], i) => {
    const tex = makeBillboardTex(label, accent);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat);
    const ang = (i / bbLabels.length) * Math.PI * 2 + 0.3;
    const br = 38 + (i % 5) * 12;
    const h = 10 + (i % 3) * 4;
    mesh.position.set(Math.cos(ang) * br, h, Math.sin(ang) * br);
    mesh.lookAt(0, h, 0);
    // post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, h - 1, 6),
      new THREE.MeshStandardMaterial({ color: 0x333840, flatShading: true })
    );
    post.position.set(mesh.position.x, (h - 1) / 2, mesh.position.z);
    group.add(mesh, post);
    billboards.push({ mesh, mat, index: i });
  });

  // Extra wall-mounted billboards on tall buildings
  for (let i = 0; i < 8; i++) {
    const bp = placed[Math.floor(Math.random() * Math.max(1, placed.length))];
    if (!bp || bp.h < 18) continue;
    const tex = makeBillboardTex(["Sale", "Live", "New", "Open"][i % 4], ["#ff6622", "#22ccff", "#ff22aa", "#88ff44"][i % 4]);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), mat);
    const side = i % 4;
    const ox = side === 0 ? -bp.w / 2 - 0.2 : side === 1 ? bp.w / 2 + 0.2 : 0;
    const oz = side === 2 ? -bp.d / 2 - 0.2 : side === 3 ? bp.d / 2 + 0.2 : 0;
    mesh.position.set(bp.x + ox, Math.min(bp.h * 0.55, 18), bp.z + oz);
    if (side === 0) mesh.rotation.y = Math.PI / 2;
    else if (side === 1) mesh.rotation.y = -Math.PI / 2;
    else if (side === 2) mesh.rotation.y = 0;
    else mesh.rotation.y = Math.PI;
    group.add(mesh);
    billboards.push({ mesh, mat, index: 100 + i });
  }

  // Faroles en bordes de manzana
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const bulbs = [];
  for (let i = 0; i < 40; i++) {
    const road = (Math.floor(i / 2) - 7) * 56;
    const along = (i % 7 - 3) * 56 + 28;
    const curb = 8.2;
    const x = i % 2 === 0 ? along : road + curb;
    const z = i % 2 === 0 ? road + curb : along;
    if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7), lampMat);
    pole.position.set(x, 3.5, z); pole.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.5), lampMat);
    arm.position.set(x, 6.8, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), bulbMat.clone());
    bulb.position.set(x, 6.55, z + 0.4);
    group.add(pole, arm, bulb);
    bulbs.push(bulb);
  }

  // Autos en el cordón
  const carColors = [0x55585f, 0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0xaaaaaa, 0x3a3a44, 0xc0a020];
  for (let i = 0; i < 30; i++) {
    const cg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), new THREE.MeshStandardMaterial({ color: carColors[i % 7], roughness: 0.6, metalness: 0.3, flatShading: true }));
    body.position.y = 0.6; body.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.7), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
    cab.position.set(-0.2, 1.3, 0);
    cg.add(body, cab);
    const alongX = Math.random() > 0.5;
    const road = (Math.floor(Math.random() * 12) - 5) * 56;
    const curb = 7.5 + Math.random() * 1.5;
    const along = (Math.floor(Math.random() * 12) - 5) * 56 + (Math.random() - 0.5) * 30;
    if (alongX) {
      cg.position.set(along, 0, road + (Math.random() > 0.5 ? curb : -curb));
      cg.rotation.y = Math.random() > 0.5 ? 0 : Math.PI;
    } else {
      cg.position.set(road + (Math.random() > 0.5 ? curb : -curb), 0, along);
      cg.rotation.y = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (Math.abs(cg.position.x) < 32 && Math.abs(cg.position.z) < 32) cg.position.x += 70;
    group.add(cg);
  }

  // Árboles plaza + más
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const t = makeTree();
    t.position.set(Math.cos(ang) * 22, 0, Math.sin(ang) * 22);
    group.add(t);
  }
  for (let i = 0; i < 36; i++) {
    const bp = placed[Math.floor(Math.random() * Math.max(1, placed.length))];
    const t = makeTree();
    if (bp) {
      const p = sidewalkNear(bp);
      t.position.set(p.x + (p.x - bp.x) * 0.15, 0, p.z + (p.z - bp.z) * 0.15);
    } else t.position.set(100, 0, 100);
    if (isOnRoad(t.position.x, t.position.z)) t.position.x += 10;
    t.scale.setScalar(0.8 + Math.random() * 0.6);
    group.add(t);
  }

  // Crates
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, flatShading: true });
  const crates = [];
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
    m.castShadow = true; m.receiveShadow = true;
    const bp = placed[i % Math.max(1, placed.length)] || { x: 70, z: 70, w: 16, d: 16 };
    let { x, z } = sidewalkNear(bp);
    if (Math.abs(x) < 34 && Math.abs(z) < 34) { x += 50; z += 30; }
    m.position.set(x, 0.8, z); m.rotation.y = Math.random() * Math.PI;
    group.add(m);
    crates.push({ mesh: m, health: 50, respawnAt: 0 });
  }

  // Props urbanos
  const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, flatShading: true });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, flatShading: true });
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, flatShading: true });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, flatShading: true });
  const mailboxMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, flatShading: true });
  for (let i = 0; i < 40; i++) {
    const bp = placed[i % Math.max(1, placed.length)] || { x: 60, z: 60, w: 14, d: 14 };
    let { x, z } = sidewalkNear(bp);
    if (Math.abs(x) < 34 && Math.abs(z) < 34) { x += 45; z += 25; }
    if (isOnRoad(x, z)) { const n = sidewalkNear(bp); x = n.x; z = n.z; }
    const roll = Math.random();
    if (roll < 0.25) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 6), hydrantMat);
      h.position.set(x, 0.45, z); group.add(h);
    } else if (roll < 0.5) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.7), benchMat);
      b.position.set(x, 0.4, z); group.add(b);
    } else if (roll < 0.7) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1, 6), trashMat);
      t.position.set(x, 0.5, z); group.add(t);
    } else if (roll < 0.85) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), coneMat);
      c.position.set(x, 0.4, z); group.add(c);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.35), mailboxMat);
      m.position.set(x, 0.55, z); group.add(m);
    }
  }

  // Semáforos
  const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const tlRed = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const tlYellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const tlGreen = new THREE.MeshBasicMaterial({ color: 0x22cc44 });
  for (let i = 0; i < 12; i++) {
    const gx = (i % 4 - 1.5) * 56 + 8;
    const gz = (Math.floor(i / 4) - 0.5) * 56 + 8;
    if (Math.abs(gx) < 30 && Math.abs(gz) < 30) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), tlPoleMat);
    pole.position.set(gx, 3, gz);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    head.position.set(gx, 6, gz);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), tlRed); r.position.set(gx, 6.45, gz + 0.22);
    const y = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), tlYellow); y.position.set(gx, 6, gz + 0.22);
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), tlGreen); g.position.set(gx, 5.55, gz + 0.22);
    group.add(pole, head, r, y, g);
  }

  // Paradas de bus
  for (let i = 0; i < 7; i++) {
    const road = (i - 3) * 56;
    const bx = Math.abs(road) < 10 ? 64 : road + 8;
    const bz = (i % 2 === 0 ? 1 : -1) * (40 + i * 12);
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 2), new THREE.MeshStandardMaterial({ color: 0x445566 }));
    shelter.position.set(bx, 2.4, bz);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2, 0.1), new THREE.MeshMaterial({ color: 0xaaccff, transparent: true, opacity: 0.35 }));
    glass.position.set(bx, 1.2, bz + 0.8);
    group.add(shelter, glass);
  }

  // Extra neon poles near center ring
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const neonMat = new THREE.MeshBasicMaterial({
      color: [0x00e5ff, 0xd500f9, 0xff9620, 0x88ff44][i % 4],
      transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const neon = new THREE.Mesh(new THREE.BoxGeometry(0.25, 10 + (i % 3) * 3, 0.25), neonMat);
    neon.position.set(Math.cos(ang) * 30, 6, Math.sin(ang) * 30);
    group.add(neon);
  }

  const p1 = new THREE.PointLight(0x00e5ff, 0.35, 120); p1.position.set(0, 30, 0);
  const p2 = new THREE.PointLight(0xd500f9, 0.28, 120); p2.position.set(60, 30, 60);
  group.add(p1, p2);

  const neons = [];
  group.traverse((o) => {
    if (o.material && o.material.blending === THREE.AdditiveBlending) {
      neons.push({ mat: o.material, base: o.material.opacity || 0.7, phase: Math.random() * 10 });
    }
  });

  let nightF = 0;
  function setNight(f) {
    nightF = f;
    buildingMat.emissiveIntensity = 0.15 + 1.8 * f;
    for (const b of bulbs) b.material.color.setHex(f > 0.4 ? 0xffe9a8 : 0xffd27a);
  }

  function update(now) {
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
  return { group, crates, neons, colliders, billboards, setNight, update, dispose };
}
