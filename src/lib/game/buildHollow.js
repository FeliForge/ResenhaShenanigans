// @ts-nocheck
import * as THREE from "three";
import { addNeonAds } from "@/lib/game/buildHollowAds";

const EXTERIOR_COLORS = [
  0x5a6470, 0x6a7a72, 0x4a5460, 0x7a6a52, 0x3a2a52,
  0x707a88, 0x5a5040, 0x8a7a6a, 0x4a3a62, 0x2a1a42,
  0x556070, 0x6f6450, 0x3a4550, 0x5a6575, 0x485060,
];

const INTERIOR_URLS = {
  sofa: "/interiors/sofa.png",
  bebedor: "/interiors/bebedor.png",
  poster: "/interiors/poster.png",
  cama: "/interiors/cama.png",
};

const SHARED = {
  ready: false,
  propMats: null,
  floorMat: null,
  interiorMat: null,
  ceilMat: null,
  colMat: null,
  stairMat: null,
  glassMat: null,
  frameMat: null,
  tableMat: null,
  lampStandMat: null,
  lampShadeMat: null,
  potMat: null,
  leafMat: null,
  fixtureMat: null,
  rugMats: null,
  geo: {},
};

function makeFallbackTex(label, bg, fg) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = fg; ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
  ctx.fillText(label, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ensureShared() {
  if (SHARED.ready) return SHARED;
  SHARED.floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.9, metalness: 0.05 });
  SHARED.interiorMat = new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.92, metalness: 0.02 });
  SHARED.ceilMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.95 });
  SHARED.colMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.7, metalness: 0.15 });
  SHARED.stairMat = new THREE.MeshStandardMaterial({ color: 0x5a5a65, roughness: 0.75, metalness: 0.1 });
  SHARED.glassMat = new THREE.MeshBasicMaterial({ color: 0x88ccee, transparent: true, opacity: 0.28, depthWrite: false });
  SHARED.frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.6, metalness: 0.25 });
  SHARED.tableMat = new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.85 });
  SHARED.lampStandMat = new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.4, roughness: 0.5 });
  SHARED.lampShadeMat = new THREE.MeshStandardMaterial({ color: 0xf0e0c0, emissive: 0xffcc88, emissiveIntensity: 0.35 });
  SHARED.potMat = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 });
  SHARED.leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.95 });
  SHARED.fixtureMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xfff0d0, emissiveIntensity: 0.5 });
  SHARED.rugMats = [
    new THREE.MeshStandardMaterial({ color: 0x6a3040, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x304060, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x405030, roughness: 1 }),
  ];
  const loader = new THREE.TextureLoader();
  SHARED.propMats = {};
  for (const [key, url] of Object.entries(INTERIOR_URLS)) {
    const mat = new THREE.MeshBasicMaterial({
      map: makeFallbackTex(key.toUpperCase(), "#2a2a35", "#aaa"),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    SHARED.propMats[key] = mat;
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const old = mat.map;
      mat.map = tex;
      mat.needsUpdate = true;
      if (old?.dispose) old.dispose();
    }, undefined, () => {});
  }
  SHARED.geo = {
    col: new THREE.BoxGeometry(0.7, 35.5, 0.7),
    colCap: new THREE.BoxGeometry(1.0, 0.3, 1.0),
  };
  SHARED.ready = true;
  return SHARED;
}

function decorateFloor(g, floorIndex, w, d, WALL_T, FLOOR_H) {
  const S = ensureShared();
  const baseY = floorIndex * FLOOR_H;
  const inset = WALL_T + 1.2;
  const iw = w - inset * 2;
  const id = d - inset * 2;

  const rug = new THREE.Mesh(new THREE.BoxGeometry(iw * 0.45, 0.04, id * 0.35), S.rugMats[floorIndex % 3]);
  rug.position.set(-iw * 0.12, baseY + 0.3, id * 0.05);
  g.add(rug);

  const sofa = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.0), S.propMats.sofa);
  sofa.position.set(-iw * 0.28, baseY + 1.15, -id * 0.28);
  g.add(sofa);

  const bed = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), S.propMats.cama);
  bed.position.set(iw * 0.28, baseY + 1.1, -id * 0.22);
  g.add(bed);

  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), S.propMats.poster);
  poster.position.set(iw * 0.35, baseY + 3.2, -d / 2 + WALL_T + 0.08);
  g.add(poster);

  const drink = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), S.propMats.bebedor);
  drink.position.set(-iw * 0.32, baseY + 1.0, id * 0.25);
  g.add(drink);

  const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.2), S.tableMat);
  table.position.set(0, baseY + 0.85, id * 0.15);
  g.add(table);
  for (const [lx, lz] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), S.tableMat);
    leg.position.set(lx, baseY + 0.45, id * 0.15 + lz);
    g.add(leg);
  }

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 6), S.lampStandMat);
  stand.position.set(iw * 0.3, baseY + 1.0, id * 0.28);
  g.add(stand);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 8), S.lampShadeMat);
  shade.position.set(iw * 0.3, baseY + 1.85, id * 0.28);
  g.add(shade);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.4, 8), S.potMat);
  pot.position.set(-iw * 0.35, baseY + 0.5, id * 0.32);
  g.add(pot);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), S.leafMat);
  leaf.position.set(-iw * 0.35, baseY + 1.0, id * 0.32);
  g.add(leaf);

  const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), S.fixtureMat);
  fixture.position.set(0, baseY + FLOOR_H - 0.25, 0);
  g.add(fixture);
}

