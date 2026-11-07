// @ts-nocheck
import * as THREE from "three";

/** Detailed central plaza — Shibuya arena energy (no buildings). */
export function buildCentralPlaza(group, occ, makeTree) {
  {
    // Darker, slightly reflective plaza floor
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x4a5058,
      roughness: 0.55,
      metalness: 0.22,
      flatShading: true,
    });
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a2e,
      roughness: 0.95,
      flatShading: true,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x5a6068,
      roughness: 0.72,
      metalness: 0.12,
      flatShading: true,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a4a7a,
      roughness: 0.08,
      metalness: 0.55,
      transparent: true,
      opacity: 0.88,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xc8a050,
      roughness: 0.45,
      metalness: 0.45,
      flatShading: true,
    });
    const neonPink = new THREE.MeshBasicMaterial({
      color: 0xff2d95,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const neonCyan = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const plazaFloor = new THREE.Mesh(new THREE.BoxGeometry(92, 0.28, 92), plazaMat);
    plazaFloor.position.set(0, 0.12, 0);
    plazaFloor.receiveShadow = true;
    group.add(plazaFloor);

    const grassRing = new THREE.Mesh(new THREE.BoxGeometry(108, 0.22, 108), grassMat);
    grassRing.position.set(0, 0.08, 0);
    grassRing.receiveShadow = true;
    group.add(grassRing);

    // Cross paths
    for (const [sx, sz, sw, sd] of [
      [0, 0, 10, 88],
      [0, 0, 88, 10],
    ]) {
      const path = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.32, sd), stoneMat);
      path.position.set(sx, 0.16, sz);
      path.receiveShadow = true;
      group.add(path);
    }

    // Neon ring inset on plaza floor
    const ringGeo = new THREE.RingGeometry(38, 39.2, 64);
    const ringPink = new THREE.Mesh(ringGeo, neonPink);
    ringPink.rotation.x = -Math.PI / 2;
    ringPink.position.y = 0.3;
    group.add(ringPink);
    const ringCyan = new THREE.Mesh(new THREE.RingGeometry(26, 26.8, 48), neonCyan);
    ringCyan.rotation.x = -Math.PI / 2;
    ringCyan.position.y = 0.3;
    group.add(ringCyan);

    // Fountain
    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 0.9, 12), stoneMat);
    fountainBase.position.set(0, 0.5, 0);
    fountainBase.castShadow = true;
    group.add(fountainBase);
    const fountainPool = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.55, 12), waterMat);
    fountainPool.position.set(0, 1.05, 0);
    group.add(fountainPool);
    const fountainPed = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 2.4, 8), stoneMat);
    fountainPed.position.set(0, 2.0, 0);
    fountainPed.castShadow = true;
    group.add(fountainPed);
    const fountainTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), accentMat);
    fountainTop.position.set(0, 3.6, 0);
    fountainTop.castShadow = true;
    group.add(fountainTop);

    // Neon water jets
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.08, 1.9, 5),
        i % 2 === 0 ? neonCyan : neonPink
      );
      jet.position.set(Math.cos(ang) * 3.5, 2.05, Math.sin(ang) * 3.5);
      group.add(jet);
    }
    // Crown neon ring on fountain
    const crown = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.08, 8, 32), neonPink);
    crown.rotation.x = Math.PI / 2;
    crown.position.set(0, 3.9, 0);
    group.add(crown);

    // Benches
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.2;
      const bx = Math.cos(ang) * 14,
        bz = Math.sin(ang) * 14;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.7), benchMat);
      seat.position.set(bx, 0.55, bz);
      seat.rotation.y = -ang + Math.PI / 2;
      seat.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.12), benchMat);
      back.position.set(bx - Math.sin(ang) * 0.35, 0.95, bz + Math.cos(ang) * 0.35);
      back.rotation.y = -ang + Math.PI / 2;
      group.add(seat, back);
      occ.tryAdd(bx, bz, 2.5);
    }

    // Plaza lamps with neon tips
    const plazaLampMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, flatShading: true });
    const plazaBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8a0 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const lx = Math.cos(ang) * 22,
        lz = Math.sin(ang) * 22;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.5, 6), plazaLampMat);
      pole.position.set(lx, 3.25, lz);
      pole.castShadow = true;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 6), plazaBulbMat);
      bulb.position.set(lx, 6.5, lz);
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.14, 0.5),
        i % 2 === 0 ? neonCyan : neonPink
      );
      tip.position.set(lx, 6.85, lz);
      group.add(pole, bulb, tip);
      occ.tryAdd(lx, lz, 2);
    }

    // Trees on outer ring
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + 0.1;
      const tx = Math.cos(ang) * 42,
        tz = Math.sin(ang) * 42;
      if (!occ.tryAdd(tx, tz, 3.5)) continue;
      const t = makeTree();
      t.position.set(tx, 0, tz);
      group.add(t);
    }

    // Planters
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, flatShading: true });
    for (const [px, pz] of [
      [28, 28],
      [28, -28],
      [-28, 28],
      [-28, -28],
    ]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.2, 8), planterMat);
      pot.position.set(px, 0.6, pz);
      pot.castShadow = true;
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true })
      );
      bush.position.set(px, 1.9, pz);
      bush.castShadow = true;
      group.add(pot, bush);
      occ.tryAdd(px, pz, 3);
    }

    // Dramatic arena pillars with neon crowns
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const cx = Math.cos(ang) * 32,
        cz = Math.sin(ang) * 32;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 4.8, 8), stoneMat);
      col.position.set(cx, 2.5, cz);
      col.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.6), accentMat);
      cap.position.set(cx, 5.0, cz);
      const neonCap = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.12, 1.9),
        i % 2 === 0 ? neonPink : neonCyan
      );
      neonCap.position.set(cx, 5.25, cz);
      group.add(col, cap, neonCap);
      occ.tryAdd(cx, cz, 2.5);
    }

    // Outer curbs
    for (const [bx, bz, bw, bd] of [
      [0, 46, 96, 1.2],
      [0, -46, 96, 1.2],
      [46, 0, 1.2, 96],
      [-46, 0, 1.2, 96],
    ]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.55, bd), stoneMat);
      curb.position.set(bx, 0.28, bz);
      curb.castShadow = true;
      group.add(curb);
    }
  }
}
