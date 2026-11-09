// @ts-nocheck
import * as THREE from "three";

// Puesto de la tienda dentro del mapa: una tarima con mostrador, carpa, cartel
// luminoso y una moneda girando. El jugador se acerca para comprar.

function makeSignTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 512, 160);
  g.addColorStop(0, "#1a1024");
  g.addColorStop(1, "#2a1428");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 160);
  x.strokeStyle = "#ff9620";
  x.lineWidth = 8;
  x.strokeRect(6, 6, 500, 148);
  x.fillStyle = "#ffcc66";
  x.font = "bold 78px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("TIENDA", 276, 82);
  // moneda
  x.beginPath();
  x.arc(64, 80, 34, 0, Math.PI * 2);
  x.fillStyle = "#ffb020";
  x.fill();
  x.fillStyle = "#7a4a00";
  x.font = "bold 40px sans-serif";
  x.fillText("$", 64, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildShop(scene) {
  const group = new THREE.Group();
  const POS = new THREE.Vector3(16, 0, 20); // plaza central (cerca de la fuente)
  group.position.copy(POS);
  group.rotation.y = Math.atan2(-POS.x, -POS.z);
  scene.add(group);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.85, flatShading: true });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x7a2233, roughness: 0.95, flatShading: true });

  // tarima
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 0.5, 12), darkMat);
  base.position.y = 0.25;
  base.receiveShadow = true;
  group.add(base);

  // mostrador
  const counter = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.3, 2), woodMat);
  counter.position.set(0, 1.1, 1.4);
  counter.castShadow = true; counter.receiveShadow = true;
  group.add(counter);

  // techo de la carpa
  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, 6.4), clothMat);
  roof.position.set(0, 4.6, 0);
  roof.castShadow = true;
  group.add(roof);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.22, 6.6), new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a00, emissiveIntensity: 1.4, roughness: 0.5 }));
  trim.position.set(0, 4.32, 0);
  group.add(trim);

  // postes
  const postGeo = new THREE.BoxGeometry(0.35, 4.4, 0.35);
  for (const [px, pz] of [[-4.2, -2.6], [4.2, -2.6], [-4.2, 2.6], [4.2, 2.6]]) {
    const p = new THREE.Mesh(postGeo, woodMat);
    p.position.set(px, 2.2, pz);
    p.castShadow = true;
    group.add(p);
  }

  // pared trasera con estantes
  const back = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.6, 0.35), darkMat);
  back.position.set(0, 2.3, -2.8);
  back.castShadow = true;
  group.add(back);

  // cartel luminoso
  const signTex = makeSignTexture();
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 2.0),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
  );
  sign.position.set(0, 5.9, 0);
  group.add(sign);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.7, 2.15),
    new THREE.MeshBasicMaterial({ color: 0xff9620, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.position.set(0, 5.9, -0.12);
  group.add(glow);

  // moneda flotante
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8800, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.35 })
  );
  coin.position.set(0, 7.6, 0);
  coin.rotation.x = Math.PI / 2;
  group.add(coin);

  const light = new THREE.PointLight(0xffa040, 1.2, 28);
  light.position.set(0, 4.2, 1.6);
  group.add(light);

  // cajas decorativas
  for (const [sx, sz, sc] of [[-2.8, 2.8, 1], [2.6, 2.6, 0.85], [-3.2, -1.2, 0.7]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.1 * sc, 1.1 * sc, 1.1 * sc), woodMat);
    s.position.set(sx, 0.7 * sc, sz);
    s.castShadow = true;
    group.add(s);
  }

  const colliders = [
    { x: POS.x, z: POS.z, w: 9, d: 7 },
  ];

  function setNight(night) {
    const n = THREE.MathUtils.clamp(Number.isFinite(night) ? night : 0, 0, 1);
    light.intensity = 0.6 + 1.4 * n;
  }

  function update(now) {
    coin.rotation.z = (now || 0) * 0.002;
    coin.position.y = 7.6 + Math.sin(now * 0.002) * 0.18;
  }

  function dispose() {
    scene.remove(group);
    signTex.dispose();
  }

  return { group, position: POS.clone(), radius: 9, colliders, setNight, update, dispose };
}
