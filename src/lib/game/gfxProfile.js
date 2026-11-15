// @ts-nocheck
// Perfil gráfico: detecta navegador / dispositivo (ChromeOS, Opera GX, GPU, CPU, RAM)
// y decide qué nivel de calidad usar. Las funciones puras (classifyGpu, pickTier,
// buildProfile) no tocan el DOM para poder probarse en vitest.

export const STORAGE_KEY = "resenha_gfx_v1";
export const QUALITY_IDS = ["low", "medium", "high", "ultra"];
export const GFX_EVENT = "resenha:gfx";

// maxFps = 0 => sin tope. dprMax = tope de pixel ratio (se aplica sobre devicePixelRatio).
export const TIERS = {
  low: {
    id: "low", dprMax: 1, shadowMap: 1024, shadowEvery: 2, shadowSoft: false,
    hdr: false, msaa: 0, fxaa: true, bloom: false, bloomScale: 0,
    ca: 0, sharpen: 0, grain: 0, sat: 1.05, contrast: 0.1, vignette: 0.5, maxFps: 60,
  },
  medium: {
    id: "medium", dprMax: 1.25, shadowMap: 1024, shadowEvery: 1, shadowSoft: false,
    hdr: true, msaa: 0, fxaa: true, bloom: false, bloomScale: 0,
    ca: 0.0006, sharpen: 0.1, grain: 0.012, sat: 1.08, contrast: 0.14, vignette: 0.6, maxFps: 90,
  },
  high: {
    id: "high", dprMax: 1.75, shadowMap: 2048, shadowEvery: 1, shadowSoft: true,
    hdr: true, msaa: 2, fxaa: false, bloom: true, bloomScale: 1,
    ca: 0.001, sharpen: 0.12, grain: 0.018, sat: 1.1, contrast: 0.16, vignette: 0.7, maxFps: 144,
  },
  ultra: {
    id: "ultra", dprMax: 2, shadowMap: 4096, shadowEvery: 1, shadowSoft: true,
    hdr: true, msaa: 4, fxaa: false, bloom: true, bloomScale: 1.25,
    ca: 0.0014, sharpen: 0.15, grain: 0.022, sat: 1.12, contrast: 0.18, vignette: 0.75, maxFps: 0,
  },
};

/* ---------------------------------------------------------------- detección */

/** Clasifica el string de GPU (WEBGL_debug_renderer_info). */
export function classifyGpu(renderer) {
  const s = String(renderer || "").toLowerCase();
  if (!s) return "unknown";
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(s)) return "software";
  if (/intel.*\barc\b|geforce (gtx|rtx)|\brtx\b|\bgtx\b|radeon rx|radeon pro|apple m\d|apple gpu|nvidia/.test(s)) return "high";
  if (/mali|adreno|powervr|videocore|vivante|tegra|panfrost|lima\b/.test(s)) return "low";
  if (/iris|vega|radeon\(tm\) graphics|radeon graphics|amd radeon/.test(s)) return "medium";
  if (/intel/.test(s)) return "low";
  return "medium";
}

/** Lee navegador / hardware. `nav` y `win` se inyectan para poder probarlo. */
export function detectEnv(nav, win, gpuRenderer = "") {
  const ua = String(nav?.userAgent || "");
  const brands = (nav?.userAgentData?.brands || []).map((b) => String(b.brand || ""));
  const isChromeOS = /\bCrOS\b/.test(ua) || nav?.userAgentData?.platform === "Chrome OS";
  const isOpera = /\bOPR\//.test(ua) || brands.some((b) => /^Opera/i.test(b));
  // Opera GX no se distingue por UA: solo se marca cuando el navegador lo expone en UA-CH.
  const isOperaGX = brands.some((b) => /Opera GX/i.test(b));
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) && !isChromeOS;
  const mq = (q) => { try { return !!win?.matchMedia?.(q)?.matches; } catch { return false; } };
  return {
    ua,
    isChromeOS,
    isOpera: isOpera || isOperaGX,
    isOperaGX,
    isMobile,
    cores: Number(nav?.hardwareConcurrency) || 0,
    memGB: Number(nav?.deviceMemory) || 0,
    dpr: Number(win?.devicePixelRatio) || 1,
    saveData: !!nav?.connection?.saveData,
    reducedMotion: mq("(prefers-reduced-motion: reduce)"),
    gpuRenderer: String(gpuRenderer || ""),
    gpuClass: classifyGpu(gpuRenderer),
  };
}

