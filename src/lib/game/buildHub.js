// @ts-nocheck
import * as THREE from "three";

/** Mini-puestos estilo tienda original: Configuración, Música y Personaje.
 *  Misma estética (tarima, carpa, cartel luminoso, adorno flotante).
 *  Solo abren el panel correspondiente (no venden items).
 */

function makeHubSign(label, accentHex, icon) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 512, 160);
  g.addColorStop(0, "#1a1024");
  g.addColorStop(1, "#2a1428");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 160);
  x.strokeStyle = accentHex;
  x.lineWidth = 8;
  x.strokeRect(6, 6, 500, 148);

  // icono circular a la izquierda
  x.beginPath();
  x.arc(64, 80, 34, 0, Math.PI * 2);
  x.fillStyle = accentHex;
  x.fill();
  x.fillStyle = "#1a1024";
  x.font = "bold 36px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(icon, 64, 84);

  x.fillStyle = accentHex;
  x.font = "bold 56px sans-serif";
  x.fillText(label, 300, 82);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeKiosk(group, pos, label, accentHex, kind, icon) {
  const local = new THREE.Group();
  local.position.copy(pos);
  local.rotation.y = Math.atan2(-pos.x, -pos.z);
  group.add(local);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.85, flatShading: true });
  // tela de la carpa teñida con el acento del kiosco
  const clothMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.92, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex, emissive: accentHex, emissiveIntensity: 1.2, roughness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex, emissive: accentHex, emissiveIntensity: 0.85, metalness: 0.55, roughness: 0.35,
  });

  // tarima circular (como la tienda)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.4, 12), darkMat);
  base.position.y = 0.2;
  base.receiveShadow = true;
  local.add(base);

  // mostrador
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.05, 1.4), woodMat);
  counter.position.set(0, 0.95, 0.95);
  counter.castShadow = true;
  counter.receiveShadow = true;
  local.add(counter);

  // postes de la carpa
  const postGeo = new THREE.BoxGeometry(0.28, 3.4, 0.28);
  for (const [px, pz] of [[-2.1, -1.5], [2.1, -1.5], [-2.1, 1.5], [2.1, 1.5]]) {
    const p = new THREE.Mesh(postGeo, woodMat);
    p.position.set(px, 1.9, pz);
    p.castShadow = true;
    local.add(p);
  }

  // techo de carpa
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.38, 3.8), clothMat);
  roof.position.set(0, 3.7, 0);
  roof.castShadow = true;
  local.add(roof);

  // ribete luminoso bajo el techo
  const trim = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.16, 3.95), trimMat);
  trim.position.set(0, 3.48, 0);
  local.add(trim);

  // pared trasera
  const back = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.6, 0.28), darkMat);
  back.position.set(0, 1.7, -1.7);
  back.castShadow = true;
  local.add(back);

  // cartel luminoso
  const signTex = makeHubSign(label, `#${new THREE.Color(accentHex).getHexString()}`, icon);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.35), signMat);
  sign.position.set(0, 4.7, 0.05);
  local.add(sign);

  // glow detrás del cartel
  const glowMat = new THREE.MeshBasicMaterial({
    color: accentHex, transparent: true, opacity: 0.32,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.0), glowMat);
  glow.position.set(0, 4.7, -0.1);
  local.add(glow);

  // adorno flotante (equivalente a la moneda de la tienda)
  let ornament;
  if (kind === "settings") {
    // engranaje simplificado: disco + dientes
    ornament = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), accentMat);
    disc.rotation.x = Math.PI / 2;
    ornament.add(disc);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.35), accentMat);
      tooth.position.set(Math.cos(ang) * 0.7, Math.sin(ang) * 0.7, 0);
      tooth.rotation.z = ang;
      ornament.add(tooth);
    }
  } else if (kind === "music") {
    // nota musical: círculo + tallo
    ornament = new THREE.Group();
    const note = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), accentMat);
    note.scale.set(1.15, 0.85, 1);
    ornament.add(note);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), accentMat);
    stem.position.set(0.35, 0.55, 0);
    ornament.add(stem);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.1), accentMat);
    flag.position.set(0.55, 1.05, 0);
    ornament.add(flag);
  } else {
    // silueta de personaje: cabeza + cuerpo
    ornament = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), accentMat);
    head.position.y = 0.55;
    ornament.add(head);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.85, 8), accentMat);
    body.position.y = -0.15;
    ornament.add(body);
  }
  ornament.position.set(0, 5.85, 0);
  local.add(ornament);

  // luz del puesto
  const light = new THREE.PointLight(accentHex, 1.05, 20);
  light.position.set(0, 3.4, 1.0);
  local.add(light);

  // sacos decorativos (escala reducida)
  const sackMat = new THREE.MeshStandardMaterial({ color: 0x8a7440, roughness: 1, flatShading: true });
  for (const [sx, sz, sc] of [[-2.8, 0.6, 0.7], [2.9, 0.4, 0.6], [-2.6, -1.3, 0.55]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 6), sackMat);
    s.position.set(sx, 0.45 * sc, sz);
    s.scale.set(sc, sc * 1.15, sc);
    s.castShadow = true;
    local.add(s);
  }

  return {
    kind,
    position: pos.clone(),
    radius: 7,
    colliders: [{ x: pos.x, z: pos.z, w: 5.2, d: 3.6 }],
    signMat,
    glowMat,
    trimMat,
    light,
    ornament,
    accentHex,
  };
}

export function buildHub(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Alrededor de la plaza, lejos de la fuente y de la tienda principal
  const zones = [
    makeKiosk(group, new THREE.Vector3(34, 0, -30), "CONFIG", 0x60a5fa, "settings", "⚙"),
    makeKiosk(group, new THREE.Vector3(-34, 0, -30), "MÚSICA", 0xf472b6, "music", "♪"),
    makeKiosk(group, new THREE.Vector3(0, 0, 38), "PERSONAJE", 0x34d399, "character", "★"),
  ];

  const colliders = zones.flatMap((z) => z.colliders);

  function setNight(f) {
    for (const z of zones) {
      z.light.intensity = 0.55 + 1.35 * f;
      z.glowMat.opacity = 0.18 + 0.4 * f;
      z.trimMat.emissiveIntensity = 0.7 + 1.2 * f;
    }
  }

  function update(now) {
    for (const z of zones) {
      const pulse = 0.88 + 0.12 * Math.sin(now * 0.0035 + z.position.x * 0.08);
      z.signMat.color.setScalar(pulse);
      // adorno flotante girando / flotando
      if (z.ornament) {
        z.ornament.rotation.y = now * 0.0018;
        z.ornament.position.y = 5.85 + Math.sin(now * 0.0022 + z.position.z * 0.05) * 0.16;
      }
    }
  }

  function dispose() {
    scene.remove(group);
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => { m.map?.dispose(); m.dispose(); });
        else { o.material.map?.dispose(); o.material.dispose(); }
      }
    });
  }

  return { group, zones, colliders, setNight, update, dispose };
}
