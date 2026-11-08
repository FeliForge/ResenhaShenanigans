// @ts-nocheck
import * as THREE from "three";

const AD_URLS = [
  "/ads/ad1.png", "/ads/ad2.png", "/ads/ad3.png",
  "/ads/ad4.png", "/ads/ad5.png", "/ads/ad6.png",
];

const STATE = {
  ready: false,
  mats: [],
  time: { value: 0 },
  geo: null,
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
  STATE.geo = new THREE.PlaneGeometry(4.5, 2.4);
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

/** Place 6 neon ads with TV-static on a hollow building group (local space). */
export function addNeonAds(g, w, d, FLOOR_H = 12) {
  const ads = ensureAds();
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x111118 });
  const slots = [
    { x: 0, y: FLOOR_H * 1.5, z: d / 2 + 0.08, ry: 0 },
    { x: -w * 0.28, y: FLOOR_H * 2.2, z: d / 2 + 0.08, ry: 0 },
    { x: w * 0.28, y: FLOOR_H * 0.85, z: d / 2 + 0.08, ry: 0 },
    { x: -w / 2 - 0.08, y: FLOOR_H * 1.8, z: 0, ry: Math.PI / 2 },
    { x: w / 2 + 0.08, y: FLOOR_H * 1.2, z: -d * 0.15, ry: -Math.PI / 2 },
    { x: w * 0.1, y: FLOOR_H * 2.5, z: -d / 2 - 0.08, ry: Math.PI },
  ];
  for (let i = 0; i < 6; i++) {
    const s = slots[i];
    const mesh = new THREE.Mesh(ads.geo, ads.mats[i]);
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.ry;
    mesh.frustumCulled = true;
    g.add(mesh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.7, 2.6, 0.06), frameMat);
    frame.position.set(s.x - Math.sin(s.ry) * 0.04, s.y, s.z - Math.cos(s.ry) * 0.04);
    frame.rotation.y = s.ry;
    g.add(frame);
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
