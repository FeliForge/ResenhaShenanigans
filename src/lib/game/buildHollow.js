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

/** Shared materials/geometries — created once for all hollow buildings */
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
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = fg;
  ctx.font = "bold 16px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeFloorTileTex() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#6a6a70";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#55555a";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * 128;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(128, p); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function ensureShared() {
  if (SHARED.ready) return SHARED;
  SHARED.floorMat = new THREE.MeshStandardMaterial({
    map: makeFloorTileTex(), color: 0xffffff, roughness: 0.92, metalness: 0.02, flatShading: true,
  });
  SHARED.interiorMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7e, roughness: 0.92, flatShading: true });
  SHARED.ceilMat = new THREE.MeshStandardMaterial({ color: 0x5c5c60, roughness: 0.9, flatShading: true });
  SHARED.colMat = new THREE.MeshStandardMaterial({ color: 0x6e6e72, roughness: 0.8, flatShading: true });
  SHARED.stairMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5e, roughness: 0.88, flatShading: true });
  SHARED.glassMat = new THREE.MeshBasicMaterial({
    color: 0xa8c8e0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
  });
  SHARED.frameMat = new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.55, metalness: 0.35, flatShading: true });
  SHARED.tableMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.8, flatShading: true });
  SHARED.lampStandMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, flatShading: true });
  SHARED.lampShadeMat = new THREE.MeshStandardMaterial({ color: 0xe8d8a0, emissive: 0xffcc66, emissiveIntensity: 0.3, flatShading: true });
  SHARED.potMat = new THREE.MeshStandardMaterial({ color: 0x6a4030, flatShading: true });
  SHARED.leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });
  SHARED.fixtureMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, emissive: 0xfff0d0, emissiveIntensity: 0.2, flatShading: true });
  SHARED.rugMats = [
    new THREE.MeshStandardMaterial({ color: 0x4a3a3a, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x3a4a4a, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.95, flatShading: true }),
  ];

  const fallbacks = {
    sofa: makeFallbackTex("SOFA", "#3a4550", "#c0d0e0"),
    bebedor: makeFallbackTex("BEBEDOR", "#2a4050", "#80c0e0"),
    poster: makeFallbackTex("POSTER", "#2a2030", "#ff6b9a"),
    cama: makeFallbackTex("CAMA", "#4a3a50", "#e0d0f0"),
  };
  SHARED.propMats = {};
  for (const key of Object.keys(INTERIOR_URLS)) {
    SHARED.propMats[key] = new THREE.MeshBasicMaterial({
      map: fallbacks[key], transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, depthWrite: true,
    });
  }
  if (typeof document !== "undefined") {
    const loader = new THREE.TextureLoader();
    for (const [key, url] of Object.entries(INTERIOR_URLS)) {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 2;
        tex.generateMipmaps = true;
        const old = SHARED.propMats[key].map;
        SHARED.propMats[key].map = tex;
        SHARED.propMats[key].needsUpdate = true;
        if (old?.dispose) old.dispose();
      }, undefined, () => {});
    }
  }

  SHARED.geo.winPane = new THREE.PlaneGeometry(2.6, 2.2);
  SHARED.geo.winFrame = new THREE.BoxGeometry(2.84, 2.44, 0.08);
  SHARED.geo.col = new THREE.BoxGeometry(0.65, 35.6, 0.65);
  SHARED.geo.colCap = new THREE.BoxGeometry(0.9, 0.2, 0.9);
  SHARED.geo.table = new THREE.BoxGeometry(1.2, 0.7, 0.8);
  SHARED.geo.lampStand = new THREE.CylinderGeometry(0.08, 0.12, 1.1, 5);
  SHARED.geo.lampShade = new THREE.ConeGeometry(0.35, 0.4, 5);
  SHARED.geo.pot = new THREE.CylinderGeometry(0.25, 0.3, 0.4, 5);
  SHARED.geo.leaf = new THREE.ConeGeometry(0.5, 1.2, 5);
  SHARED.geo.fixture = new THREE.BoxGeometry(1.4, 0.12, 1.4);
  SHARED.geo.propPlane = {
    sofa: new THREE.PlaneGeometry(4.2, 2.4),
    cama: new THREE.PlaneGeometry(3.6, 2.0),
    bebedor: new THREE.PlaneGeometry(1.6, 2.6),
    poster: new THREE.PlaneGeometry(2.4, 3.0),
  };

  SHARED.ready = true;
  return SHARED;
}

function addProp(parent, key, x, y, z, rotY = 0) {
  const S = ensureShared();
  const geo = S.geo.propPlane[key];
  const mat = S.propMats[key];
  if (!geo || !mat) return;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.frustumCulled = true;
  parent.add(mesh);
}

