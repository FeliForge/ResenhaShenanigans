// @ts-nocheck
import * as THREE from "three";

/** Detailed central plaza (no buildings). Uses group, occ, makeTree from caller. */
export function buildCentralPlaza(group, occ, makeTree) {
  // ========== PLAZA CENTRAL DETALLADA (sin edificios) ==========
  {
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.92, flatShading: true });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3a6b3a, roughness: 0.95, flatShading: true });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6e76, roughness: 0.88, flatShading: true });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a6a9a, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.6, metalness: 0.35, flatShading: true });
    const plazaFloor = new THREE.Mesh(new THREE.BoxGeometry(92, 0.28, 92), plazaMat);
    plazaFloor.position.set(0, 0.12, 0); plazaFloor.receiveShadow = true; group.add(plazaFloor);
    const grassRing = new THREE.Mesh(new THREE.BoxGeometry(108, 0.22, 108), grassMat);
    grassRing.position.set(0, 0.08, 0); grassRing.receiveShadow = true; group.add(grassRing);
    for (const [sx, sz, sw, sd] of [[0, 0, 10, 88], [0, 0, 88, 10]]) {
      const path = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.32, sd), stoneMat);
      path.position.set(sx, 0.16, sz); path.receiveShadow = true; group.add(path);
    }
    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 0.9, 12), stoneMat);
    fountainBase.position.set(0, 0.5, 0); fountainBase.castShadow = true; group.add(fountainBase);
    const fountainPool = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.55, 12), waterMat);
    fountainPool.position.set(0, 1.05, 0); group.add(fountainPool);
    const fountainPed = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 2.4, 8), stoneMat);
    fountainPed.position.set(0, 2.0, 0); fountainPed.castShadow = true; group.add(fountainPed);
    const fountainTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), accentMat);
    fountainTop.position.set(0, 3.6, 0); fountainTop.castShadow = true; group.add(fountainTop);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 1.8, 5), new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.55 }));
      jet.position.set(Math.cos(ang) * 3.5, 2.0, Math.sin(ang) * 3.5); group.add(jet);
    }
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.2;
      const bx = Math.cos(ang) * 14, bz = Math.sin(ang) * 14;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.7), benchMat);
      seat.position.set(bx, 0.55, bz); seat.rotation.y = -ang + Math.PI / 2; seat.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.12), benchMat);
      back.position.set(bx - Math.sin(ang) * 0.35, 0.95, bz + Math.cos(ang) * 0.35);
      back.rotation.y = -ang + Math.PI / 2; group.add(seat, back); occ.tryAdd(bx, bz, 2.5);
    }
    const plazaLampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, flatShading: true });
    const plazaBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8a0 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const lx = Math.cos(ang) * 22, lz = Math.sin(ang) * 22;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.5, 6), plazaLampMat);
      pole.position.set(lx, 3.25, lz); pole.castShadow = true;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 6), plazaBulbMat);
      bulb.position.set(lx, 6.5, lz); group.add(pole, bulb); occ.tryAdd(lx, lz, 2);
    }
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + 0.1;
      const tx = Math.cos(ang) * 42, tz = Math.sin(ang) * 42;
      if (!occ.tryAdd(tx, tz, 3.5)) continue;
      const t = makeTree(); t.position.set(tx, 0, tz); group.add(t);
    }
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, flatShading: true });
    for (const [px, pz] of [[28, 28], [28, -28], [-28, 28], [-28, -28]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.2, 8), planterMat);
      pot.position.set(px, 0.6, pz); pot.castShadow = true;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(1.8, 7, 6), new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true }));
      bush.position.set(px, 1.9, pz); bush.castShadow = true; group.add(pot, bush); occ.tryAdd(px, pz, 3);
    }
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const cx = Math.cos(ang) * 32, cz = Math.sin(ang) * 32;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 4.2, 8), stoneMat);
      col.position.set(cx, 2.2, cz); col.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), accentMat);
      cap.position.set(cx, 4.4, cz); group.add(col, cap); occ.tryAdd(cx, cz, 2.5);
    }
    for (const [bx, bz, bw, bd] of [[0, 46, 96, 1.2], [0, -46, 96, 1.2], [46, 0, 1.2, 96], [-46, 0, 1.2, 96]]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.55, bd), stoneMat);
      curb.position.set(bx, 0.28, bz); curb.castShadow = true; group.add(curb);
    }
  }

}
