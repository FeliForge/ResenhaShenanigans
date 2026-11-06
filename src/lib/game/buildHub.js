// @ts-nocheck
import * as THREE from "three";

/** Mini-kioscos de acceso: Configuración, Música y Personaje.
 *  Solo abren el panel correspondiente (no venden items).
 */

function makeHubSign(label, accent) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const x = c.getContext("2d");
  x.fillStyle = "#12141c";
  x.fillRect(0, 0, 512, 160);
  x.strokeStyle = accent;
  x.lineWidth = 10;
  x.strokeRect(8, 8, 496, 144);
  x.fillStyle = accent;
  x.font = "bold 56px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(label, 256, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeKiosk(group, pos, label, accentHex, kind) {
  const local = new THREE.Group();
  local.position.copy(pos);
  // Orientar hacia el centro (plaza)
  local.rotation.y = Math.atan2(-pos.x, -pos.z);
  group.add(local);

  const accent = new THREE.Color(accentHex);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e1a28, roughness: 0.85, flatShading: true });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex, emissive: accentHex, emissiveIntensity: 0.7, roughness: 0.45, metalness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.35, 10), dark);
  base.position.y = 0.18; base.receiveShadow = true; local.add(base);

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 1.6), wood);
  body.position.set(0, 1.4, 0); body.castShadow = true; local.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 2.1), glowMat);
  roof.position.set(0, 2.7, 0); roof.castShadow = true; local.add(roof);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6), dark);
  pole.position.set(0, 4.2, -0.9); local.add(pole);

  const signTex = makeHubSign(label, `#${accent.getHexString()}`);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.15), signMat);
  sign.position.set(0, 5.6, -0.9); local.add(sign);

  const light = new THREE.PointLight(accentHex, 0.85, 18);
  light.position.set(0, 3.2, 0.6); local.add(light);

  return {
    kind,
    position: pos.clone(),
    radius: 6.5,
    colliders: [{ x: pos.x, z: pos.z, w: 3.6, d: 2.4 }],
    signMat,
    light,
    accentHex,
  };
}

export function buildHub(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Alrededor de la plaza, lejos de la fuente (centro) y de la tienda principal
  const zones = [
    makeKiosk(group, new THREE.Vector3(34, 0, -30), "CONFIG", 0x60a5fa, "settings"),
    makeKiosk(group, new THREE.Vector3(-34, 0, -30), "MÚSICA", 0xf472b6, "music"),
    makeKiosk(group, new THREE.Vector3(0, 0, 38), "PERSONAJE", 0x34d399, "character"),
  ];

  const colliders = zones.flatMap((z) => z.colliders);

  function setNight(f) {
    for (const z of zones) {
      z.light.intensity = 0.45 + 1.1 * f;
    }
  }

  function update(now) {
    for (const z of zones) {
      const pulse = 0.85 + 0.15 * Math.sin(now * 0.003 + z.position.x * 0.1);
      z.signMat.color.setScalar(pulse);
    }
  }

  function dispose() {
    scene.remove(group);
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }

  return { group, zones, colliders, setNight, update, dispose };
}
