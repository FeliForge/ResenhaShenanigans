// @ts-nocheck
import * as THREE from "three";

/** Create sun/moon sprites. Returns { sun, moon, sunMat, moonMat, update(now, night) }. */
export function createSkyCycle(group) {
  const loader = new THREE.TextureLoader();
  const sunMat = new THREE.SpriteMaterial({
    color: 0xfff0c0, transparent: true, depthWrite: false, opacity: 1,
  });
  const moonMat = new THREE.SpriteMaterial({
    color: 0xc0d0ff, transparent: true, depthWrite: false, opacity: 0,
  });

  {
    const sc = document.createElement("canvas"); sc.width = 128; sc.height = 128;
    const sctx = sc.getContext("2d");
    const grd = sctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grd.addColorStop(0, "#fff8e0"); grd.addColorStop(0.4, "#ffd060"); grd.addColorStop(1, "rgba(255,160,40,0)");
    sctx.fillStyle = grd; sctx.beginPath(); sctx.arc(64, 64, 60, 0, Math.PI * 2); sctx.fill();
    sunMat.map = new THREE.CanvasTexture(sc); sunMat.map.colorSpace = THREE.SRGBColorSpace;

    const mc = document.createElement("canvas"); mc.width = 128; mc.height = 128;
    const mctx = mc.getContext("2d");
    const mgrd = mctx.createRadialGradient(64, 64, 6, 64, 64, 55);
    mgrd.addColorStop(0, "#f0f4ff"); mgrd.addColorStop(0.5, "#b0c0e8"); mgrd.addColorStop(1, "rgba(80,100,160,0)");
    mctx.fillStyle = mgrd; mctx.beginPath(); mctx.arc(64, 64, 55, 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = "rgba(100,110,140,0.35)";
    mctx.beginPath(); mctx.arc(48, 52, 8, 0, Math.PI * 2); mctx.fill();
    mctx.beginPath(); mctx.arc(72, 70, 5, 0, Math.PI * 2); mctx.fill();
    moonMat.map = new THREE.CanvasTexture(mc); moonMat.map.colorSpace = THREE.SRGBColorSpace;
  }

  loader.load("/sky/sun.jpg", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace; sunMat.map = tex; sunMat.needsUpdate = true;
  }, undefined, () => {});
  loader.load("/sky/moon.jpg", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace; moonMat.map = tex; moonMat.needsUpdate = true;
  }, undefined, () => {});

  const sun = new THREE.Sprite(sunMat);
  sun.scale.set(48, 48, 1);
  const moon = new THREE.Sprite(moonMat);
  moon.scale.set(36, 36, 1);
  group.add(sun, moon);

  function update(now, night) {
    const cycle = ((now || 0) % 240000) / 240000;
    const sunAngle = cycle * Math.PI * 2 - Math.PI * 0.15;
    const skyR = 220;
    const skyY = 40;
    sun.position.set(Math.cos(sunAngle) * skyR, Math.sin(sunAngle) * skyR * 0.55 + skyY, Math.sin(sunAngle * 0.3) * 40);
    const moonAngle = sunAngle + Math.PI;
    moon.position.set(Math.cos(moonAngle) * skyR, Math.sin(moonAngle) * skyR * 0.55 + skyY, Math.sin(moonAngle * 0.3) * 40);
    const n = Number.isFinite(night) ? night : 0;
    sunMat.opacity = THREE.MathUtils.clamp(1.15 - n * 1.4, 0, 1);
    moonMat.opacity = THREE.MathUtils.clamp(n * 1.2 - 0.15, 0, 1);
  }

  return { sun, moon, sunMat, moonMat, update };
}
