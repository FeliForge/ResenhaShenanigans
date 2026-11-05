// @ts-nocheck
import * as THREE from "three";
import { makeBuildingTextures } from "@/lib/gameTexture";

// Ciudad con más variedad: pocos rascacielos, muchos bajos/medios,
// plazas, mercados, obras, props urbanos y vegetación.

const DISTRICTS = [
  { name: "residential", colors: [0x7a8a7a, 0x8a9a8a, 0x6a7a6a], minH: 8, maxH: 22, neon: 0x88ccaa, tallChance: 0.05 },
  { name: "commercial", colors: [0x7a8490, 0x909aa6, 0x5a6470], minH: 14, maxH: 36, neon: 0x00e5ff, tallChance: 0.12 },
  { name: "industrial", colors: [0x8a7a5a, 0x6f6450, 0x7a6a52], minH: 10, maxH: 28, neon: 0xff7b00, tallChance: 0.04 },
  { name: "neon", colors: [0x4a3a6a, 0x5a4a7a, 0x3a2a5a], minH: 16, maxH: 42, neon: 0xd500f9, tallChance: 0.15 },
  { name: "suburb", colors: [0x9a8a7a, 0xaa9a8a, 0x8a7a6a], minH: 6, maxH: 16, neon: 0xffcc66, tallChance: 0.02 },
];

function pickHeight(dist) {
  const r = Math.random();
  // Distribución sesgada a bajos/medios — pocos altos
  if (r < 0.42) return dist.minH + Math.random() * Math.min(12, dist.maxH - dist.minH) * 0.5;
  if (r < 0.78) return dist.minH + (dist.maxH - dist.minH) * (0.35 + Math.random() * 0.35);
  if (r < 0.92 || Math.random() > dist.tallChance) return dist.minH + (dist.maxH - dist.minH) * (0.55 + Math.random() * 0.35);
  // Raro: torre
  return dist.maxH + 10 + Math.random() * 35;
}

