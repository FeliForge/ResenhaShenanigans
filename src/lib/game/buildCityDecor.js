// @ts-nocheck
import * as THREE from "three";
import { FIXED_BILLBOARD_IMAGES } from "@/lib/game/fixedBillboardImages";

function isOnRoad(x, z) {
  const near = (v) => {
    const m = ((v % 56) + 56) % 56;
    return m < 7 || m > 49;
  };
  return near(x) || near(z);
}

const NEON_COLORS = [0xff2d95, 0x00e5ff, 0xd500f9, 0xff6b00, 0x39ff14, 0xffea00, 0xff1744];

/** Add 4 fixed billboards + Shibuya neon clutter: signs, colored lamps, vertical neon. */
export function addCityDecor(group, occ, PLAZA_R) {
  const billboards = [];

  const fixedSlots = [
    { x: 154, z: 28 },
    { x: -154, z: 28 },
    { x: 28, z: 154 },
    { x: -28, z: -154 },
  ];
  FIXED_BILLBOARD_IMAGES.forEach((img, i) => {
    const pos = fixedSlots[i] || { x: 160, z: 0 };
    let bx = pos.x;
    let bz = pos.z;
    if (!isOnRoad(bx, bz)) {
      bx += 8;
    }
    let placed = false;
    for (let ring = 0; ring < 8 && !placed; ring++) {
      const ox = bx + (ring % 2 === 0 ? ring * 12 : -ring * 12);
      const oz = bz + (ring % 2 === 0 ? -ring * 8 : ring * 8);
      if (occ.tryAdd(ox, oz, 10)) {
        bx = ox;
        bz = oz;
        placed = true;
      }
    }
    if (!placed) occ.tryAdd(bx, bz, 10);

    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x555555 });
    const h = 16;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mat);
    mesh.position.set(bx, h, bz);
    mesh.lookAt(0, h, 0);
    const supportOffset = new THREE.Vector3(bx, 0, bz).normalize().multiplyScalar(1.35);
    const supportX = bx + supportOffset.x;
    const supportZ = bz + supportOffset.z;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, h - 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a3038, flatShading: true })
    );
    post.position.set(supportX, (h - 0.5) / 2, supportZ);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.42, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x1a1e24, flatShading: true })
    );
    base.position.set(supportX, 0.21, supportZ);
    group.add(mesh, post, base);
    billboards.push({ mesh, mat, index: i, id: img.id });
    const loader = new THREE.TextureLoader();
    loader.load(
      img.src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      },
      undefined,
      () => {
        mat.color.set(0x334455);
      }
    );
  });

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, flatShading: true });
  const bulbs = [];
  const streetLights = [];
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe9a8,
    emissive: 0xffbd55,
    emissiveIntensity: 0,
    roughness: 0.35,
  });
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
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 7.2, 6), lampMat);
        pole.position.set(x, 3.6, z);
        pole.castShadow = true;
        const warm = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 6, 6),
          bulbMaterial
        );
        warm.position.set(x, 6.75, z);
        const neonC = NEON_COLORS[(Math.abs(gi) + a + side) % NEON_COLORS.length];
        const accent = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.12, 0.12),
          new THREE.MeshBasicMaterial({
            color: neonC,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        accent.position.set(x, 6.2, z);
        group.add(pole, warm, accent);
        bulbs.push(warm);

        if (
          Math.abs(gi) <= 3 &&
          Math.abs(a) <= 3 &&
          a !== 0 &&
          streetLights.length < 8
        ) {
          const light = new THREE.PointLight(0xffd58a, 0, 38, 1.5);
          light.position.set(x, 6.1, z);
          light.castShadow = false;
          light.userData.baseIntensity = 30;
          group.add(light);
          streetLights.push(light);
        }
      }
    }
  }

  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.12;
    const nx = Math.cos(ang) * 52;
    const nz = Math.sin(ang) * 52;
    if (!occ.tryAdd(nx, nz, 2.2)) continue;
    const col = NEON_COLORS[i % NEON_COLORS.length];
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 6.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0x12151a,
        flatShading: true,
        emissive: col,
        emissiveIntensity: 0.25,
      })
    );
    pole.position.set(nx, 3.1, nz);
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 4.2, 0.18),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    tube.position.set(nx, 4.8, nz);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.12),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    sign.position.set(nx + Math.cos(ang) * 0.9, 5.6, nz + Math.sin(ang) * 0.9);
    sign.lookAt(0, 5.6, 0);
    group.add(pole, tube, sign);
  }

  for (let k = 0; k < 18; k++) {
    const ang = (k / 18) * Math.PI * 2 + 0.4;
    const r = 78 + (k % 3) * 22;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    if (Math.abs(x) < PLAZA_R + 8 && Math.abs(z) < PLAZA_R + 8) continue;
    if (!occ.tryAdd(x, z, 3)) continue;
    const col = NEON_COLORS[k % NEON_COLORS.length];
    const h = 9 + (k % 5) * 2.2;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(4.5 + (k % 3), 2.2, 0.2),
      new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    board.position.set(x, h, z);
    board.lookAt(0, h, 0);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, h - 0.4, 5),
      new THREE.MeshStandardMaterial({ color: 0x1a1e24, flatShading: true })
    );
    post.position.set(x, (h - 0.4) / 2, z);
    group.add(board, post);
  }

  // Benches, bins, traffic signs, planters along curb rings
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9, flatShading: true });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.4, roughness: 0.55, flatShading: true });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.8, flatShading: true });
  const signMat = new THREE.MeshStandardMaterial({ color: 0xc45c26, roughness: 0.7, flatShading: true });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95, flatShading: true });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 1, flatShading: true });

  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2 + 0.07;
    const r = 34 + (i % 4) * 18;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    if (Math.abs(x) < PLAZA_R * 0.55 && Math.abs(z) < PLAZA_R * 0.55) continue;
    if (isOnRoad(x, z)) continue;
    if (!occ.tryAdd(x, z, 2.2)) continue;
    const kind = i % 5;

    if (kind === 0 || kind === 1) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.7), benchMat);
      seat.position.set(x, 0.55, z);
      seat.lookAt(0, 0.55, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.12), benchMat);
      back.position.set(x, 0.95, z);
      back.lookAt(0, 0.95, 0);
      back.translateZ(-0.28);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.5), metalMat);
      legL.position.copy(seat.position); legL.position.y = 0.25; legL.translateX(-0.8);
      const legR = legL.clone(); legR.translateX(1.6);
      group.add(seat, back, legL, legR);
    } else if (kind === 2) {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 8), binMat);
      bin.position.set(x, 0.5, z);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 8), metalMat);
      lid.position.set(x, 1.05, z);
      group.add(bin, lid);
    } else if (kind === 3) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), metalMat);
      pole.position.set(x, 1.6, z);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.08), signMat);
      panel.position.set(x, 3.0, z);
      panel.lookAt(0, 3.0, 0);
      group.add(pole, panel);
    } else {
      const pot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.1), planterMat);
      pot.position.set(x, 0.28, z);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), bushMat);
      bush.position.set(x, 0.95, z);
      group.add(pot, bush);
    }
  }

  return { billboards, bulbs, streetLights, bulbMaterial };
}
