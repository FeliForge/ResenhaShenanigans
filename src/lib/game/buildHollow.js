// @ts-nocheck
import * as THREE from "three";

export function buildHollowBuilding(group, px, pz, w, d, yaw, mats, colliders, platforms, tvTex, withTv) {
  const H = 36;
  const FLOOR_H = 12;
  const WALL_T = 0.55;
  const DOOR_W = 5.5;
  const DOOR_H = 4.2;
  const g = new THREE.Group();
  g.position.set(px, 0, pz);
  g.rotation.y = yaw;

  // Exterior: random city color, same emissive window lights
  const EXTERIOR_COLORS = [
    0x5a6470, 0x6a7a72, 0x4a5460, 0x7a6a52, 0x3a2a52,
    0x707a88, 0x5a5040, 0x8a7a6a, 0x4a3a62, 0x2a1a42,
    0x556070, 0x6f6450, 0x3a4550, 0x5a6575, 0x485060,
  ];
  const extColor = EXTERIOR_COLORS[Math.floor(Math.random() * EXTERIOR_COLORS.length)];
  const wallMat = new THREE.MeshStandardMaterial({
    color: extColor,
    emissiveMap: mats.emissiveMap || null,
    emissive: 0xffffff,
    emissiveIntensity: mats.emissiveMap ? 0.95 : 0.15,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.06,
    side: THREE.FrontSide,
  });
  // Gray interiors
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6e, roughness: 0.95, flatShading: true });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7e, roughness: 0.92, flatShading: true, side: THREE.FrontSide });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x5c5c60, roughness: 0.9, flatShading: true });
  const trimMat = mats.trim;
  const colMat = mats.col;

  for (let f = 0; f < 3; f++) {
    const fy = f * FLOOR_H;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w - WALL_T * 0.5, 0.28, d - WALL_T * 0.5), floorMat);
    slab.position.set(0, fy + 0.14, 0);
    slab.receiveShadow = true;
    g.add(slab);
    platforms.push({ x: px, z: pz, w: w - 1.2, d: d - 1.2, y: fy + 0.28, yaw });
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), trimMat);
  roof.position.set(0, H + 0.1, 0);
  g.add(roof);

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

  // Interior gray wall faces (inset)
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
  // Ceiling underside per floor (gray)
  for (let f = 1; f < 3; f++) {
    const fy = f * FLOOR_H;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w - WALL_T * 1.2, 0.12, d - WALL_T * 1.2), ceilMat);
    ceil.position.set(0, fy - 0.06, 0);
    g.add(ceil);
  }

  const colGeo = new THREE.BoxGeometry(0.65, H - 0.4, 0.65);
  for (const [cx, cz] of [[-w * 0.28, -d * 0.28], [w * 0.28, -d * 0.28], [-w * 0.28, d * 0.22], [w * 0.28, d * 0.22]]) {
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(cx, H / 2 - 0.1, cz);
    g.add(col);
    colliders.push({ x: px + cx, z: pz + cz, w: 1.0, d: 1.0 });
  }

  const stepCount = 12;
  const stepH = FLOOR_H / stepCount;
  const stepD = 0.75;
  const stairW = 3.2;
  const stairMat = mats.stair;
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
  }

  const winMat = new THREE.MeshBasicMaterial({ color: 0x88ccee, transparent: true, opacity: 0.35 });
  for (let f = 0; f < 3; f++) {
    const wy = f * FLOOR_H + 4.0;
    for (const side of [-1, 1]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), winMat);
      pane.position.set(side * (w / 2 - 0.15), wy, 0);
      pane.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(pane);
    }
  }

  if (withTv && tvTex) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 0.15), trimMat);
    frame.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.65);
    g.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.9), new THREE.MeshBasicMaterial({ map: tvTex }));
    screen.position.set(0, FLOOR_H + 3.5, -d / 2 + 0.74);
    g.add(screen);
  }

  const sw = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.22, d + 4), mats.sidewalk);
  sw.position.set(0, 0.11, 0);
  g.add(sw);
  group.add(g);
}
