// @ts-nocheck
import * as THREE from "three";
import { makeBuildingTextures } from "@/lib/gameTexture";

// Ciudad procedural low-poly más detallada: grilla de calles, banquetas,
// edificios instanciados con detalles de azotea, antenas, neón, faroles,
// autos variados, árboles, hidrantes, bancas, botes de basura y semáforos.

const DISTRICTS = [
  { name: "downtown", colors: [0x6f7d8c, 0x8d99a6, 0x5a6675], minH: 40, maxH: 95, neon: 0x00e5ff },
  { name: "industrial", colors: [0x8a7a5a, 0x6f6450, 0x7a6a52], minH: 18, maxH: 45, neon: 0xff7b00 },
  { name: "neon", colors: [0x4a3a6a, 0x5a4a7a, 0x3a2a5a], minH: 25, maxH: 70, neon: 0xd500f9 },
];

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

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const placed = [];

  const COLS = 15;
  const COUNT = 165;
  const buildings = new THREE.InstancedMesh(boxGeo, buildingMat, COUNT);
  buildings.castShadow = true;
  buildings.receiveShadow = true;

  // Banquetas instanciadas (base más clara alrededor de cada edificio)
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9a9ca0, roughness: 0.95, flatShading: true });
  const sidewalks = new THREE.InstancedMesh(boxGeo, sidewalkMat, COUNT);
  sidewalks.receiveShadow = true;

  // Detalles de azotea instanciados (cajas pequeñas: AC, tanques)
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.8, flatShading: true });
  const roofs = new THREE.InstancedMesh(boxGeo, roofMat, COUNT * 2);
  roofs.castShadow = true;

  let idx = 0, swIdx = 0, roofIdx = 0;

  for (let i = 0; i < COUNT; i++) {
    const gx = (i % COLS) - 7;
    const gz = Math.floor(i / COLS) - 5;
    const px = gx * 56 + (Math.random() * 10 - 5);
    const pz = gz * 56 + (Math.random() * 10 - 5);
    if (Math.abs(px) < 34 && Math.abs(pz) < 34) continue;
    const dist = DISTRICTS[Math.abs(gx) > 3 || Math.abs(gz) > 2 ? (Math.abs(gz) % 3) : (Math.abs(gx) % 3)] || DISTRICTS[0];
    const w = 16 + Math.random() * 16;
    const d = 16 + Math.random() * 16;
    const h = dist.minH + Math.random() * (dist.maxH - dist.minH);

    // edificio
    dummy.position.set(px, h / 2, pz);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, Math.random() * 0.2 - 0.1, 0);
    dummy.updateMatrix();
    buildings.setMatrixAt(idx, dummy.matrix);
    buildings.setColorAt(idx, new THREE.Color(dist.colors[Math.floor(Math.random() * dist.colors.length)]));

    // banqueta
    dummy.position.set(px, 0.3, pz);
    dummy.scale.set(w + 5, 0.6, d + 5);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    sidewalks.setMatrixAt(swIdx, dummy.matrix);
    swIdx++;

    // detalles de azotea (1-2 cajas)
    const rc = 1 + Math.floor(Math.random() * 2);
    for (let r = 0; r < rc && roofIdx < COUNT * 2; r++) {
      const rw = 2 + Math.random() * 4;
      const rh = 1 + Math.random() * 3;
      dummy.position.set(px + (Math.random() - 0.5) * (w - rw - 2), h + rh / 2, pz + (Math.random() - 0.5) * (d - rw - 2));
      dummy.scale.set(rw, rh, rw);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      roofs.setMatrixAt(roofIdx, dummy.matrix);
      roofIdx++;
    }

    placed.push({ x: px, z: pz, w, d, h, dist });
    idx++;
  }
  buildings.count = idx; buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  sidewalks.count = swIdx; sidewalks.instanceMatrix.needsUpdate = true;
  roofs.count = roofIdx; roofs.instanceMatrix.needsUpdate = true;
  group.add(buildings, sidewalks, roofs);

  // Antenas en edificios altos + luz roja parpadeante
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });
  const antennaGeo = new THREE.CylinderGeometry(0.08, 0.12, 1, 5);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const beacons = [];
  for (const p of placed) {
    if (p.h > 58 && Math.random() < 0.45) {
      const ant = new THREE.Mesh(antennaGeo, antennaMat);
      ant.position.set(p.x, p.h + 3, p.z);
      ant.scale.y = 6;
      group.add(ant);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), beaconMat);
      b.position.set(p.x, p.h + 6.2, p.z);
      group.add(b);
      beacons.push(b);
    }
  }

  // Neón: planos emisivos en algunos edificios
  const neons = [];
  for (let i = 0; i < 26; i++) {
    const b = placed[Math.floor(Math.random() * placed.length)];
    if (!b) continue;
    const color = b.dist.neon;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.8, 1.2), mat);
    const face = Math.random() > 0.5 ? 1 : -1;
    strip.position.set(b.x + face * (b.w / 2 + 0.1), 6 + Math.random() * (b.h - 12), b.z);
    strip.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(strip);
    neons.push({ mesh: strip, mat, base: 0.95, phase: Math.random() * Math.PI * 2 });
  }

  // Billboards con placeholder (4 alrededor de la plaza)
  const billboards = [];
  const bPositions = [{ x: 30, z: 0 }, { x: -30, z: 0 }, { x: 0, z: 30 }, { x: 0, z: -30 }];
  bPositions.forEach((p, i) => {
    const tex = makeBillboardTex(`BILLBOARD ${i + 1}`);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), mat);
    mesh.position.set(p.x, 9, p.z);
    mesh.rotation.y = Math.atan2(-p.x, -p.z);
    group.add(mesh);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.4), postMat);
    postL.position.set(p.x + Math.cos(mesh.rotation.y) * 7, 4.5, p.z + Math.sin(mesh.rotation.y) * 7);
    const postR = postL.clone();
    postR.position.x = p.x - Math.cos(mesh.rotation.y) * 7;
    postR.position.z = p.z - Math.sin(mesh.rotation.y) * 7;
    group.add(postL, postR);
    billboards.push({ mesh, mat, index: i });
  });

  // Faroles a lo largo de las calles
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const bulbs = [];
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const r = 38 + Math.random() * 12;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7), lampMat);
    pole.position.set(x, 3.5, z); pole.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.6), lampMat);
    arm.position.set(x, 6.8, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), bulbMat.clone());
    bulb.position.set(x, 6.6, z + 0.6);
    group.add(pole, arm, bulb);
    bulbs.push(bulb);
  }

  // Autos variados aparcados a lo largo de las calles
  const carColors = [0x55585f, 0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0xaaaaaa, 0x3a3a44];
  const cars = [];
  for (let i = 0; i < 16; i++) {
    const cg = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.6, metalness: 0.3, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), bodyMat);
    body.position.y = 0.6; body.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.7), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
    cab.position.set(-0.2, 1.3, 0);
    // ruedas
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const wx of [-1.3, 1.3]) for (const wz of [-1, 1]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.4, wz);
      cg.add(wh);
    }
    cg.add(body, cab);
    // alinear a una calle
    const alongX = Math.random() > 0.5;
    const lane = (Math.floor(Math.random() * 12) - 5) * 56 + (alongX ? 0 : 28);
    const along = (Math.floor(Math.random() * 12) - 5) * 56 + (alongX ? 28 : 0);
    cg.position.set(alongX ? along : lane, 0, alongX ? lane : along);
    cg.rotation.y = alongX ? (Math.random() > 0.5 ? 0 : Math.PI) : (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    if (Math.abs(cg.position.x) < 30 && Math.abs(cg.position.z) < 30) cg.position.x += 60;
    group.add(cg);
    cars.push(cg);
  }

  // Árboles en plaza
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4), trunkMat);
    trunk.position.y = 2; trunk.castShadow = true;
    const fol = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5, 6), leafMat);
    fol.position.y = 6; fol.castShadow = true;
    t.add(trunk, fol);
    t.position.set(Math.cos(ang) * 22, 0, Math.sin(ang) * 22);
    group.add(t);
  }

  // Cajones destructibles
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, flatShading: true });
  const crates = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
    m.castShadow = true; m.receiveShadow = true;
    const ang = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 280;
    m.position.set(Math.cos(ang) * r, 0.8, Math.sin(ang) * r);
    m.rotation.y = Math.random() * Math.PI;
    group.add(m);
    crates.push({ mesh: m, health: 50, respawnAt: 0 });
  }

  // Props urbanos: hidrantes, bancas, botes de basura
  const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7, flatShading: true });
  const hydrantGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.9, 8);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9, flatShading: true });
  const benchGeo = new THREE.BoxGeometry(2.4, 0.12, 0.7);
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.8, flatShading: true });
  const trashGeo = new THREE.CylinderGeometry(0.35, 0.3, 1, 8);
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 260;
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const roll = Math.random();
    if (roll < 0.4) {
      const h = new THREE.Mesh(hydrantGeo, hydrantMat);
      h.position.set(x, 0.45, z); h.castShadow = true;
      group.add(h);
    } else if (roll < 0.75) {
      const bg = new THREE.Group();
      const seat = new THREE.Mesh(benchGeo, benchMat);
      seat.position.y = 0.5; seat.castShadow = true;
      const legGeo = new THREE.BoxGeometry(0.12, 0.5, 0.5);
      for (const lx of [-1, 1]) { const lg = new THREE.Mesh(legGeo, benchMat); lg.position.set(lx, 0.25, 0); bg.add(lg); }
      bg.add(seat); bg.position.set(x, 0, z); bg.rotation.y = Math.random() * Math.PI;
      group.add(bg);
    } else {
      const t = new THREE.Mesh(trashGeo, trashMat);
      t.position.set(x, 0.5, z); t.castShadow = true;
      group.add(t);
    }
  }

  // Semáforos en algunas intersecciones
  const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.3 });
  const tlRed = new THREE.MeshBasicMaterial({ color: 0xff3322 });
  const tlGreen = new THREE.MeshBasicMaterial({ color: 0x33ff66 });
  const tlYellow = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
  for (let i = 0; i < 6; i++) {
    const gx = (Math.floor(Math.random() * 7) - 3) * 56 + 28;
    const gz = (Math.floor(Math.random() * 7) - 3) * 56 + 28;
    if (Math.abs(gx) < 30 && Math.abs(gz) < 30) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), tlPoleMat);
    pole.position.set(gx, 3, gz); pole.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    head.position.set(gx, 6, gz);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), tlRed); r.position.set(gx, 6.45, gz + 0.22);
    const y = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), tlYellow); y.position.set(gx, 6, gz + 0.22);
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), tlGreen); g.position.set(gx, 5.55, gz + 0.22);
    group.add(pole, head, r, y, g);
  }

  // Luces puntuales tenues para ambiente neón (sin sombras)
  const p1 = new THREE.PointLight(0x00e5ff, 0.4, 120); p1.position.set(0, 30, 0);
  const p2 = new THREE.PointLight(0xd500f9, 0.3, 120); p2.position.set(60, 30, 60);
  group.add(p1, p2);

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
    sidewalkMat.dispose(); roofMat.dispose(); antennaMat.dispose(); antennaGeo.dispose();
    beaconMat.dispose(); lampMat.dispose(); bulbMat.dispose();
    crateMat.dispose(); hydrantMat.dispose(); hydrantGeo.dispose();
    benchMat.dispose(); benchGeo.dispose(); trashMat.dispose(); trashGeo.dispose();
    tlPoleMat.dispose(); tlRed.dispose(); tlYellow.dispose(); tlGreen.dispose();
    for (const b of billboards) { b.mat.map?.dispose(); b.mat.dispose(); }
  }

  const colliders = placed.map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d }));

  return { group, crates, neons, colliders, billboards, setNight, update, dispose };
}