function decorateFloor(g, floorIndex, w, d, WALL_T, FLOOR_H) {
  const S = ensureShared();
  const baseY = floorIndex * FLOOR_H;
  const inset = WALL_T + 1.2;
  const halfW = w / 2 - inset;
  const halfD = d / 2 - inset;

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(8, halfW * 1.2), 0.06, Math.min(5, halfD)),
    S.rugMats[floorIndex % 3]
  );
  rug.position.set(halfW * 0.15, baseY + 0.32, halfD * 0.05);
  g.add(rug);

  addProp(g, "sofa", halfW * 0.25, baseY + 1.35, -halfD + 0.4, 0);
  addProp(g, "cama", -halfW * 0.55, baseY + 1.15, halfD * 0.35, Math.PI / 2);
  addProp(g, "bebedor", halfW * 0.7, baseY + 1.4, halfD * 0.55, -Math.PI / 2);
  addProp(g, "poster", -w / 2 + WALL_T + 0.12, baseY + 3.2, -halfD * 0.2, Math.PI / 2);

  const table = new THREE.Mesh(S.geo.table, S.tableMat);
  table.position.set(halfW * 0.55, baseY + 0.65, -halfD + 0.9);
  g.add(table);

  if (floorIndex === 0) {
    const lampStand = new THREE.Mesh(S.geo.lampStand, S.lampStandMat);
    lampStand.position.set(halfW * 0.55, baseY + 1.25, -halfD + 0.9);
    g.add(lampStand);
    const lampShade = new THREE.Mesh(S.geo.lampShade, S.lampShadeMat);
    lampShade.position.set(halfW * 0.55, baseY + 1.95, -halfD + 0.9);
    g.add(lampShade);
    const pot = new THREE.Mesh(S.geo.pot, S.potMat);
    pot.position.set(-halfW * 0.2, baseY + 0.5, -halfD + 0.6);
    g.add(pot);
    const leaf = new THREE.Mesh(S.geo.leaf, S.leafMat);
    leaf.position.set(-halfW * 0.2, baseY + 1.3, -halfD + 0.6);
    g.add(leaf);
  }

  const fixture = new THREE.Mesh(S.geo.fixture, S.fixtureMat);
  fixture.position.set(0, baseY + FLOOR_H - 0.25, 0);
  g.add(fixture);
}

/** Visual ramp + stepped platforms for collision (AABB height). */
function addRamp(g, px, pz, w, d, level, FLOOR_H, platforms, yaw, stairMat, frameMat) {
  const baseY = level * FLOOR_H;
  const rampLen = FLOOR_H * 1.15;
  const rampW = 3.4;
  const rampT = 0.28;
  const sx = -w / 2 + 2.2;
  const startZ = -d / 2 + 1.4;

  const angle = Math.atan2(FLOOR_H, rampLen);
  const hyp = Math.sqrt(FLOOR_H * FLOOR_H + rampLen * rampLen);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampW, rampT, hyp), stairMat);
  ramp.position.set(sx, baseY + FLOOR_H / 2, startZ + rampLen / 2);
  ramp.rotation.x = -angle;
  g.add(ramp);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, hyp), frameMat);
    rail.position.set(sx + side * (rampW * 0.48), baseY + FLOOR_H / 2 + 0.55, startZ + rampLen / 2);
    rail.rotation.x = -angle;
    g.add(rail);
  }

  const samples = 6;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const y = baseY + t * FLOOR_H;
    const z = startZ + t * rampLen;
    platforms.push({
      x: px + sx,
      z: pz + z,
      w: rampW * 0.95,
      d: (rampLen / samples) * 1.15,
      y: y + 0.05,
      yaw,
    });
  }
}

