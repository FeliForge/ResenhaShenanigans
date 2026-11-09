// @ts-nocheck
import * as THREE from "three";

/**
 * Moving sun/moon billboards using /sky/sun.jpg and /sky/moon.jpg.
 * Sun visible by day, moon by night. Depth-tested so buildings occlude them.
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

  const sunMat = new THREE.SpriteMaterial({
    map: discFallback("sun"),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    depthTest: true, // occluded by buildings
    opacity: 1,
    sizeAttenuation: true,
  });
  const moonMat = new THREE.SpriteMaterial({
    map: discFallback("moon"),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0,
    sizeAttenuation: true,
  });

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

  const SUN_SIZE = 72;
  const MOON_SIZE = 58;
  const sun = new THREE.Sprite(sunMat);
  sun.scale.set(SUN_SIZE, SUN_SIZE, 1);
  sun.renderOrder = -10; // draw before buildings when possible
  sun.frustumCulled = false;

  const moon = new THREE.Sprite(moonMat);
  moon.scale.set(MOON_SIZE, MOON_SIZE, 1);
  moon.renderOrder = -10;
  moon.frustumCulled = false;

  group.add(sun, moon);

  // Must match city day/night period
  const CYCLE_MS = 180000;

  function update(now, night) {
    const t = ((now || 0) % CYCLE_MS) / CYCLE_MS;
    // Align with city autoNight: night peaks near t≈0.5, day near t≈0 / 1
    // Sun high in the sky during day (t≈0), low at night (t≈0.5)
    const sunAngle = t * Math.PI * 2 + Math.PI * 0.5;
    // Far behind city so it sits in the background, not inside building volumes
    const skyR = 520;
    const arc = 0.9;
    const baseY = 80;

    const sx = Math.cos(sunAngle) * skyR;
    const sy = Math.sin(sunAngle) * skyR * arc + baseY;
    const sz = Math.sin(sunAngle * 0.25) * 60;
    // Keep at least above rooftops when "up"; hide below horizon when down
    sun.position.set(sx, sy, sz);
    sun.visible = sy > 15;

    const moonAngle = sunAngle + Math.PI;
    const mx = Math.cos(moonAngle) * skyR;
    const my = Math.sin(moonAngle) * skyR * arc + baseY;
    const mz = Math.sin(moonAngle * 0.25) * 60;
    moon.position.set(mx, my, mz);
    moon.visible = my > 15;

    const n = Number.isFinite(night) ? THREE.MathUtils.clamp(night, 0, 1) : 0;

    // Sun only by day, moon only by night (cross-fade at twilight)
    const day = 1 - n;
    const sunUp = THREE.MathUtils.smoothstep(sy, 20, 80);
    const moonUp = THREE.MathUtils.smoothstep(my, 20, 80);

    sunMat.opacity = THREE.MathUtils.clamp(day * sunUp * 0.95, 0, 0.95);
    moonMat.opacity = THREE.MathUtils.clamp(n * moonUp * 0.95, 0, 0.95);

    sun.scale.set(SUN_SIZE, SUN_SIZE, 1);
    moon.scale.set(MOON_SIZE, MOON_SIZE, 1);
  }

  // Start mid-morning so sun is up
  update(20000, 0.05);

  return { sun, moon, sunMat, moonMat, update };
}
