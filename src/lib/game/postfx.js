// @ts-nocheck
// Pipeline de post-procesado (bloom + grading cinematográfico + FXAA/MSAA) y regulador
// adaptativo de rendimiento. Se engancha a GameCanvas desde scripts/prebuild.mjs.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { getGfxProfile, GFX_EVENT } from "./gfxProfile";

/* Valores de ajuste fino (se ven mejor tocando solo estos). */
const BLOOM_STRENGTH = { day: 0.2, night: 0.45 };
const BLOOM_THRESHOLD = { day: 0.92, night: 0.78 };
const BLOOM_RADIUS = 0.55;
// Escala de pixel ratio por nivel del regulador (0 = calidad completa).
const DPR_STEPS = [1, 0.85, 0.7, 0.7, 0.6];
const MAX_LEVEL = DPR_STEPS.length - 1;

const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uCA: { value: 0 },
    uVig: { value: 0.6 },
    uGrain: { value: 0 },
    uSharpen: { value: 0 },
    uSat: { value: 1.05 },
    uContrast: { value: 0.1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Entrada: color ya con tone mapping y sRGB (OutputPass). Trabaja en espacio de pantalla.
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uTime, uNight, uCA, uVig, uGrain, uSharpen, uSat, uContrast;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // Aberración cromática radial (0 en el centro, crece hacia los bordes).
      vec2 off = c * r2 * uCA * 8.0;
      vec3 col = vec3(
        texture2D(tDiffuse, uv + off).r,
        texture2D(tDiffuse, uv).g,
        texture2D(tDiffuse, uv - off).b
      );

      // Nitidez suave (unsharp mask de 4 taps) para compensar el reescalado dinámico.
      if (uSharpen > 0.0) {
        vec2 px = 1.0 / uRes;
        vec3 b = texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb
               + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb
               + texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb
               + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb;
        col += (col - b * 0.25) * uSharpen;
      }
      col = max(col, 0.0);

      // Split-toning: sombras frías (violeta de noche), luces cálidas.
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 sh = mix(vec3(0.94, 1.0, 1.05), vec3(0.88, 0.93, 1.12), uNight);
      vec3 hi = mix(vec3(1.05, 1.02, 0.95), vec3(1.0, 0.95, 1.06), uNight);
      col *= mix(sh, hi, smoothstep(0.12, 0.8, l));

      // Saturación (un poco más viva de noche para que el neón destaque) y curva S.
      col = mix(vec3(l), col, uSat + uNight * 0.06);
      col = clamp(col, 0.0, 1.0);
      col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);

      // Viñeta (más cerrada de noche).
      float d = sqrt(r2) * 1.4142;
      float v = 1.0 - smoothstep(0.45, 1.05, d);
      col *= mix(1.0, mix(0.55, 1.0, v), clamp(uVig + uNight * 0.15, 0.0, 1.0));

      // Grano de película; la parte fija actúa de dither contra el banding de 8 bits.
      float g = hash12(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
      col += g * (uGrain + 0.004);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

function createPostFxUnsafe({ renderer, scene, camera, mount, dir, profile }) {
  const canvas = renderer.domElement;
  const gl = renderer.getContext();
  const size = { w: Math.max(1, mount.clientWidth), h: Math.max(1, mount.clientHeight) };

  let prof = profile || getGfxProfile();
  let tier = prof.tier;
  let usePost = prof.post;
  let composer = null;
  let passes = {};
  let level = 0;            // nivel del regulador (0 = calidad completa)
  let frame = 0;
  let lost = false;
  let lastRaf = 0;
  let lastDraw = 0;
  let ema = 0;              // frame time suavizado (ms) entre rAF consecutivos
  let refreshMs = 0;        // intervalo mínimo observado = refresco del monitor
  let samples = 0;
  let badMs = 0, goodMs = 0, lastGov = 0, lastChange = 0;
  let upCooldown = 8000, lastUpAt = 0;

  const effPixelRatio = () => Math.max(0.5, prof.pixelRatio * DPR_STEPS[level]);
  const bloomOn = () => tier.bloom && level < 2;
  const postActive = () => usePost && level < 3 && !!composer;

  function applyShadows() {
    const base = tier.shadowMap;
    if (dir?.shadow) {
      if (dir.shadow.mapSize.x !== base) {
        dir.shadow.mapSize.set(base, base);
        dir.shadow.map?.dispose();
        dir.shadow.map = null;
      }
      dir.castShadow = level < 4;
    }
    // Con shadowEvery > 1 el mapa se recalcula cada N frames (el sol se mueve despacio).
    const every = Math.max(tier.shadowEvery, level >= 3 ? 2 : 1);
    renderer.shadowMap.autoUpdate = every === 1;
  }

  function applySize() {
    renderer.setPixelRatio(effPixelRatio());
    renderer.setSize(size.w, size.h);
    if (composer) {
      composer.setPixelRatio(effPixelRatio());
      composer.setSize(size.w, size.h);
      if (passes.fxaa) {
        const pr = effPixelRatio();
        passes.fxaa.material.uniforms.resolution.value.set(1 / (size.w * pr), 1 / (size.h * pr));
      }
    }
    if (passes.cine) passes.cine.uniforms.uRes.value.set(size.w * effPixelRatio(), size.h * effPixelRatio());
  }

  function disposeComposer() {
    if (!composer) return;
    try {
      for (const p of composer.passes) p.dispose?.();
      composer.renderTarget1?.dispose();
      composer.renderTarget2?.dispose();
    } catch { /* ya liberado */ }
    composer = null;
    passes = {};
  }

  function framebufferOk() {
    try {
      renderer.setRenderTarget(composer.readBuffer);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      renderer.setRenderTarget(null);
      return ok;
    } catch {
      try { renderer.setRenderTarget(null); } catch { /* nada */ }
      return false;
    }
  }

  function buildComposer(opts) {
    const pr = effPixelRatio();
    const rt = new THREE.WebGLRenderTarget(
      Math.max(1, Math.round(size.w * pr)),
      Math.max(1, Math.round(size.h * pr)),
      { type: opts.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: opts.msaa },
    );
    const c = new EffectComposer(renderer, rt);
    c.setPixelRatio(pr);
    c.setSize(size.w, size.h);
    const p = {};
    c.addPass(new RenderPass(scene, camera));
    if (opts.bloom) {
      p.bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.3, BLOOM_RADIUS, 0.9);
      c.addPass(p.bloom);
    }
    c.addPass(new OutputPass());
    if (opts.fxaa) {
      p.fxaa = new ShaderPass(FXAAShader);
      c.addPass(p.fxaa);
    }
    p.cine = new ShaderPass(CinematicShader);
    c.addPass(p.cine);
    composer = c;
    passes = p;
    applySize();
  }

  function rebuild() {
    disposeComposer();
    if (!usePost) { applyShadows(); applySize(); return; }
    // Intenta la configuración pedida y degrada si el framebuffer no es válido en este GPU/navegador.
    const attempts = [
      { hdr: tier.hdr, msaa: tier.msaa, bloom: tier.bloom, fxaa: tier.fxaa },
      { hdr: tier.hdr, msaa: 0, bloom: tier.bloom, fxaa: true },
      { hdr: false, msaa: 0, bloom: false, fxaa: true },
    ];
    for (const a of attempts) {
      try {
        buildComposer(a);
        if (framebufferOk()) break;
      } catch (e) {
        console.warn("[gfx] composer falló, degradando", e?.message || e);
      }
      disposeComposer();
    }
    if (!composer) {
      usePost = false;
      renderer.setPixelRatio(effPixelRatio());
      renderer.setSize(size.w, size.h);
    }
    applyShadows();
  }

  /* ---------------------------------------------------------------- regulador */

  function setLevel(next, now) {
    next = Math.max(0, Math.min(MAX_LEVEL, next));
    if (next === level) return;
    const prevDpr = effPixelRatio();
    level = next;
    lastChange = now;
    badMs = 0; goodMs = 0;
    applyShadows();
    if (Math.abs(effPixelRatio() - prevDpr) > 1e-3) applySize();
  }

  function govern(now, rafMs) {
    if (rafMs > 250) return; // pestaña en segundo plano / hitch puntual: no cuenta
    ema = ema ? ema * 0.92 + rafMs * 0.08 : rafMs;
    if (samples < 240) {
      samples++;
      if (rafMs > 2 && (!refreshMs || rafMs < refreshMs)) refreshMs = rafMs;
    }
    if (samples < 90) return;
    if (!lastGov) { lastGov = now; lastChange = now; return; }
    if (now - lastGov < 500) return;
    const step = now - lastGov;
    lastGov = now;
    const holdsVsync = ema < Math.max(refreshMs, 16.7) * 1.15;
    if (ema > 21) { badMs += step; goodMs = 0; }
    else { badMs = Math.max(0, badMs - step); goodMs = holdsVsync ? goodMs + step : 0; }

    if (badMs >= 2000 && now - lastChange > 3000 && level < MAX_LEVEL) {
      // Si justo acabamos de subir y volvió a caer, esperar más antes del próximo intento.
      if (lastUpAt && now - lastUpAt < 15000) upCooldown = Math.min(upCooldown * 2, 120000);
      setLevel(level + 1, now);
    } else if (goodMs >= upCooldown && level > 0 && now - lastChange > upCooldown) {
      lastUpAt = now;
      setLevel(level - 1, now);
    }
  }

  /* ------------------------------------------------------------------ eventos */

  const onLost = (e) => { e.preventDefault(); lost = true; };
  const onRestored = () => { lost = false; rebuild(); };
  const onSettings = () => {
    prof = getGfxProfile();
    tier = prof.tier;
    usePost = prof.post;
    level = 0; badMs = goodMs = 0; upCooldown = 8000;
    rebuild();
  };
  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);
  window.addEventListener(GFX_EVENT, onSettings);

  rebuild();

  /* ---------------------------------------------------------------------- API */

  return {
    get profile() { return prof; },
    get level() { return level; },

    setSize(w, h) {
      size.w = Math.max(1, w); size.h = Math.max(1, h);
      applySize();
    },

    render(dt, elapsed, night = 0) {
      const now = performance.now();
      const rafMs = lastRaf ? now - lastRaf : 16.7;
      lastRaf = now;
      if (lost || document.hidden) return;
      govern(now, rafMs);

      // Tope de render en monitores de alta frecuencia (la lógica sigue a cada rAF).
      if (tier.maxFps && refreshMs && refreshMs < 1000 / (tier.maxFps * 1.3)) {
        if (now - lastDraw < (1000 / tier.maxFps) * 0.85) return;
      }
      lastDraw = now;

      frame++;
      if (!renderer.shadowMap.autoUpdate) {
        const every = Math.max(tier.shadowEvery, level >= 3 ? 2 : 1);
        renderer.shadowMap.needsUpdate = frame % every === 1 % every;
      }

      if (!postActive()) { renderer.render(scene, camera); return; }

      const n = Math.min(1, Math.max(0, night));
      if (passes.bloom) {
        passes.bloom.enabled = bloomOn();
        passes.bloom.strength = (BLOOM_STRENGTH.day + (BLOOM_STRENGTH.night - BLOOM_STRENGTH.day) * n) * tier.bloomScale;
        passes.bloom.threshold = BLOOM_THRESHOLD.day + (BLOOM_THRESHOLD.night - BLOOM_THRESHOLD.day) * n;
      }
      const u = passes.cine.uniforms;
      u.uTime.value = elapsed;
      u.uNight.value = n;
      u.uCA.value = tier.ca;
      u.uVig.value = tier.vignette;
      u.uGrain.value = tier.grain;
      u.uSharpen.value = tier.sharpen;
      u.uSat.value = tier.sat;
      u.uContrast.value = tier.contrast;
      try {
        composer.render(dt);
      } catch (e) {
        // Un fallo del pipeline no debe congelar el juego: se apaga el post-procesado y se sigue.
        console.warn("[gfx] post-procesado desactivado por error", e?.message || e);
        usePost = false;
        try { renderer.setRenderTarget(null); } catch { /* nada */ }
        renderer.render(scene, camera);
      }
    },

    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost, false);
      canvas.removeEventListener("webglcontextrestored", onRestored, false);
      window.removeEventListener(GFX_EVENT, onSettings);
      disposeComposer();
    },
  };
}

/** Igual que createPostFxUnsafe, pero si algo falla al crearlo devuelve un render directo. */
export function createPostFx(args) {
  try {
    return createPostFxUnsafe(args);
  } catch (e) {
    console.warn("[gfx] pipeline no disponible, render directo", e?.message || e);
    const { renderer, scene, camera } = args;
    return {
      profile: args.profile, level: 0,
      setSize() {},
      render() { renderer.render(scene, camera); },
      dispose() {},
    };
  }
}