/** Interior ramp fully inside the footprint (no clipping outside walls). */
function addRamp(g, px, pz, w, d, level, FLOOR_H, platforms, yaw, stairMat, frameMat) {
  const WALL = 0.7;
  const baseY = level * FLOOR_H;
  const rampW = Math.min(2.2, w * 0.22);
  const maxRun = Math.max(4, d - WALL * 2 - 2.5);
  const rampLen = Math.min(FLOOR_H * 0.95, maxRun * 0.9);
  const sx = (level % 2 === 0 ? 1 : -1) * Math.min(w * 0.28, w / 2 - rampW / 2 - WALL - 0.4);
  const startZ = -d / 2 + WALL + 1.2;
  const zLimit = d / 2 - WALL - 1.0;
  const useLen = Math.min(rampLen, zLimit - startZ);
  if (useLen < 3.5) return;

  const angle = Math.atan2(FLOOR_H, useLen);
  const hyp = Math.sqrt(FLOOR_H * FLOOR_H + useLen * useLen);
  const midZ = startZ + useLen / 2;

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.18, hyp), stairMat);
  ramp.position.set(sx, baseY + FLOOR_H / 2, midZ);
  ramp.rotation.x = -angle;
  g.add(ramp);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, hyp), frameMat);
    rail.position.set(sx + side * (rampW * 0.48), baseY + FLOOR_H / 2 + 0.45, midZ);
    rail.rotation.x = -angle;
    g.add(rail);
  }

  const land = new THREE.Mesh(new THREE.BoxGeometry(rampW + 0.5, 0.16, 1.1), stairMat);
  land.position.set(sx, baseY + 0.2, startZ + 0.3);
  g.add(land);
  const landTop = new THREE.Mesh(new THREE.BoxGeometry(rampW + 0.5, 0.16, 1.1), stairMat);
  landTop.position.set(sx, baseY + FLOOR_H + 0.2, startZ + useLen - 0.3);
  g.add(landTop);

  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = baseY + t * FLOOR_H;
    const z = startZ + t * useLen;
    platforms.push({
      x: px + sx,
      z: pz + z,
      w: rampW + 0.6,
      d: useLen / steps + 0.55,
      y: y + 0.2,
      yaw,
    });
  }
}

