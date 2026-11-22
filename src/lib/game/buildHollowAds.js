// @ts-nocheck
import * as THREE from "three";

const AD_URLS = [
  "/ads/ad1.jpg", "/ads/ad2.jpg", "/ads/ad3.jpg",
  "/ads/ad4.jpg", "/ads/ad5.jpg", "/ads/ad6.jpg",
];

const STATE = {
  ready: false,
  mats: [],
  time: { value: 0 },
};

function makeAdFallback(i) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d");
  const colors = ["#ff2d95", "#00e5ff", "#d500f9", "#ff6b00", "#39ff14", "#ffea00"];
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = colors[i % 6];
  ctx.font = "bold 36px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AD " + (i + 1), 128, 64);
  ctx.strokeStyle = colors[i % 6];
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ensureAds() {
  if (STATE.ready) return STATE;
  for (let i = 0; i < 6; i++) {
    const tex = makeAdFallback(i);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        time: STATE.time,
        glow: { value: new THREE.Color(0xff66cc) },
        night: { value: 0.5 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float time;
        uniform vec3 glow;
        uniform float night;
        varying vec2 vUv;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
          vec4 col = texture2D(map, vUv);
          float n = hash(vUv * 40.0 + vec2(time * 12.0, time * 7.3));
          float n2 = hash(vUv * 90.0 - vec2(time * 18.0, time * 5.1));
          float staticAmt = 0.12 + 0.08 * sin(time * 3.7 + vUv.y * 20.0);
          staticAmt += step(0.985, hash(vec2(floor(time * 8.0), 0.3))) * 0.35;
          vec3 noisy = mix(col.rgb, vec3(n, n2, n * n2), staticAmt);
          float scan = 0.92 + 0.08 * sin(vUv.y * 180.0 + time * 6.0);
          noisy *= scan;
          float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x)
                     * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          noisy += glow * (0.08 + 0.18 * night) * (1.0 - edge);
          gl_FragColor = vec4(noisy, max(col.a, 0.85));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    STATE.mats.push(mat);
  }
  if (typeof document !== "undefined") {
    const loader = new THREE.TextureLoader();
    AD_URLS.forEach((url, i) => {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 2;
        STATE.mats[i].uniforms.map.value = tex;
        STATE.mats[i].needsUpdate = true;
      }, undefined, () => {});
    });
  }
  STATE.ready = true;
  return STATE;
}

/**
 * Place neon ads flush on hollow building faces.
 * Scales to building size and clamps Y so ads never float above the roof.
 */
export function addNeonAds(g, w, d, FLOOR_H = 12, floors = 3) {
  const ads = ensureAds();
  const H = floors * FLOOR_H;
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x111118 });

  // Ad size scales with facade; keep readable but never wider than ~70% of face
  const adW = Math.min(10, Math.max(4.5, Math.min(w, d) * 0.42));
  const adH = adW * 0.55;
  const margin = adH * 0.55 + 0.4;
  const yMin = margin + 1.2;
  const yMax = H - margin - 0.3;

  const clampY = (y) => Math.min(yMax, Math.max(yMin, y));

  // Relative slots: front, sides, back — all on wall surface
  const slots = [
    { x: 0, y: clampY(FLOOR_H * 1.35), z: d / 2 + 0.06, ry: 0, face: "front" },
    { x: -w * 0.22, y: clampY(FLOOR_H * 0.7), z: d / 2 + 0.06, ry: 0, face: "front" },
    { x: w * 0.22, y: clampY(H * 0.55), z: d / 2 + 0.06, ry: 0, face: "front" },
    { x: -w / 2 - 0.06, y: clampY(FLOOR_H * 1.5), z: 0, ry: Math.PI / 2, face: "left" },
    { x: w / 2 + 0.06, y: clampY(FLOOR_H * 1.1), z: -d * 0.12, ry: -Math.PI / 2, face: "right" },
    { x: w * 0.08, y: clampY(H * 0.62), z: -d / 2 - 0.06, ry: Math.PI, face: "back" },
  ];

  // Avoid overlapping ads on same face when building is narrow
  const used = [];
  let placed = 0;
  for (let i = 0; i < slots.length && placed < 6; i++) {
    const s = slots[i];
    // Skip if too close to another on same face
    let overlap = false;
    for (const u of used) {
      if (u.face !== s.face) continue;
      const dx = u.x - s.x;
      const dy = u.y - s.y;
      const dz = u.z - s.z;
      if (dx * dx + dy * dy + dz * dz < (adW * 0.85) * (adW * 0.85)) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    // Face-width check: keep ad fully on facade
    if (s.face === "front" || s.face === "back") {
      if (Math.abs(s.x) + adW * 0.5 > w * 0.48) continue;
    } else {
      if (Math.abs(s.z) + adW * 0.5 > d * 0.48) continue;
    }

    const geo = new THREE.PlaneGeometry(adW, adH);
    const mesh = new THREE.Mesh(geo, ads.mats[placed % ads.mats.length]);
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.ry;
    mesh.frustumCulled = true;
    g.add(mesh);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(adW + 0.28, adH + 0.28, 0.07),
      frameMat
    );
    // Slightly behind the plane so plane is visible
    const nx = Math.sin(s.ry);
    const nz = Math.cos(s.ry);
    frame.position.set(s.x - nx * 0.04, s.y, s.z - nz * 0.04);
    frame.rotation.y = s.ry;
    g.add(frame);

    used.push(s);
    placed++;
  }
}

export function updateHollowEffects(now, night) {
  if (!STATE.ready) return;
  STATE.time.value = (now || 0) * 0.001;
  const n = Number.isFinite(night) ? night : 0.5;
  for (const mat of STATE.mats) {
    if (mat.uniforms?.night) mat.uniforms.night.value = n;
  }
}