/** Calidad automática según el entorno. */
export function pickTier(env) {
  let rank = { software: 0, low: 0, medium: 1, unknown: 1, high: 2 }[env.gpuClass] ?? 1;
  if (rank === 2 && env.cores >= 8 && (env.memGB === 0 || env.memGB >= 8) && !env.isChromeOS && !env.isMobile) rank = 3;

  if (env.cores && env.cores <= 2) rank = Math.min(rank, 0);
  else if (env.cores && env.cores <= 4) rank = Math.min(rank, 1);
  if (env.memGB && env.memGB <= 2) rank = Math.min(rank, 0);
  else if (env.memGB && env.memGB <= 4) rank = Math.min(rank, 1);
  if (env.saveData) rank = Math.min(rank, 1);
  if (env.isMobile) rank = Math.min(rank, 1);
  // Chromebooks: GPU integrada compartiendo RAM y térmicamente limitadas -> techo "medium".
  if (env.isChromeOS) rank = Math.min(rank, 1);
  return QUALITY_IDS[rank];
}

/* ------------------------------------------------------------- preferencias */

export function readSettings() {
  const def = { quality: "auto", shaders: true };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw && typeof raw === "object") {
      const quality = raw.quality === "auto" || QUALITY_IDS.includes(raw.quality) ? raw.quality : "auto";
      return { quality, shaders: raw.shaders !== false };
    }
  } catch { /* storage no disponible */ }
  return def;
}

export function saveSettings(patch) {
  const next = { ...readSettings(), ...patch };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* solo en memoria */ }
  try { window.dispatchEvent(new CustomEvent(GFX_EVENT)); } catch { /* sin window */ }
  return next;
}

/* ---------------------------------------------------------------- perfil */

/** Combina entorno + preferencias en el perfil final. Función pura. */
export function buildProfile(env, settings, override = null) {
  const auto = pickTier(env);
  let quality = settings.quality === "auto" ? auto : settings.quality;
  let shaders = settings.shaders !== false;
  if (override === "off") shaders = false;
  else if (QUALITY_IDS.includes(override)) quality = override;

  const tier = { ...TIERS[quality] };
  if (env.reducedMotion) { tier.grain = 0; tier.ca = 0; }
  const dpr = Math.max(0.75, Math.min(env.dpr || 1, tier.dprMax));
  const highPerf = !env.isChromeOS && (env.isOpera || quality === "high" || quality === "ultra");

  return {
    quality,
    auto,
    autoSelected: settings.quality === "auto" && !override,
    tier,
    post: shaders,
    pixelRatio: dpr,
    shadowType: tier.shadowSoft ? "soft" : "pcf",
    // Con post-procesado el AA lo hacen MSAA/FXAA sobre el render target; el del canvas sobraría.
    rendererOptions: {
      antialias: !shaders,
      powerPreference: highPerf ? "high-performance" : "default",
    },
    env,
  };
}

let gpuCache;

/** Sondea la GPU una sola vez con un contexto desechable. */
export function probeGpuRenderer() {
  if (gpuCache !== undefined) return gpuCache;
  gpuCache = "";
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpuCache = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch { /* sin WebGL: el renderer fallará por su cuenta */ }
  return gpuCache;
}

/** Perfil actual (lee preferencias y ?gfx=low|medium|high|ultra|off de la URL). */
export function getGfxProfile() {
  let override = null;
  try { override = new URLSearchParams(window.location.search).get("gfx"); } catch { /* ssr */ }
  const env = detectEnv(navigator, window, probeGpuRenderer());
  return buildProfile(env, readSettings(), override);
}
