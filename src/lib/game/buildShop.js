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
  const POS = new THREE.Vector3(82, 0, 48); // lejos de la plaza / fuente
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
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2), signMat);
  sign.position.set(0, 5.9, 0);
  group.add(sign);

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa63d, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), glowMat);
  glow.position.set(0, 5.9, -0.12);
  group.add(glow);

  // moneda girando sobre el cartel
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc23d, emissive: 0xff8a00, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.3 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 20), coinMat);
  coin.rotation.x = Math.PI / 2;
  coin.position.set(0, 7.6, 0);
  group.add(coin);

  // luz cálida del puesto
  const light = new THREE.PointLight(0xffa640, 1.2, 26);
  light.position.set(0, 4.2, 1.6);
  group.add(light);

  // sacos y cajas alrededor
  const sackMat = new THREE.MeshStandardMaterial({ color: 0x8a7440, roughness: 1, flatShading: true });
  for (const [sx, sz, sc] of [[-5.4, 1.2, 1], [5.6, 0.6, 0.85], [-5.2, -2.2, 0.7], [5.2, -2.4, 1.1]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 7, 6), sackMat);
    s.position.set(sx, 0.7 * sc, sz);
    s.scale.set(sc, sc * 1.15, sc);
    s.castShadow = true;
    group.add(s);
  }

  let nightF = 0;
  function setNight(f) {
    nightF = f;
    light.intensity = 0.7 + 1.6 * f;
    glowMat.opacity = 0.2 + 0.45 * f;
  }

  function update(now) {
    coin.rotation.z = now * 0.0016;
    coin.position.y = 7.6 + Math.sin(now * 0.002) * 0.18;
    signMat.color.setScalar(0.85 + 0.15 * Math.sin(now * 0.004) + nightF * 0.1);
    trim.material.emissiveIntensity = 0.8 + nightF * 1.4;
  }

  function dispose() {
    scene.remove(group);
    signTex.dispose(); signMat.dispose(); glowMat.dispose();
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material !== signMat && o.material !== glowMat) o.material.dispose();
    });
  }

  // El mostrador y la pared frenan al jugador: se compra desde fuera.
  const colliders = [{ x: POS.x, z: POS.z - 1.1, w: 8.4, d: 4 }];

  return { group, position: POS.clone(), radius: 9, colliders, setNight, update, dispose };
}