export function buildHollowBuilding(group, px, pz, w, d, yaw, mats, colliders, platforms, tvTex, withTv) {
  const H = 36;
  const FLOOR_H = 12;
  const WALL_T = 0.55;
  const DOOR_W = 5.5;
  const DOOR_H = 4.2;
  const g = new THREE.Group();
  g.position.set(px, 0, pz);
  g.rotation.y = yaw;

  const S = ensureShared();
  const extColor = EXTERIOR_COLORS[Math.floor(Math.random() * EXTERIOR_COLORS.length)];
  const wallMat = new THREE.MeshStandardMaterial({
    color: extColor,
    emissiveMap: mats.emissiveMap || null,
    emissive: 0xffffff,
    emissiveIntensity: mats.emissiveMap ? 0.22 : 0.05,
    flatShading: true,
    roughness: 0.88,
    metalness: 0.04,
  });
  const accent = new THREE.Color(extColor).multiplyScalar(0.72);
  const trimMat = new THREE.MeshStandardMaterial({
    color: accent.getHex(), roughness: 0.65, metalness: 0.22, flatShading: true,
  });

  const floorMat = S.floorMat;
  const interiorMat = S.interiorMat;
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
    platforms.push({ x: px, z: pz, w: w - 1.2, d: d - 1.2, y: fy + 0.28, yaw });
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
    colliders.push({ x: px, z: pz - d / 2, w: w * 0.92, d: WALL_T + 0.4 });
  }
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, H, d), wallMat);
    m.position.set(-w / 2 + WALL_T / 2, H / 2, 0);
    g.add(m);
    colliders.push({ x: px - w / 2, z: pz, w: WALL_T + 0.4, d: d * 0.92 });
  }
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, H, d), wallMat);
    m.position.set(w / 2 - WALL_T / 2, H / 2, 0);
    g.add(m);
    colliders.push({ x: px + w / 2, z: pz, w: WALL_T + 0.4, d: d * 0.92 });
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
    colliders.push({ x: px - w / 2 + sideW / 2, z: pz + d / 2, w: sideW + 0.25, d: WALL_T + 0.4 });
    colliders.push({ x: px + w / 2 - sideW / 2, z: pz + d / 2, w: sideW + 0.25, d: WALL_T + 0.4 });
  }

  {
    const ft = 0.22;
    const left = new THREE.Mesh(new THREE.BoxGeometry(ft, DOOR_H, WALL_T + 0.15), frameMat);
    left.position.set(-DOOR_W / 2 + ft / 2, DOOR_H / 2, d / 2 - WALL_T / 2);
    g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(ft, DOOR_H, WALL_T + 0.15), frameMat);
    right.position.set(DOOR_W / 2 - ft / 2, DOOR_H / 2, d / 2 - WALL_T / 2);
    g.add(right);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, ft, WALL_T + 0.2), frameMat);
    lintel.position.set(0, DOOR_H + ft / 2, d / 2 - WALL_T / 2);
    g.add(lintel);
  }

  function addWindow(lx, ly, lz, rotY) {
    const pane = new THREE.Mesh(S.geo.winPane, glassMat);
    pane.position.set(lx, ly, lz);
    pane.rotation.y = rotY;
    g.add(pane);
    const outer = new THREE.Mesh(S.geo.winFrame, frameMat);
    outer.position.set(lx, ly, lz);
    outer.rotation.y = rotY;
    g.add(outer);
  }
  for (let f = 0; f < 3; f++) {
    const wy = f * FLOOR_H + 5.0;
    for (const side of [-1, 1]) {
      addWindow(side * (w / 2 - 0.02), wy, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    for (const xOff of [-w * 0.25, w * 0.25]) {
      addWindow(xOff, wy, -d / 2 + 0.02, 0);
    }
  }

  const insetW = WALL_T + 0.04;
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w - WALL_T * 2, H - 0.4), interiorMat);
    m.position.set(0, H / 2, -d / 2 + insetW);
    m.rotation.y = Math.PI;
    g.add(m);
  }
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d - WALL_T * 2, H - 0.4), interiorMat);
    m.position.set(-w / 2 + insetW, H / 2, 0);
    m.rotation.y = Math.PI / 2;
    g.add(m);
  }
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d - WALL_T * 2, H - 0.4), interiorMat);
    m.position.set(w / 2 - insetW, H / 2, 0);
    m.rotation.y = -Math.PI / 2;
    g.add(m);
  }
  {
    const sideW = (w - DOOR_W) / 2;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(sideW - 0.1, H - 0.4), interiorMat);
    fl.position.set(-w / 2 + sideW / 2, H / 2, d / 2 - insetW);
    g.add(fl);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(sideW - 0.1, H - 0.4), interiorMat);
    fr.position.set(w / 2 - sideW / 2, H / 2, d / 2 - insetW);
    g.add(fr);
  }
  for (let f = 1; f < 3; f++) {
    const fy = f * FLOOR_H;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w - WALL_T * 1.2, 0.12, d - WALL_T * 1.2), ceilMat);
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
    colliders.push({ x: px + cx, z: pz + cz, w: 1.0, d: 1.0 });
  }

  addRamp(g, px, pz, w, d, 0, FLOOR_H, platforms, yaw, stairMat, frameMat);
  addRamp(g, px, pz, w, d, 1, FLOOR_H, platforms, yaw, stairMat, frameMat);

  if (withTv && tvTex) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 0.15), trimMat);
    frame.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.65);
    g.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.9), new THREE.MeshBasicMaterial({ map: tvTex }));
    screen.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.74);
    g.add(screen);
  }

  try { addNeonAds(g, w, d, FLOOR_H); } catch (_) {}

  const sw = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.22, d + 4), mats.sidewalk);
  sw.position.set(0, 0.11, 0);
  g.add(sw);
  group.add(g);
}
