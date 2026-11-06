// @ts-nocheck
import * as THREE from "three";
import { FIXED_BILLBOARD_IMAGES } from "@/lib/game/fixedBillboardImages";

function isOnRoad(x, z) {
  const near = (v) => { const m = ((v % 56) + 56) % 56; return m < 7 || m > 49; };
  return near(x) || near(z);
}

/** Add 4 fixed billboards in empty zones + street lamps + neon poles. */
export function addCityDecor(group, occ, PLAZA_R) {
  const billboards = [];

  // 4 billboards fijos en zonas vacías distintas del mapa (fuera de plaza y carreteras)
  const slots = [
    { x:  105, z:  72 },  // NE — GoofyBoxy
    { x: -118, z:  48 },  // NW — VitalSmash
    { x:   62, z: 128 },  // SE — TangoMayhem
    { x:  -88, z: -115 }, // SW — TomatoSmash
  ];

  FIXED_BILLBOARD_IMAGES.forEach((img, i) => {
    const pos = slots[i] || { x: 120, z: 0 };
    let bx = pos.x, bz = pos.z;
    if (isOnRoad(bx, bz)) { bx += 14; bz += 10; }
    // Empujar fuera de la plaza si cayera dentro
    if (Math.abs(bx) < PLAZA_R && Math.abs(bz) < PLAZA_R) {
      const s = Math.max(PLAZA_R + 12, Math.hypot(bx, bz) || 1);
      const a = Math.atan2(bz, bx);
      bx = Math.cos(a) * s;
      bz = Math.sin(a) * s;
    }

    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x555555 });
    const h = 12;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), mat);
    mesh.position.set(bx, h, bz);
    mesh.lookAt(0, h, 0);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.36, h - 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a3038, flatShading: true })
    );
    post.position.set(bx, (h - 0.5) / 2, bz);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.4, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x1a1e24, flatShading: true })
    );
    base.position.set(bx, 0.2, bz);

    group.add(mesh, post, base);
    occ.tryAdd(bx, bz, 8);

    const loader = new THREE.TextureLoader();
    loader.load(img.src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }, undefined, () => {
      mat.color.set(0x334455);
    });

    billboards.push({ mesh, mat, index: i, fixed: true });
  });

  // Street lamps (outside plaza)
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, flatShading: true });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const bulbs = [];
  for (let gi = -6; gi <= 6; gi++) {
    for (let side = 0; side < 2; side++) {
      const road = gi * 56;
      const curb = side === 0 ? 8.5 : -8.5;
      for (let a = -5; a <= 5; a++) {
        if (a === 0) continue;
        const x = a * 56 + 28;
        const z = road + curb;
        if (Math.abs(x) < PLAZA_R && Math.abs(z) < PLAZA_R) continue;
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

  // Neon poles around plaza edge
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.15;
    const nx = Math.cos(ang) * 50;
    const nz = Math.sin(ang) * 50;
    if (!occ.tryAdd(nx, nz, 2.5)) continue;
    const neonMat = new THREE.MeshBasicMaterial({
      color: [0x00e5ff, 0xd500f9, 0xff9620, 0x88ff44, 0xff66aa, 0x5a9fff, 0xff3b2f, 0x88ccaa][i],
      transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const neon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9, 0.22), neonMat);
    neon.position.set(nx, 5, nz);
    group.add(neon);
  }

  return { billboards };
}