export function buildHollowBuilding(group, px, pz, w, d, yaw, mats, colliders, platforms, tvTex, withTv) {
  const H = 36;
  const FLOOR_H = 12;
  const WALL_T = 0.55;
  const DOOR_W = 7.2;
  const DOOR_H = 4.8;
  const g = new THREE.Group();
  g.position.set(px, 0, pz);
  g.rotation.y = yaw;

  const S = ensureShared();
  const extColor = EXTERIOR_COLORS[Math.floor(Math.random() * EXTERIOR_COLORS.length)];
  const wallMat = new THREE.MeshStandardMaterial({
    color: extColor,
    emissiveMap: mats.emissiveMap || null,
    emissive: 0xffffff,
    emissiveIntensity: mats.emissiveMap ? 0.18 : 0.04,
    flatShading: false,
    roughness: 0.78,
    metalness: 0.08,
  });
  const accent = new THREE.Color(extColor).multiplyScalar(0.72);
  const trimMat = new THREE.MeshStandardMaterial({
    color: accent.getHex(), roughness: 0.55, metalness: 0.28, flatShading: false,
  });

  const floorMat = S.floorMat;
  const ceilMat = S.ceilMat;
  const colMat = mats.col || S.colMat;
  const stairMat = mats.stair || S.stairMat;
  const glassMat = S.glassMat;
  const frameMat = S.frameMat;

  for (let f = 0; f < 3; f++) {
    const fy = f * FLOOR_H;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w - WALL_T * 0.5, 0.28, d - WALL_T * 0.5), floorMat);
    slab.position.set(0, fy + 0.14, 0);
    slab.receiveShadow = true;
    g.add(slab);
    platforms.push({ x: px, z: pz, w: w - 2.0, d: d - 2.0, y: fy + 0.28, yaw });
    if (f > 0) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.22, d + 0.35), trimMat);
      band.position.set(0, fy, 0);
      g.add(band);
    }
    decorateFloor(g, f, w, d, WALL_T, FLOOR_H);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), trimMat);
  roof.position.set(0, H + 0.15, 0);
  g.add(roof);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.35, d + 0.9), frameMat);
  cornice.position.set(0, H - 0.15, 0);
  g.add(cornice);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.7, d + 0.6), frameMat);
  plinth.position.set(0, 0.35, 0);
  g.add(plinth);

  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, WALL_T), wallMat);
    m.position.set(0, H / 2, -d / 2 + WALL_T / 2);
    g.add(m);
    colliders.push({ x: px, z: pz - d / 2, w: w * 0.9, d: WALL_T + 0.3 });
  }
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, H, d), wallMat);
    m.position.set(-w / 2 + WALL_T / 2, H / 2, 0);
    g.add(m);
    colliders.push({ x: px - w / 2, z: pz, w: WALL_T + 0.3, d: d * 0.88 });
  }
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, H, d), wallMat);
    m.position.set(w / 2 - WALL_T / 2, H / 2, 0);
    g.add(m);
    colliders.push({ x: px + w / 2, z: pz, w: WALL_T + 0.3, d: d * 0.88 });
  }
  {
    const sideW = (w - DOOR_W) / 2;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(sideW, H, WALL_T), wallMat);
    fl.position.set(-w / 2 + sideW / 2, H / 2, d / 2 - WALL_T / 2);
    g.add(fl);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(sideW, H, WALL_T), wallMat);
    fr.position.set(w / 2 - sideW / 2, H / 2, d / 2 - WALL_T / 2);
    g.add(fr);
    const upperH = H - DOOR_H;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, upperH, WALL_T), wallMat);
    upper.position.set(0, DOOR_H + upperH / 2, d / 2 - WALL_T / 2);
    g.add(upper);
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.5, 0.28, 0.35), trimMat);
    doorFrame.position.set(0, DOOR_H + 0.1, d / 2 - WALL_T / 2 + 0.1);
    g.add(doorFrame);
    for (const sx of [-DOOR_W / 2 - 0.12, DOOR_W / 2 + 0.12]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.28, DOOR_H, 0.4), trimMat);
      jamb.position.set(sx, DOOR_H / 2, d / 2 - WALL_T / 2 + 0.08);
      g.add(jamb);
    }
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.2, 0.12, 1.2), frameMat);
    threshold.position.set(0, 0.08, d / 2 + 0.35);
    g.add(threshold);
    colliders.push({ x: px - w / 2 + sideW / 2, z: pz + d / 2 + 0.05, w: Math.max(0.8, sideW - 0.1), d: WALL_T + 0.2 });
    colliders.push({ x: px + w / 2 - sideW / 2, z: pz + d / 2 + 0.05, w: Math.max(0.8, sideW - 0.1), d: WALL_T + 0.2 });
    const ft = 0.22;
    const left = new THREE.Mesh(new THREE.BoxGeometry(ft, DOOR_H, WALL_T + 0.2), frameMat);
    left.position.set(-DOOR_W / 2 + ft / 2, DOOR_H / 2, d / 2 - WALL_T / 2);
    g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(ft, DOOR_H, WALL_T + 0.2), frameMat);
    right.position.set(DOOR_W / 2 - ft / 2, DOOR_H / 2, d / 2 - WALL_T / 2);
    g.add(right);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, ft, WALL_T + 0.2), frameMat);
    lintel.position.set(0, DOOR_H - ft / 2, d / 2 - WALL_T / 2);
    g.add(lintel);
  }

  for (let f = 0; f < 3; f++) {
    const wy = f * FLOOR_H + 5.0;
    for (const [wx, wz, ww, wh, rotY] of [
      [0, -d / 2 + 0.02, w * 0.55, 3.2, 0],
      [-w / 2 + 0.02, 0, d * 0.4, 3.2, Math.PI / 2],
      [w / 2 - 0.02, 0, d * 0.4, 3.2, -Math.PI / 2],
    ]) {
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glassMat);
      glass.position.set(wx, wy, wz);
      glass.rotation.y = rotY;
      g.add(glass);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.25, wh + 0.25, 0.12), frameMat);
      frame.position.set(wx, wy, wz);
      frame.rotation.y = rotY;
      g.add(frame);
    }
  }

  for (let f = 1; f < 3; f++) {
    const fy = f * FLOOR_H;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w - 1.0, 0.12, d - 1.0), ceilMat);
    ceil.position.set(0, fy - 0.06, 0);
    g.add(ceil);
  }

  for (const [cx, cz] of [[-w * 0.28, -d * 0.2], [w * 0.28, d * 0.15]]) {
    const col = new THREE.Mesh(S.geo.col, colMat);
    col.position.set(cx, H / 2 - 0.1, cz);
    g.add(col);
    const cap = new THREE.Mesh(S.geo.colCap, trimMat);
    cap.position.set(cx, H - 0.35, cz);
    g.add(cap);
    colliders.push({ x: px + cx, z: pz + cz, w: 0.85, d: 0.85 });
  }

  addRamp(g, px, pz, w, d, 0, FLOOR_H, platforms, yaw, stairMat, frameMat);
  addRamp(g, px, pz, w, d, 1, FLOOR_H, platforms, yaw, stairMat, frameMat);

  if (withTv && tvTex) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 0.25), frameMat);
    frame.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.65);
    g.add(frame);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.2),
      new THREE.MeshBasicMaterial({ map: tvTex })
    );
    screen.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.74);
    g.add(screen);
  }

  try { addNeonAds(g, w, d, FLOOR_H); } catch (_) {}

  group.add(g);
  return g;
}
