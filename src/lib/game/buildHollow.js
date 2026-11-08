// @ts-nocheck
import * as THREE from "three";

const EXTERIOR_COLORS = [
  0x5a6470, 0x6a7a72, 0x4a5460, 0x7a6a52, 0x3a2a52,
  0x707a88, 0x5a5040, 0x8a7a6a, 0x4a3a62, 0x2a1a42,
  0x556070, 0x6f6450, 0x3a4550, 0x5a6575, 0x485060,
];

export function buildHollowBuilding(group, px, pz, w, d, yaw, mats, colliders, platforms, tvTex, withTv) {
  const H = 36;
  const FLOOR_H = 12;
  const WALL_T = 0.55;
  const DOOR_W = 5.5;
  const DOOR_H = 4.2;
  const g = new THREE.Group();
  g.position.set(px, 0, pz);
  g.rotation.y = yaw;

  const extColor = EXTERIOR_COLORS[Math.floor(Math.random() * EXTERIOR_COLORS.length)];
  // Soft exterior — lower emissive so fewer / dimmer window lights
  const wallMat = new THREE.MeshStandardMaterial({
    color: extColor,
    emissiveMap: mats.emissiveMap || null,
    emissive: 0xffffff,
    emissiveIntensity: mats.emissiveMap ? 0.28 : 0.06,
    flatShading: true,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.FrontSide,
  });
  const accent = new THREE.Color(extColor).multiplyScalar(0.72);
  const trimMat = new THREE.MeshStandardMaterial({
    color: accent.getHex(),
    roughness: 0.65,
    metalness: 0.22,
    flatShading: true,
  });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6e, roughness: 0.95, flatShading: true });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7e, roughness: 0.92, flatShading: true });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x5c5c60, roughness: 0.9, flatShading: true });
  const colMat = mats.col || new THREE.MeshStandardMaterial({ color: 0x6e6e72, roughness: 0.8, flatShading: true });
  const stairMat = mats.stair || new THREE.MeshStandardMaterial({ color: 0x5a5a5e, roughness: 0.9, flatShading: true });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xa8c8e0,
    transparent: true,
    opacity: 0.28,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.55,
    thickness: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e242c,
    roughness: 0.55,
    metalness: 0.35,
    flatShading: true,
  });

  // Floors + platforms
  for (let f = 0; f < 3; f++) {
    const fy = f * FLOOR_H;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w - WALL_T * 0.5, 0.28, d - WALL_T * 0.5), floorMat);
    slab.position.set(0, fy + 0.14, 0);
    slab.receiveShadow = true;
    g.add(slab);
    platforms.push({ x: px, z: pz, w: w - 1.2, d: d - 1.2, y: fy + 0.28, yaw });
    // Floor ledge / band outside
    if (f > 0) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.22, d + 0.35), trimMat);
      band.position.set(0, fy, 0);
      g.add(band);
    }
  }

  // Roof + cornice
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), trimMat);
  roof.position.set(0, H + 0.15, 0);
  g.add(roof);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.35, d + 0.9), frameMat);
  cornice.position.set(0, H - 0.15, 0);
  g.add(cornice);

  // Base plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.7, d + 0.6), frameMat);
  plinth.position.set(0, 0.35, 0);
  g.add(plinth);

  // Exterior walls
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

  // Door frame (open entrance)
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

  // Transparent windows with frames on side + back walls
  const winW = 2.6;
  const winH = 2.2;
  const winDepth = 0.08;
  function addWindow(lx, ly, lz, rotY) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
    pane.position.set(lx, ly, lz);
    pane.rotation.y = rotY;
    g.add(pane);
    // Frame
    const fw = 0.12;
    const outer = new THREE.Mesh(new THREE.BoxGeometry(winW + fw * 2, winH + fw * 2, winDepth), frameMat);
    outer.position.set(lx, ly, lz);
    outer.rotation.y = rotY;
    g.add(outer);
    // Mullion cross
    const vbar = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.7, winH, winDepth * 1.2), frameMat);
    vbar.position.set(lx, ly, lz);
    vbar.rotation.y = rotY;
    g.add(vbar);
    const hbar = new THREE.Mesh(new THREE.BoxGeometry(winW, fw * 0.7, winDepth * 1.2), frameMat);
    hbar.position.set(lx, ly, lz);
    hbar.rotation.y = rotY;
    g.add(hbar);
    // Soft sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.3, 0.1, 0.35), trimMat);
    const sillOff = 0.2;
    const sx = lx + Math.sin(rotY) * sillOff;
    const sz = lz + Math.cos(rotY) * sillOff;
    sill.position.set(sx, ly - winH / 2 - 0.08, sz);
    sill.rotation.y = rotY;
    g.add(sill);
  }

  for (let f = 0; f < 3; f++) {
    const wy = f * FLOOR_H + 5.0;
    // Left / right walls — 2 windows each floor
    for (const side of [-1, 1]) {
      for (const zOff of [-d * 0.22, d * 0.18]) {
        addWindow(side * (w / 2 - 0.02), wy, zOff, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    }
    // Back wall — 3 windows
    for (const xOff of [-w * 0.28, 0, w * 0.28]) {
      addWindow(xOff, wy, -d / 2 + 0.02, 0);
    }
  }

  // Interior gray faces
  const inset = WALL_T + 0.04;
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w - WALL_T * 2, H - 0.4), interiorMat);
    m.position.set(0, H / 2, -d / 2 + inset);
    m.rotation.y = Math.PI;
    g.add(m);
  }
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d - WALL_T * 2, H - 0.4), interiorMat);
    m.position.set(-w / 2 + inset, H / 2, 0);
    m.rotation.y = Math.PI / 2;
    g.add(m);
  }
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d - WALL_T * 2, H - 0.4), interiorMat);
    m.position.set(w / 2 - inset, H / 2, 0);
    m.rotation.y = -Math.PI / 2;
    g.add(m);
  }
  {
    const sideW = (w - DOOR_W) / 2;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(sideW - 0.1, H - 0.4), interiorMat);
    fl.position.set(-w / 2 + sideW / 2, H / 2, d / 2 - inset);
    g.add(fl);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(sideW - 0.1, H - 0.4), interiorMat);
    fr.position.set(w / 2 - sideW / 2, H / 2, d / 2 - inset);
    g.add(fr);
    const upperH = H - DOOR_H;
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, upperH - 0.2), interiorMat);
    upper.position.set(0, DOOR_H + upperH / 2, d / 2 - inset);
    g.add(upper);
  }
  for (let f = 1; f < 3; f++) {
    const fy = f * FLOOR_H;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w - WALL_T * 1.2, 0.12, d - WALL_T * 1.2), ceilMat);
    ceil.position.set(0, fy - 0.06, 0);
    g.add(ceil);
  }

  // Interior columns
  const colGeo = new THREE.BoxGeometry(0.65, H - 0.4, 0.65);
  for (const [cx, cz] of [[-w * 0.28, -d * 0.28], [w * 0.28, -d * 0.28], [-w * 0.28, d * 0.22], [w * 0.28, d * 0.22]]) {
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(cx, H / 2 - 0.1, cz);
    g.add(col);
    // Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), trimMat);
    cap.position.set(cx, H - 0.35, cz);
    g.add(cap);
    colliders.push({ x: px + cx, z: pz + cz, w: 1.0, d: 1.0 });
  }

  // Stairs
  const stepCount = 12;
  const stepH = FLOOR_H / stepCount;
  const stepD = 0.75;
  const stairW = 3.2;
  for (let level = 0; level < 2; level++) {
    const baseY = level * FLOOR_H;
    for (let s = 0; s < stepCount; s++) {
      const sy = baseY + (s + 0.5) * stepH;
      const sz = -d / 2 + 1.6 + s * stepD;
      const sx = -w / 2 + 2.0;
      const step = new THREE.Mesh(new THREE.BoxGeometry(stairW, stepH * 0.92, stepD * 0.95), stairMat);
      step.position.set(sx, sy, sz);
      g.add(step);
      platforms.push({ x: px + sx, z: pz + sz, w: stairW * 0.9, d: stepD * 0.9, y: baseY + (s + 1) * stepH, yaw });
    }
    // Simple handrail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, FLOOR_H * 0.9, 0.08), frameMat);
    rail.position.set(-w / 2 + 2.0 + stairW * 0.45, baseY + FLOOR_H * 0.45, -d / 2 + 1.6 + (stepCount * stepD) * 0.45);
    g.add(rail);
  }

  // Decorative TV
  if (withTv && tvTex) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 0.15), trimMat);
    frame.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.65);
    g.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.9), new THREE.MeshBasicMaterial({ map: tvTex }));
    screen.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.74);
    g.add(screen);
  }

  // Sidewalk
  const sw = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.22, d + 4), mats.sidewalk);
  sw.position.set(0, 0.11, 0);
  g.add(sw);
  group.add(g);
}