function makeBillboardTex(label) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0e1118"; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = "#2a3040"; x.lineWidth = 8; x.strokeRect(6, 6, 500, 244);
  x.fillStyle = "#3a4252"; x.font = "bold 44px sans-serif"; x.textAlign = "center";
  x.fillText(label, 256, 120);
  x.fillStyle = "#5a6272"; x.font = "22px sans-serif";
  x.fillText("Sube tu PNG", 256, 168);
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

  // Materiales alternos por distrito (rompe la uniformidad visual)
  const altMats = [
    new THREE.MeshStandardMaterial({ color: 0x6a7580, flatShading: true, roughness: 0.88, metalness: 0.04 }),
    new THREE.MeshStandardMaterial({ color: 0x7a6a58, flatShading: true, roughness: 0.9, metalness: 0.03 }),
    new THREE.MeshStandardMaterial({ color: 0x5a4a6a, flatShading: true, roughness: 0.86, metalness: 0.06 }),
    new THREE.MeshStandardMaterial({ color: 0x6a7a6a, flatShading: true, roughness: 0.9, metalness: 0.02 }),
  ];

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const placed = [];

  const COLS = 15;
  const COUNT = 175;
  const buildings = new THREE.InstancedMesh(boxGeo, buildingMat, COUNT);
  buildings.castShadow = true;
  buildings.receiveShadow = true;

  // Segunda malla de edificios con material distinto (variedad)
  const buildingsB = new THREE.InstancedMesh(boxGeo, altMats[0], 80);
  buildingsB.castShadow = true;
  buildingsB.receiveShadow = true;
  let idxB = 0;

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9a9ca0, roughness: 0.95, flatShading: true });
  const sidewalks = new THREE.InstancedMesh(boxGeo, sidewalkMat, COUNT + 40);
  sidewalks.receiveShadow = true;

  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.8, flatShading: true });
  const roofs = new THREE.InstancedMesh(boxGeo, roofMat, COUNT * 2);
  roofs.castShadow = true;

  // Plazas / huecos sin edificio (parques)
  const parkSlots = new Set(["2,1", "-3,2", "4,-2", "-1,-4", "5,3", "-5,0", "0,4", "3,-5"]);

  let idx = 0, swIdx = 0, roofIdx = 0;

  for (let i = 0; i < COUNT; i++) {
    const gx = (i % COLS) - 7;
    const gz = Math.floor(i / COLS) - 5;
    const px = gx * 56 + (Math.random() * 10 - 5);
    const pz = gz * 56 + (Math.random() * 10 - 5);
    if (Math.abs(px) < 34 && Math.abs(pz) < 34) continue;

    const slotKey = `${gx},${gz}`;
    // Parques: no edificio, solo “césped” bajo
    if (parkSlots.has(slotKey) || (Math.abs(gx) > 2 && Math.random() < 0.08)) {
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(22 + Math.random() * 10, 0.35, 22 + Math.random() * 10),
        new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.95, flatShading: true })
      );
      grass.position.set(px, 0.15, pz);
      grass.receiveShadow = true;
      group.add(grass);
      // 2–4 árboles en el parque
      const nTrees = 2 + Math.floor(Math.random() * 3);
      for (let t = 0; t < nTrees; t++) {
        const tree = makeTree();
        tree.position.set(px + (Math.random() - 0.5) * 14, 0, pz + (Math.random() - 0.5) * 14);
        group.add(tree);
      }
      // banca
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: 0x6a4a2a }));
      bench.position.set(px + 4, 0.4, pz + 3);
      group.add(bench);
      continue;
    }

    const distIdx = Math.abs(gx) + Math.abs(gz) < 3 ? 1
      : Math.abs(gx) > 5 ? 4
      : Math.abs(gz) > 4 ? 2
      : (Math.abs(gx) + Math.abs(gz)) % 5;
    const dist = DISTRICTS[distIdx] || DISTRICTS[0];

    // Footprint: residencial más estrecho, industrial más ancho
    let w, d;
    if (dist.name === "industrial") {
      w = 20 + Math.random() * 22;
      d = 14 + Math.random() * 18;
    } else if (dist.name === "suburb" || dist.name === "residential") {
      w = 10 + Math.random() * 12;
      d = 10 + Math.random() * 12;
    } else {
      w = 14 + Math.random() * 16;
      d = 14 + Math.random() * 16;
    }
    const h = pickHeight(dist);

    dummy.position.set(px, h / 2, pz);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, Math.random() * 0.08, 0);
    dummy.updateMatrix();

    // Alternar material instanced A/B
    if (Math.random() < 0.28 && idxB < 80) {
      buildingsB.setMatrixAt(idxB++, dummy.matrix);
    } else if (idx < COUNT) {
      buildings.setMatrixAt(idx++, dummy.matrix);
    }

    placed.push({ x: px, z: pz, w, d, h });

    // Banqueta
    dummy.position.set(px, 0.12, pz);
    dummy.scale.set(w + 3.2, 0.25, d + 3.2);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    sidewalks.setMatrixAt(swIdx++, dummy.matrix);

    // Azotea: 0–2 volúmenes según altura
    const roofN = h > 40 ? 2 : h > 20 ? 1 : Math.random() < 0.4 ? 1 : 0;
    for (let r = 0; r < roofN; r++) {
      const rw = 2 + Math.random() * 4;
      const rd = 2 + Math.random() * 4;
      const rh = 1.2 + Math.random() * 2.5;
      dummy.position.set(
        px + (Math.random() - 0.5) * (w * 0.4),
        h + rh / 2,
        pz + (Math.random() - 0.5) * (d * 0.4)
      );
      dummy.scale.set(rw, rh, rd);
      dummy.updateMatrix();
      roofs.setMatrixAt(roofIdx++, dummy.matrix);
    }

    // Antena solo en edificios medios/altos
    if (h > 28 && Math.random() < 0.45) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4 + Math.random() * 4, 5),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      antenna.position.set(px, h + 3, pz);
      group.add(antenna);
      if (Math.random() < 0.5) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff3333 })
        );
        beacon.position.set(px, h + 5.5, pz);
        group.add(beacon);
      }
    }

    // Neón lateral en distrito neon/commercial
    if ((dist.name === "neon" || dist.name === "commercial") && Math.random() < 0.35) {
      const neonMat = new THREE.MeshBasicMaterial({
        color: dist.neon, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const neon = new THREE.Mesh(new THREE.BoxGeometry(0.2, Math.min(h * 0.5, 18), 0.3), neonMat);
      neon.position.set(px + w * 0.52, Math.min(h * 0.4, 12), pz);
      group.add(neon);
    }
  }

  buildings.count = idx;
  buildings.instanceMatrix.needsUpdate = true;
  buildingsB.count = idxB;
  buildingsB.instanceMatrix.needsUpdate = true;
  sidewalks.count = swIdx;
  sidewalks.instanceMatrix.needsUpdate = true;
  roofs.count = roofIdx;
  roofs.instanceMatrix.needsUpdate = true;
  group.add(buildings, buildingsB, sidewalks, roofs);

  // —— Obras / andamios (cajas apiladas bajas) ——
  const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, flatShading: true, roughness: 0.9 });
  for (let s = 0; s < 6; s++) {
    const sx = (Math.random() - 0.5) * 400;
    const sz = (Math.random() - 0.5) * 400;
    if (Math.abs(sx) < 40 && Math.abs(sz) < 40) continue;
    for (let k = 0; k < 3; k++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(3 + Math.random() * 2, 1.2, 2 + Math.random()),
        scaffoldMat
      );
      box.position.set(sx + k * 0.5, 0.6 + k * 1.2, sz + k * 0.3);
      box.castShadow = true;
      group.add(box);
    }
    // grúa simple
    if (Math.random() < 0.5) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 28, 6),
        new THREE.MeshStandardMaterial({ color: 0xccaa33 })
      );
      pole.position.set(sx, 14, sz);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(22, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xccaa33 })
      );
      arm.position.set(sx + 8, 27, sz);
      group.add(pole, arm);
    }
  }

  // —— Kioskos / puestos de mercado ——
  const kioskColors = [0xe07020, 0x2080c0, 0xc02050, 0x40a060];
  for (let k = 0; k < 10; k++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 200;
    const kx = Math.cos(ang) * r;
    const kz = Math.sin(ang) * r;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2.4, 3),
      new THREE.MeshStandardMaterial({ color: kioskColors[k % kioskColors.length], flatShading: true })
    );
    body.position.set(kx, 1.2, kz);
    body.castShadow = true;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true })
    );
    roof.position.set(kx, 3.1, kz);
    roof.rotation.y = Math.PI / 4;
    group.add(body, roof);
  }

  // —— Fuentes en plazas cercanas ——
  for (let f = 0; f < 3; f++) {
    const fx = (f - 1) * 80 + (Math.random() - 0.5) * 20;
    const fz = 50 + f * 30;
    if (Math.abs(fx) < 30 && Math.abs(fz) < 30) continue;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.5, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, flatShading: true })
    );
    base.position.set(fx, 0.3, fz);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0x4a9fd8, transparent: true, opacity: 0.7 })
    );
    water.position.set(fx, 0.7, fz);
    const spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    spout.position.set(fx, 1.8, fz);
    group.add(base, water, spout);
  }

  // —— Billboards ——
  const billboards = [];
  const bbLabels = ["Arena", "Shop", "News", "Ads"];
  bbLabels.forEach((label, i) => {
    const tex = makeBillboardTex(label);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), mat);
    const ang = (i / bbLabels.length) * Math.PI * 2;
    const br = 55 + i * 8;
    mesh.position.set(Math.cos(ang) * br, 12, Math.sin(ang) * br);
    mesh.lookAt(0, 12, 0);
    group.add(mesh);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.4), postMat);
    postL.position.set(mesh.position.x + 6, 4.5, mesh.position.z);
    const postR = postL.clone();
    postR.position.x = mesh.position.x - 6;
    group.add(postL, postR);
    billboards.push({ mesh, mat, index: i });
  });

  // —— Faroles ——
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const bulbs = [];
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const r = 36 + (i % 3) * 18 + Math.random() * 8;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7), lampMat);
    pole.position.set(x, 3.5, z); pole.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.5), lampMat);
    arm.position.set(x, 6.8, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), bulbMat.clone());
    bulb.position.set(x, 6.55, z + 0.55);
    group.add(pole, arm, bulb);
    bulbs.push(bulb);
  }

  // —— Autos ——
  const carColors = [0x55585f, 0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0xaaaaaa, 0x3a3a44, 0xc0a020];
  for (let i = 0; i < 22; i++) {
    const cg = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.6, metalness: 0.3, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), bodyMat);
    body.position.y = 0.6; body.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.7), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
    cab.position.set(-0.2, 1.3, 0);
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 6);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const wx of [-1.3, 1.3]) for (const wz of [-1, 1]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.4, wz);
      cg.add(wh);
    }
    cg.add(body, cab);
    const alongX = Math.random() > 0.5;
    const lane = (Math.floor(Math.random() * 12) - 5) * 56 + (alongX ? 0 : 28);
    const along = (Math.floor(Math.random() * 12) - 5) * 56 + (alongX ? 28 : 0);
    cg.position.set(alongX ? along : lane, 0, alongX ? lane : along);
    cg.rotation.y = alongX ? (Math.random() > 0.5 ? 0 : Math.PI) : (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    if (Math.abs(cg.position.x) < 30 && Math.abs(cg.position.z) < 30) cg.position.x += 60;
    group.add(cg);
  }

  // —— Árboles plaza central ——
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const t = makeTree();
    t.position.set(Math.cos(ang) * 22, 0, Math.sin(ang) * 22);
    group.add(t);
  }
  // Árboles extra en periferia
  for (let i = 0; i < 24; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 70 + Math.random() * 220;
    const t = makeTree();
    t.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    t.scale.setScalar(0.8 + Math.random() * 0.6);
    group.add(t);
  }

  // —— Crates ——
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, flatShading: true });
  const crates = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
    m.castShadow = true; m.receiveShadow = true;
    const ang = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 280;
    m.position.set(Math.cos(ang) * r, 0.8, Math.sin(ang) * r);
    m.rotation.y = Math.random() * Math.PI;
    group.add(m);
    crates.push({ mesh: m, health: 50, respawnAt: 0 });
  }

  // —— Props: hidrantes, bancas, basura, buzones, conos ——
  const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7, flatShading: true });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9, flatShading: true });
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.8, flatShading: true });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, flatShading: true });
  const mailboxMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, flatShading: true });
  for (let i = 0; i < 28; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 28 + Math.random() * 280;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const roll = Math.random();
    if (roll < 0.25) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 6), hydrantMat);
      h.position.set(x, 0.45, z); group.add(h);
    } else if (roll < 0.5) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.7), benchMat);
      b.position.set(x, 0.4, z); b.rotation.y = ang; group.add(b);
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

  // —— Semáforos ——
  const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const tlRed = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const tlYellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const tlGreen = new THREE.MeshBasicMaterial({ color: 0x22cc44 });
  for (let i = 0; i < 8; i++) {
    const gx = (i % 4 - 1.5) * 56;
    const gz = (Math.floor(i / 4) - 0.5) * 56;
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

  // —— Paradas de bus ——
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const r = 48 + i * 5;
    const bx = Math.cos(ang) * r, bz = Math.sin(ang) * r;
    const shelter = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.15, 2),
      new THREE.MeshStandardMaterial({ color: 0x445566 })
    );
    shelter.position.set(bx, 2.4, bz);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xaaccff, transparent: true, opacity: 0.35 })
    );
    glass.position.set(bx, 1.2, bz + 0.8);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    pole.position.set(bx - 2.2, 1.25, bz);
    group.add(shelter, glass, pole);
  }

  // Luces ambiente
  const p1 = new THREE.PointLight(0x00e5ff, 0.35, 120); p1.position.set(0, 30, 0);
  const p2 = new THREE.PointLight(0xd500f9, 0.28, 120); p2.position.set(60, 30, 60);
  group.add(p1, p2);

  const neons = [];
  const beacons = [];
  group.traverse((o) => {
    if (o.material && o.material.blending === THREE.AdditiveBlending) {
      neons.push({ mat: o.material, base: o.material.opacity || 0.7, phase: Math.random() * 10 });
    }
    if (o.material && o.material.color && o.material.color.getHex && o.material.color.getHex() === 0xff3333) {
      beacons.push(o);
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
    for (let i = 0; i < beacons.length; i++) {
      beacons[i].material.opacity = (Math.sin(now * 0.005 + i) > 0.6) ? 1 : 0.2;
      beacons[i].material.transparent = true;
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
    altMats.forEach((m) => m.dispose());
    sidewalkMat.dispose(); roofMat.dispose();
    crateMat.dispose(); hydrantMat.dispose(); benchMat.dispose(); trashMat.dispose();
    for (const b of billboards) { b.mat.map?.dispose(); b.mat.dispose(); }
  }

  const colliders = placed.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d }));

  return { group, crates, neons, colliders, billboards, setNight, update, dispose };
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
