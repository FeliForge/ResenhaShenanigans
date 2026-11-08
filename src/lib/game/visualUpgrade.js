// @ts-nocheck
// Mejoras visuales de la escena: cielo con gradiente, estrellas, brillo de sol y luna,
// luz de contorno, partículas ambientales (polen de día / luciérnagas de noche) y un
// aura bajo el jugador que crece con la energía del ultimate.
// Es 100 % cosmético: no toca físicas, colisiones, multijugador ni combate, y cualquier
// fallo se queda en el try/catch del llamador sin afectar al juego.
import * as THREE from "three";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

function radialTexture(stops, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Degradado vertical en el canal alfa: opaco en el cenit, transparente en el horizonte.
function skyAlphaTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.5, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const ZENITH_DAY = new THREE.Color(0x3f6fb5);
const ZENITH_NIGHT = new THREE.Color(0x05061a);
const ZENITH_DUSK = new THREE.Color(0x5b2a6b);
const RIM_DAY = new THREE.Color(0xbcd4ff);
const RIM_NIGHT = new THREE.Color(0x7d8cff);
const RIM_DUSK = new THREE.Color(0xff9a6a);
const MOTE_DAY = new THREE.Color(0xfff2cf);
const MOTE_NIGHT = new THREE.Color(0xd8ff6a);
const MOTE_DUSK = new THREE.Color(0xffb36b);

export function installVisualUpgrade({ scene, camera, hemi, dir, moon, accent = "#ffffff" }) {
  const disposables = [];
  const track = (obj) => {
    disposables.push(obj);
    return obj;
  };

  const lowEnd =
    (typeof navigator !== "undefined" && (navigator.hardwareConcurrency || 8) <= 4) ||
    (typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)")?.matches);

  // Sombras algo más limpias (menos "acné" en superficies inclinadas).
  if (dir?.shadow) dir.shadow.normalBias = 0.03;

  // ── Cúpula de cielo con degradado ──────────────────────────────────────────
  const skyTex = track(skyAlphaTexture());
  const domeGeo = track(new THREE.SphereGeometry(600, 24, 16));
  const domeMat = track(
    new THREE.MeshBasicMaterial({
      map: skyTex,
      color: ZENITH_DAY.clone(),
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    })
  );
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -20;
  dome.frustumCulled = false;
  scene.add(dome);

  // ── Estrellas (solo de noche) ──────────────────────────────────────────────
  const starCount = lowEnd ? 260 : 620;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random() * Math.PI * 2;
    const y = 0.06 + Math.random() * 0.94;
    const r = Math.sqrt(1 - y * y);
    starPos[i * 3] = Math.cos(u) * r * 560;
    starPos[i * 3 + 1] = y * 560;
    starPos[i * 3 + 2] = Math.sin(u) * r * 560;
    const b = 0.35 + Math.random() * 0.65;
    starCol[i * 3] = b;
    starCol[i * 3 + 1] = b;
    starCol[i * 3 + 2] = Math.min(1, b + 0.12);
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  const dotTex = track(radialTexture([[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.7)"], [1, "rgba(255,255,255,0)"]], 32));
  const starMat = track(
    new THREE.PointsMaterial({
      size: 2.6,
      sizeAttenuation: false,
      map: dotTex,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -19;
  stars.frustumCulled = false;
  stars.visible = false;
  scene.add(stars);

  // ── Brillo del sol y halo de la luna ───────────────────────────────────────
  const glowTex = track(
    radialTexture([[0, "rgba(255,255,255,1)"], [0.18, "rgba(255,255,255,0.55)"], [0.55, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"]], 256)
  );
  const sunMat = track(
    new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  );
  const sunGlow = new THREE.Sprite(sunMat);
  sunGlow.scale.set(230, 230, 1);
  sunGlow.renderOrder = -18;
  sunGlow.frustumCulled = false;
  scene.add(sunGlow);

  let moonGlow = null;
  let moonMat = null;
  if (moon) {
    moonMat = track(
      new THREE.SpriteMaterial({ map: glowTex, color: 0xcfd8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    );
    moonGlow = new THREE.Sprite(moonMat);
    moonGlow.scale.set(46, 46, 1);
    moonGlow.renderOrder = -17;
    moonGlow.frustumCulled = false;
    scene.add(moonGlow);
  }

  // ── Luz de contorno (da volumen a los edificios a contraluz) ──────────────
  const rim = new THREE.DirectionalLight(RIM_DAY.clone(), 0.12);
  rim.castShadow = false;
  rim.position.set(-60, 40, -40);
  scene.add(rim);

  // ── Partículas ambientales (dos grupos en contrafase = parpadeo) ──────────
  const R = 26;
  const Y0 = 0.5;
  const Y1 = 7.5;
  const perGroup = lowEnd ? 40 : 90;
  const moteTex = track(radialTexture([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.55)"], [1, "rgba(255,255,255,0)"]], 64));
  const groups = [0, 1].map((gi) => {
    const pos = new Float32Array(perGroup * 3);
    const vel = new Float32Array(perGroup * 3);
    const ph = new Float32Array(perGroup);
    for (let i = 0; i < perGroup; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * R;
      pos[i * 3 + 1] = Y0 + Math.random() * (Y1 - Y0);
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * R;
      vel[i * 3] = (Math.random() - 0.5) * 0.5;
      vel[i * 3 + 1] = 0.05 + Math.random() * 0.25;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      ph[i] = Math.random() * Math.PI * 2;
    }
    const geo = track(new THREE.BufferGeometry());
    const attr = new THREE.BufferAttribute(pos, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", attr);
    const mat = track(
      new THREE.PointsMaterial({
        size: 0.34,
        map: moteTex,
        color: MOTE_DAY.clone(),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, geo, mat, attr, pos, vel, ph, gi };
  });
  let spawned = false;

  // ── Aura bajo el jugador (anillo + resplandor) ─────────────────────────────
  const accentColor = new THREE.Color(accent);
  const ringGeo = track(new THREE.RingGeometry(0.85, 1.12, 48));
  const ringMat = track(
    new THREE.MeshBasicMaterial({ color: accentColor.clone(), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  scene.add(ring);
  const discGeo = track(new THREE.PlaneGeometry(4.4, 4.4));
  const discMat = track(
    new THREE.MeshBasicMaterial({ map: glowTex, color: accentColor.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.renderOrder = 1;
  scene.add(disc);

  const sunDirV = new THREE.Vector3();
  const tmp = new THREE.Color();

  function update(dt, ctx) {
    const { elapsed = 0, nightFactor = 0, dusk = 0, player, meter = 0, dead = false } = ctx || {};
    const night = clamp01(nightFactor);
    const day = 1 - night;

    // Cielo: sigue a la cámara; el color del cenit cambia con la hora.
    dome.position.copy(camera.position);
    domeMat.color.copy(ZENITH_DAY).lerp(ZENITH_NIGHT, night).lerp(ZENITH_DUSK, clamp01(dusk) * 0.55);

    // Estrellas con ligero titileo global.
    const starA = smooth(0.5, 0.9, night);
    stars.visible = starA > 0.01;
    if (stars.visible) {
      stars.position.copy(camera.position);
      starMat.opacity = starA * (0.82 + 0.18 * Math.sin(elapsed * 1.7));
    }

    // Brillo del sol sobre el horizonte.
    sunDirV.copy(dir.position).normalize();
    sunGlow.position.copy(camera.position).addScaledVector(sunDirV, 520);
    sunMat.color.copy(dir.color);
    sunMat.opacity = clamp01(day * 0.7 + clamp01(dusk) * 0.6) * (0.85 + 0.15 * Math.sin(elapsed * 0.6));

    if (moonGlow) {
      moonGlow.visible = !!moon.visible;
      if (moonGlow.visible) {
        moonGlow.position.copy(moon.position);
        moonMat.opacity = night * 0.55;
      }
    }

    // Luz de contorno opuesta al sol.
    rim.position.set(-dir.position.x * 0.6, 40, -dir.position.z * 0.6);
    rim.intensity = 0.12 + 0.3 * night + 0.1 * clamp01(dusk);
    rim.color.copy(RIM_DAY).lerp(RIM_NIGHT, night).lerp(RIM_DUSK, clamp01(dusk) * 0.6);

    // Partículas ambientales: mundo fijo, se reciclan alrededor del jugador.
    const px = player ? player.x : 0;
    const pz = player ? player.z : 0;
    if (!spawned && player) {
      for (const g of groups) {
        for (let i = 0; i < perGroup; i++) {
          g.pos[i * 3] += px;
          g.pos[i * 3 + 2] += pz;
        }
      }
      spawned = true;
    }
    tmp.copy(MOTE_DAY).lerp(MOTE_NIGHT, night).lerp(MOTE_DUSK, clamp01(dusk) * 0.5);
    for (const g of groups) {
      const p = g.pos;
      for (let i = 0; i < perGroup; i++) {
        const k = i * 3;
        const sway = Math.sin(elapsed * 0.9 + g.ph[i]) * 0.35;
        p[k] += (g.vel[k] + sway * 0.4) * dt;
        p[k + 1] += g.vel[k + 1] * dt * (0.4 + 0.6 * day + 0.3);
        p[k + 2] += (g.vel[k + 2] + Math.cos(elapsed * 0.8 + g.ph[i]) * 0.3) * dt;
        if (p[k] - px > R) p[k] -= 2 * R;
        else if (p[k] - px < -R) p[k] += 2 * R;
        if (p[k + 2] - pz > R) p[k + 2] -= 2 * R;
        else if (p[k + 2] - pz < -R) p[k + 2] += 2 * R;
        if (p[k + 1] > Y1) p[k + 1] = Y0;
      }
      g.attr.needsUpdate = true;
      g.mat.color.copy(tmp);
      g.mat.size = 0.3 + 0.18 * night;
      const pulse = g.gi === 0 ? Math.sin(elapsed * 2.1) : Math.cos(elapsed * 2.1);
      g.mat.opacity = 0.28 + 0.32 * night + 0.18 * pulse * (0.4 + night);
    }

    // Aura del jugador: más intensa cuanto más llena está la energía.
    if (player) {
      const n = clamp01(meter / 100);
      const full = n >= 1;
      const alive = !dead;
      const y = Math.max(0.08, player.y - 1.6 + 0.08);
      ring.position.set(player.x, y, player.z);
      disc.position.set(player.x, y - 0.01, player.z);
      const pulse = full ? 0.5 + 0.5 * Math.sin(elapsed * 6) : 0;
      const s = 1 + (full ? 0.1 * pulse : 0) + n * 0.12;
      ring.scale.set(s, s, 1);
      ringMat.opacity = alive ? 0.1 + 0.28 * n + (full ? 0.3 * pulse : 0) : 0;
      discMat.opacity = alive ? 0.12 + 0.3 * n + (full ? 0.25 * pulse : 0) : 0;
    }
  }

  function dispose() {
    for (const o of [dome, stars, sunGlow, moonGlow, rim, ring, disc, ...groups.map((g) => g.pts)]) {
      if (o) scene.remove(o);
    }
    for (const d of disposables) d?.dispose?.();
  }

  return { update, dispose };
}
