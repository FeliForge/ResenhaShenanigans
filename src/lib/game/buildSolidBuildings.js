// @ts-nocheck
import * as THREE from "three";

const DISTRICTS = [
  { name: "residential", colors: [0x6a7a72, 0x7a8a7a, 0x5a6a5a], minH: 8, maxH: 22, tallChance: 0.06 },
  { name: "commercial", colors: [0x5a6470, 0x707a88, 0x4a5460], minH: 16, maxH: 40, tallChance: 0.18 },
  { name: "industrial", colors: [0x7a6a52, 0x6f6450, 0x5a5040], minH: 10, maxH: 28, tallChance: 0.05 },
  { name: "neon", colors: [0x3a2a52, 0x4a3a62, 0x2a1a42], minH: 18, maxH: 48, tallChance: 0.22 },
  { name: "suburb", colors: [0x8a7a6a, 0x9a8a7a, 0x7a6a5a], minH: 6, maxH: 16, tallChance: 0.03 },
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
    return m < 10 || m > 46;
  };
  return near(x) || near(z);
}

function footprintOnRoad(x, z, w, d) {
  const hw = (w || 10) * 0.5 + 1.5;
  const hd = (d || 10) * 0.5 + 1.5;
  const samples = [
    [x, z],
    [x + hw, z], [x - hw, z], [x, z + hd], [x, z - hd],
    [x + hw * 0.7, z + hd * 0.7], [x - hw * 0.7, z + hd * 0.7],
    [x + hw * 0.7, z - hd * 0.7], [x - hw * 0.7, z - hd * 0.7],
  ];
  for (const [sx, sz] of samples) {
    if (isOnRoad(sx, sz)) return true;
  }
  return false;
}

function districtAt(x, z) {
  const a = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  let t = 0;
  if (r < 80) t = 1;
  else if (a > -Math.PI * 0.2 && a < Math.PI * 0.4) t = 3;
  else if (a > Math.PI * 0.4 && a < Math.PI * 0.9) t = 2;
  else if (a > -Math.PI * 0.9 && a < -Math.PI * 0.2) t = 0;
  else t = 4;
  return DISTRICTS[t];
}

/**
 * Add solid (non-hollow) buildings for city variety: district colors,
 * setbacks, balconies, varied roofs.
 */
export function addSolidBuildings(group, occ, PLAZA_R, SHOP_ZONE, boxGeo, map, emissive, facadeTrimMat, treeColliders, placed) {
  const solidMats = DISTRICTS.map((d) =>
    d.colors.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          map,
          emissiveMap: emissive,
          emissive: 0xffffff,
          emissiveIntensity: 0.18,
          roughness: 0.88,
          metalness: 0.04,
          flatShading: true,
        })
    )
  );
  const solidRoofMats = [
    new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.92, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.85, metalness: 0.15, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x222830, roughness: 0.88, flatShading: true }),
  ];
  const balconyMat = new THREE.MeshStandardMaterial({
    color: 0x1e2228,
    roughness: 0.75,
    metalness: 0.25,
    flatShading: true,
  });

  let solidBuilt = 0;
  const SOLID_TARGET = 95;
  for (let attempt = 0; attempt < SOLID_TARGET * 22 && solidBuilt < SOLID_TARGET; attempt++) {
    const ang = (attempt / (SOLID_TARGET * 22)) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const ring = Math.floor(attempt / 14) % 10;
    const rad = PLAZA_R + 18 + ring * 22 + Math.random() * 18;
    let px = Math.cos(ang) * rad;
    let pz = Math.sin(ang) * rad;
    px = Math.round(px / 12) * 12;
    pz = Math.round(pz / 12) * 12;
    if (Math.hypot(px, pz) < PLAZA_R + 14) continue;

    const dist = districtAt(px, pz);
    const w = 8 + Math.floor(Math.random() * 12);
    const d = 8 + Math.floor(Math.random() * 12);
    if (footprintOnRoad(px, pz, w, d)) continue;
    if (Math.hypot(px - SHOP_ZONE.x, pz - SHOP_ZONE.z) < SHOP_ZONE.r + Math.max(w, d) * 0.4) continue;
    if (!occ.tryAdd(px, pz, Math.max(w, d) * 0.45)) continue;

    const h = pickHeight(dist);
    const matList = solidMats[DISTRICTS.indexOf(dist)] || solidMats[0];
    const bodyMat = matList[Math.floor(Math.random() * matList.length)];
    const roofM = solidRoofMats[Math.floor(Math.random() * solidRoofMats.length)];

    const body = new THREE.Mesh(boxGeo, bodyMat);
    body.scale.set(w, h, d);
    body.position.set(px, h * 0.5, pz);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (h > 18 && Math.random() < 0.45) {
      const uw = w * (0.55 + Math.random() * 0.25);
      const ud = d * (0.55 + Math.random() * 0.25);
      const uh = 4 + Math.random() * 8;
      const upper = new THREE.Mesh(boxGeo, bodyMat);
      upper.scale.set(uw, uh, ud);
      upper.position.set(px, h + uh * 0.5, pz);
      upper.castShadow = true;
      group.add(upper);
      const roof = new THREE.Mesh(boxGeo, roofM);
      roof.scale.set(uw + 0.6, 0.35, ud + 0.6);
      roof.position.set(px, h + uh + 0.2, pz);
      group.add(roof);
    } else {
      const roof = new THREE.Mesh(boxGeo, roofM);
      roof.scale.set(w + 0.5, 0.4, d + 0.5);
      roof.position.set(px, h + 0.25, pz);
      group.add(roof);
      if (h < 14 && Math.random() < 0.35) {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.55, 2.2, 4), roofM);
        peak.position.set(px, h + 1.4, pz);
        peak.rotation.y = Math.PI / 4;
        group.add(peak);
      }
    }

    if (h > 16 && Math.random() < 0.55) {
      const levels = 1 + Math.floor(Math.random() * 3);
      for (let L = 0; L < levels; L++) {
        const by = 4 + L * Math.min(6, h / (levels + 1));
        if (by >= h - 2) continue;
        const side = Math.random() > 0.5 ? 1 : -1;
        const bal = new THREE.Mesh(boxGeo, balconyMat);
        if (Math.random() > 0.5) {
          bal.scale.set(w * 0.35, 0.25, 1.1);
          bal.position.set(px + side * (w * 0.5 + 0.4), by, pz + (Math.random() - 0.5) * d * 0.4);
        } else {
          bal.scale.set(1.1, 0.25, d * 0.35);
          bal.position.set(px + (Math.random() - 0.5) * w * 0.4, by, pz + side * (d * 0.5 + 0.4));
        }
        group.add(bal);
      }
    }

    if (Math.random() < 0.7) {
      const trim = new THREE.Mesh(boxGeo, facadeTrimMat);
      trim.scale.set(w + 0.3, 1.2, d + 0.3);
      trim.position.set(px, 0.6, pz);
      group.add(trim);
    }

    treeColliders.push({ x: px, z: pz, w: w * 0.92, d: d * 0.92 });
    placed.push({ x: px, z: pz, w, d, h });
    solidBuilt++;
  }
}
