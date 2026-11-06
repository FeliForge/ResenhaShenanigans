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
  x.fillStyle = "#7a8292"; x.font = "22px sans-serif"; x.fillText("Personalizable", 256, 168);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Min-distance placement helper */
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

  // Ordered sidewalk slots from buildings (one side each)
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
    if (Math.abs(side.x) < 36 && Math.abs(side.z) < 36) continue;
    if (isOnRoad(side.x, side.z)) continue;
    if (!occ.tryAdd(side.x, side.z, 3.5)) continue;
    sidewalkSlots.push(side);
  }

  // Kiosks — take every 3rd slot
  const kioskColors = [0xe07020, 0x2080c0, 0xc02050, 0x40a060, 0x9060c0];
  let slotI = 0;
  for (let k = 0; k < 10 && slotI < sidewalkSlots.length; k++, slotI += 3) {
    const { x: kx, z: kz } = sidewalkSlots[slotI];
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 2.6), new THREE.MeshStandardMaterial({ color: kioskColors[k % 5], flatShading: true }));
    body.position.set(kx, 1.1, kz); body.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true }));
    roof.position.set(kx, 2.9, kz); roof.rotation.y = Math.PI / 4;
    group.add(body, roof);
  }

  // Scaffolds
  const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, flatShading: true, roughness: 0.9 });
  for (let s = 0; s < 6 && slotI < sidewalkSlots.length; s++, slotI += 4) {
    const { x: sx, z: sz } = sidewalkSlots[slotI];
    for (let k = 0; k < 2; k++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 1.8), scaffoldMat);
      box.position.set(sx, 0.55 + k * 1.15, sz); box.castShadow = true;
      group.add(box);
    }
  }

  // Props (bench, hydrant, trash, cone, mailbox) — ordered
  const propMats = {
    hydrant: new THREE.MeshStandardMaterial({ color: 0xcc2222, flatShading: true }),
    bench: new THREE.MeshStandardMaterial({ color: 0x6a4a2a, flatShading: true }),
    trash: new THREE.MeshStandardMaterial({ color: 0x3a4a3a, flatShading: true }),
    cone: new THREE.MeshStandardMaterial({ color: 0xff6600, flatShading: true }),
    mailbox: new THREE.MeshStandardMaterial({ color: 0x2244aa, flatShading: true }),
  };
  for (let i = 0; i < 24 && slotI < sidewalkSlots.length; i++, slotI += 1) {
    const { x, z } = sidewalkSlots[slotI];
    const roll = i % 5;
    if (roll === 0) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 6), propMats.hydrant);
      h.position.set(x, 0.45, z); group.add(h);
    } else if (roll === 1) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.65), propMats.bench);
      b.position.set(x, 0.4, z); group.add(b);
    } else if (roll === 2) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1, 6), propMats.trash);
      t.position.set(x, 0.5, z); group.add(t);
    } else if (roll === 3) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 6), propMats.cone);
      c.position.set(x, 0.38, z); group.add(c);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.0, 0.32), propMats.mailbox);
      m.position.set(x, 0.5, z); group.add(m);
    }
  }

  // Crates
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, flatShading: true });
  const crates = [];
  for (let i = 0; i < 12 && slotI < sidewalkSlots.length; i++, slotI += 2) {
    const { x, z } = sidewalkSlots[slotI];
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMat);
    m.castShadow = true; m.receiveShadow = true;
    m.position.set(x, 0.75, z);
    group.add(m);
    crates.push({ mesh: m, health: 50, respawnAt: 0 });
  }

  // ========== BILLBOARDS (personalizable slots) ==========
  // 8 freestanding, evenly spaced ring — all accept player images via applyBillboard
  const billboards = [];
  const bbLabels = [
    ["Arena", "#ff9620"], ["Shop", "#00e5ff"], ["News", "#d500f9"], ["Ads", "#88ccaa"],
    ["Fight", "#ff3b2f"], ["Resenha", "#ffcc66"], ["Dash", "#5a9fff"], ["Combo", "#ff66aa"],
  ];
  const BB_R = 48;
  bbLabels.forEach(([label, accent], i) => {
    const tex = makeBillboardTex(label, accent);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), mat);
    const ang = (i / bbLabels.length) * Math.PI * 2;
    const h = 11;
    const bx = Math.cos(ang) * BB_R;
    const bz = Math.sin(ang) * BB_R;
    mesh.position.set(bx, h, bz);
    mesh.lookAt(0, h, 0);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, h - 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x333840, flatShading: true })
    );
    post.position.set(bx, (h - 0.5) / 2, bz);
    // small base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2e36, flatShading: true })
    );
    base.position.set(bx, 0.2, bz);
    group.add(mesh, post, base);
    occ.tryAdd(bx, bz, 5);
    billboards.push({ mesh, mat, index: i });
  });

  // 4 wall-mounted on tall buildings (also personalizable)
  const tall = placed.filter((p) => p.h >= 20).sort((a, b) => b.h - a.h).slice(0, 8);
  const wallLabels = [["Sale", "#ff6622"], ["Live", "#22ccff"], ["New", "#ff22aa"], ["Open", "#88ff44"]];
  for (let i = 0; i < 4 && i < tall.length; i++) {
    const bp = tall[i];
    const tex = makeBillboardTex(wallLabels[i][0], wallLabels[i][1]);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), mat);
    // face toward center
    const toward = new THREE.Vector3(-bp.x, 0, -bp.z).normalize();
    const ox = toward.x * (bp.w / 2 + 0.15);
    const oz = toward.z * (bp.d / 2 + 0.15);
    const hy = Math.min(bp.h * 0.5, 16);
    mesh.position.set(bp.x + ox, hy, bp.z + oz);
    mesh.lookAt(bp.x + ox * 2, hy, bp.z + oz * 2);
    // flip so front faces center
    mesh.lookAt(0, hy, 0);
    group.add(mesh);
    billboards.push({ mesh, mat, index: 8 + i });
  }

  // Street lamps — grid on curbs
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const bulbs = [];
  for (let gi = -6; gi <= 6; gi++) {
    for (let side = 0; side < 2; side++) {
      const road = gi * 56;
      const curb = side === 0 ? 8.5 : -8.5;
      // along X roads
      for (let a = -5; a <= 5; a++) {
        if (a === 0) continue;
        const x = a * 56 + 28;
        const z = road + curb;
        if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;
        if (!occ.tryAdd(x, z, 2.5)) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 7), lampMat);
        pole.position.set(x, 3.5, z); pole.castShadow = true;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), bulbMat.clone());
        bulb.position.set(x, 6.6, z);
        group.add(pole, bulb);
        bulbs.push(bulb);
      }
    }
  }

  // Cars on curb — fixed lanes
  const carColors = [0x55585f, 0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0xaaaaaa, 0x3a3a44, 0xc0a020];
  let carN = 0;
  for (let gi = -5; gi <= 5 && carN < 20; gi++) {
    if (gi === 0) continue;
    const road = gi * 56;
    for (const curb of [7.8, -7.8]) {
      if (carN >= 20) break;
      const along = (gi % 2 === 0 ? 1 : -1) * (20 + (carN % 3) * 18);
      let x, z, rot;
      if (Math.abs(gi) % 2 === 0) {
        x = along; z = road + curb; rot = curb > 0 ? 0 : Math.PI;
      } else {
        x = road + curb; z = along; rot = curb > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      if (Math.abs(x) < 34 && Math.abs(z) < 34) continue;
      if (!occ.tryAdd(x, z, 3)) continue;
      const cg = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.15, 1.9), new THREE.MeshStandardMaterial({ color: carColors[carN % 7], roughness: 0.6, metalness: 0.3, flatShading: true }));
      body.position.y = 0.58; body.castShadow = true;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 1.6), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
      cab.position.set(-0.15, 1.25, 0);
      cg.add(body, cab);
      cg.position.set(x, 0, z);
      cg.rotation.y = rot;
      group.add(cg);
      carN++;
    }
  }

  // Plaza trees — ring
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const tx = Math.cos(ang) * 22;
    const tz = Math.sin(ang) * 22;
    if (!occ.tryAdd(tx, tz, 3)) continue;
    const t = makeTree();
    t.position.set(tx, 0, tz);
    group.add(t);
  }

  // Traffic lights at corners
  const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const tlRed = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const tlYellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const tlGreen = new THREE.MeshBasicMaterial({ color: 0x22cc44 });
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      if (ix === 0 && iz === 0) continue;
      const gx = ix * 56 + 8;
      const gz = iz * 56 + 8;
      if (Math.abs(gx) < 30 && Math.abs(gz) < 30) continue;
      if (!occ.tryAdd(gx, gz, 2)) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), tlPoleMat);
      pole.position.set(gx, 3, gz);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.3, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      head.position.set(gx, 6, gz);
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), tlRed); r.position.set(gx, 6.4, gz + 0.2);
      const y = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), tlYellow); y.position.set(gx, 6, gz + 0.2);
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), tlGreen); g.position.set(gx, 5.6, gz + 0.2);
      group.add(pole, head, r, y, g);
    }
  }

  // Bus stops
  for (let i = 0; i < 5; i++) {
    const road = (i - 2) * 56;
    if (Math.abs(road) < 20) continue;
    const bx = road + 9;
    const bz = (i % 2 === 0 ? 1 : -1) * 48;
    if (!occ.tryAdd(bx, bz, 4)) continue;
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 1.8), new THREE.MeshStandardMaterial({ color: 0x445566 }));
    shelter.position.set(bx, 2.3, bz);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 0.08), new THREE.MeshStandardMaterial({ color: 0xaaccff, transparent: true, opacity: 0.35 }));
    glass.position.set(bx, 1.15, bz + 0.7);
    group.add(shelter, glass);
  }

  // Neon poles — even ring
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.2;
    const nx = Math.cos(ang) * 32;
    const nz = Math.sin(ang) * 32;
    if (!occ.tryAdd(nx, nz, 2.5)) continue;
    const neonMat = new THREE.MeshBasicMaterial({
      color: [0x00e5ff, 0xd500f9, 0xff9620, 0x88ff44, 0xff66aa, 0x5a9fff][i],
      transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const neon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9, 0.22), neonMat);
    neon.position.set(nx, 5, nz);
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
