// @ts-nocheck
import * as THREE from "three";
import { FIXED_BILLBOARD_IMAGES } from "@/lib/game/fixedBillboardImages";

function isOnRoad(x, z) {
  const near = (v) => { const m = ((v % 56) + 56) % 56; return m < 7 || m > 49; };
  return near(x) || near(z);
}

function makeBillboardTex(label, accent) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0e1118"; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = accent || "#2a3040"; x.lineWidth = 10; x.strokeRect(6, 6, 500, 244);
  x.fillStyle = accent || "#3a4252"; x.font = "bold 48px sans-serif"; x.textAlign = "center";
  x.fillText(label, 256, 115);
  x.fillStyle = "#7a8292"; x.font = "22px sans-serif"; x.fillText("Personalizable", 256, 168);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Add billboards (personal + fixed far), street lamps, neon poles. */
export function addCityDecor(group, occ, PLAZA_R) {
  const billboards = [];
  // BILLBOARDS personalizables — más lejos (~130u)
  const personalSlots = [
    { x:  130, z:  55 }, { x: -130, z:  55 },
    { x:  55, z:  130 }, { x:  55, z: -130 },
    { x: -55, z:  130 }, { x: -55, z: -130 },
    { x:  130, z: -55 }, { x: -130, z: -55 },
  ];
  const bbLabels = [
    ["Arena", "#ff9620"], ["Shop", "#00e5ff"], ["News", "#d500f9"], ["Ads", "#88ccaa"],
    ["Fight", "#ff3b2f"], ["Resenha", "#ffcc66"], ["Dash", "#5a9fff"], ["Combo", "#ff66aa"],
  ];
  personalSlots.forEach((pos, i) => {
    let bx = pos.x, bz = pos.z;
    if (isOnRoad(bx, bz)) { bx += 14; bz += 10; }
    const [label, accent] = bbLabels[i];
    const tex = makeBillboardTex(label, accent);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const h = 11;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5), mat);
    mesh.position.set(bx, h, bz);
    mesh.lookAt(0, h, 0);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, h - 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x333840, flatShading: true })
    );
    post.position.set(bx, (h - 0.4) / 2, bz);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 0.38, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2e36, flatShading: true })
    );
    base.position.set(bx, 0.19, bz);
    group.add(mesh, post, base);
    occ.tryAdd(bx, bz, 7);
    billboards.push({ mesh, mat, index: i });
  });

  // BILLBOARDS FIJOS — aún más lejos (~185u)
  const fixedSlots = [
    { x:  185, z:  90 },
    { x: -185, z:  90 },
    { x:   90, z: 185 },
    { x:  -90, z: -185 },
  ];
  FIXED_BILLBOARD_IMAGES.forEach((img, i) => {
    const pos = fixedSlots[i] || { x: 200, z: 0 };
    let bx = pos.x, bz = pos.z;
    if (isOnRoad(bx, bz)) { bx += 16; bz += 12; }
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x555555 });
    const h = 13;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), mat);
    mesh.position.set(bx, h, bz);
    mesh.lookAt(0, h, 0);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, h - 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a3038, flatShading: true })
    );
    post.position.set(bx, (h - 0.5) / 2, bz);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.42, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x1a1e24, flatShading: true })
    );
    base.position.set(bx, 0.21, bz);
    group.add(mesh, post, base);
    occ.tryAdd(bx, bz, 9);
    const loader = new THREE.TextureLoader();
    loader.load(img.src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }, undefined, () => { mat.color.set(0x334455); });
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
