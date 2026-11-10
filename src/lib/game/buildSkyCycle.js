// @ts-nocheck
import * as THREE from "three";

/**
 * Day/night sun & moon as textured planes (polygons) that always face the camera.
 * depthTest keeps them behind buildings instead of overlaying the city.
 * Textures: /sky/sun.jpg and /sky/moon.jpg
 */
export function createSkyCycle(group) {
  const loader = new THREE.TextureLoader();

  function discFallback(kind) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 512);
    if (kind === "sun") {
      const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 250);
      g.addColorStop(0, "rgba(255,255,240,1)");
      g.addColorStop(0.25, "rgba(255,220,80,0.95)");
      g.addColorStop(0.55, "rgba(255,140,40,0.55)");
      g.addColorStop(1, "rgba(255,100,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(256, 256, 250, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(256, 256, 16, 256, 256, 240);
      g.addColorStop(0, "rgba(245,248,255,1)");
      g.addColorStop(0.4, "rgba(180,200,240,0.9)");
      g.addColorStop(0.75, "rgba(100,120,180,0.35)");
      g.addColorStop(1, "rgba(40,50,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(256, 256, 240, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(90,100,130,0.35)";
      [[200, 190, 28], [300, 250, 18], [240, 300, 12]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeBody(size, map, opacity) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map,
      color: 0xffffff,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -5;
    mesh.frustumCulled = false;
    // Always face the active camera (billboard) without overlaying geometry
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      mesh.quaternion.copy(camera.quaternion);
    };
    return { mesh, mat, geo };
  }

  const sunBody = makeBody(64, discFallback("sun"), 1);
  const moonBody = makeBody(52, discFallback("moon"), 0);
  const sun = sunBody.mesh;
  const moon = moonBody.mesh;
  const sunMat = sunBody.mat;
  const moonMat = moonBody.mat;

  function applyTex(mat, url) {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        const old = mat.map;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        if (old?.dispose) old.dispose();
      },
      undefined,
      () => {}
    );
  }
  applyTex(sunMat, "/sky/sun.jpg");
  applyTex(moonMat, "/sky/moon.jpg");

  group.add(sun, moon);

  const CYCLE_MS = 180000;
  const skyR = 480;
  const arc = 0.88;
  const baseY = 90;

  function update(now, night) {
    const t = ((now || 0) % CYCLE_MS) / CYCLE_MS;
    // Day: sun high near t≈0; night peaks near t≈0.5 (matches city autoNight)
    const sunAngle = t * Math.PI * 2 + Math.PI * 0.5;

    const sx = Math.cos(sunAngle) * skyR;
    const sy = Math.sin(sunAngle) * skyR * arc + baseY;
    const sz = Math.sin(sunAngle * 0.25) * 50;
    sun.position.set(sx, sy, sz);
    sun.visible = sy > 12;

    const moonAngle = sunAngle + Math.PI;
    const mx = Math.cos(moonAngle) * skyR;
    const my = Math.sin(moonAngle) * skyR * arc + baseY;
    const mz = Math.sin(moonAngle * 0.25) * 50;
    moon.position.set(mx, my, mz);
    moon.visible = my > 12;

    const n = Number.isFinite(night) ? THREE.MathUtils.clamp(night, 0, 1) : 0;
    const day = 1 - n;
    const sunUp = THREE.MathUtils.smoothstep(sy, 18, 70);
    const moonUp = THREE.MathUtils.smoothstep(my, 18, 70);

    sunMat.opacity = THREE.MathUtils.clamp(day * sunUp, 0, 1);
    moonMat.opacity = THREE.MathUtils.clamp(n * moonUp, 0, 1);
  }

  update(20000, 0.05);

  return { sun, moon, sunMat, moonMat, update };
}
