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

  // Far-out curb slots (road midlines) so planes are not buried inside towers
  // Order: goofyboxy, vitalsmash, tangomayhem, tomatosmash
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
    // Nudge off pure road center if needed, but stay in open band
    if (!isOnRoad(bx, bz)) {
      bx += 8;
    }
    // If occupancy fails, spiral outward until free
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
    // Keep the support directly behind the billboard plane so it never
    // cuts through the artwork from the front-facing camera angle.
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

  // Street lamps with warm + neon accent bulbs (outside plaza)
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

        // A small, capped set of real lights illuminates the nearby asphalt
        // and sidewalks without adding hundreds of expensive dynamic lights.
        if (
          Math.abs(gi) <= 3 &&
          Math.abs(a) <= 3 &&
          a !== 0 &&
          streetLights.length < 24
        ) {
          const light = new THREE.PointLight(0xffd58a, 0, 52, 1.5);
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

  return { billboards, bulbs, streetLights, bulbMaterial };
}
