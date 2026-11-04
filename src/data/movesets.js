// @ts-nocheck
// Movesets exclusivos: cada personaje tiene comportamiento real y distinto.
// Tipos: melee · projectile · beam · wall · area · trap · dash · nova · buff · counter
// Campos opcionales: combo · passive · slow · stun · lifesteal · launch · homing · boomerang

export const MOVESETS = {
  // ── RUSHER: boxeador de ráfagas y contragolpe ──────────────────────────
  "iron-fist": {
    archetype: "rush",
    combo: {
      window: 640,
      steps: [
        { mul: 1, arc: 1.1, range: 2.4, knock: 1.2 },
        { mul: 1.2, arc: 1.35, range: 2.5, knock: 2.2 },
        { mul: 1.7, arc: 1.9, range: 2.9, knock: 6, launch: true },
      ],
    },
    passive: { type: "combo", meterGain: 1.6 },
    m1: { type: "melee", range: 2.4, arc: 1.1, knock: 1.2, lunge: 0.7 },
    special1: { type: "melee", range: 3.4, arc: 1.3, knock: 6, lunge: 2.2 },
    special2: { type: "counter", window: 700, reflect: 0.65, buff: { stat: "defense", mult: 0.4, duration: 900 } },
    special3: { type: "melee", hits: 3, hitDelay: 105, range: 3, arc: 1.2, knock: 2.4 },
    ultimate: { type: "nova", radius: 7.5, waves: 3, waveDelay: 180, knock: 4.2, buff: { stat: "speed", mult: 1.2, duration: 4000 } },
  },

  // ── RUSHER: patinadora de pulsos, gana daño tras cada dash ─────────────
  "neon-stride": {
    archetype: "rush",
    combo: { window: 600, steps: [{ mul: 1, range: 2.2, knock: 1 }, { mul: 1.15, range: 2.3, knock: 1.6 }, { mul: 1.5, range: 2.6, knock: 4 }] },
    passive: { type: "afterDash", buff: { stat: "damage", mult: 1.3, duration: 1800 } },
    m1: { type: "melee", range: 2.2, arc: 1.0, knock: 1.0 },
    special1: { type: "dash", distance: 9, speed: 34, radius: 2.4 },
    special2: { type: "area", radius: 4.5, duration: 2200, interval: 420, tickDamage: 0.28, slow: { mult: 0.55, duration: 1200 } },
    special3: { type: "projectile", speed: 19, range: 16, radius: 0.55, bounces: 3, homing: 2.6 },
    ultimate: { type: "nova", radius: 7, waves: 4, waveDelay: 150, buff: { stat: "speed", mult: 1.4, duration: 5000 } },
  },

  // ── TANK: demoledor de mazo, hiperarmadura y terremotos ────────────────
  "brick-maul": {
    archetype: "tank",
    combo: { window: 820, steps: [{ mul: 1, range: 2.8, knock: 2.4 }, { mul: 1.25, range: 3, knock: 3 }, { mul: 1.8, range: 3.2, knock: 7, launch: true }] },
    passive: { type: "armor", armor: 0.82, hyperarmor: true },
    m1: { type: "melee", range: 2.8, arc: 1.3, knock: 2.4 },
    special1: { type: "area", radius: 5, duration: 700, interval: 700, tickDamage: 1, knock: 6, launch: true },
    special2: { type: "wall", length: 4.5, height: 2.6, distance: 2, duration: 2600, buff: { stat: "defense", mult: 0.4, duration: 3200 } },
    special3: { type: "projectile", speed: 13, range: 16, radius: 1.2, arc: true, explodeRadius: 3.2 },
    ultimate: { type: "nova", radius: 9.5, waves: 2, waveDelay: 380, knock: 7, stun: 900 },
  },

  // ── RANGED: jabalinas cargadas y cadenas eléctricas ────────────────────
  "volt-jav": {
    archetype: "range",
    combo: { window: 560, steps: [{ mul: 1, range: 2.3, knock: 1.1 }, { mul: 1.2, range: 2.4, knock: 1.8 }] },
    passive: { type: "charge", mult: 1.35 },
    m1: { type: "melee", range: 2.3, arc: 1.1, knock: 1.1 },
    special1: { type: "projectile", speed: 32, range: 28, radius: 0.4, pierce: true, windup: 0.16 },
    special2: { type: "beam", range: 14, width: 1.3, chain: 3, chainRange: 7, knock: 3 },
    special3: { type: "dash", distance: 12, speed: 32, radius: 2.6, endLaunch: true },
    ultimate: { type: "nova", radius: 8, waves: 4, waveDelay: 140, knock: 3 },
  },

  // ── TRICKSTER: teletransporte, humo y golpes desde la sombra ───────────
  "smoke-veil": {
    archetype: "trick",
    combo: { window: 540, steps: [{ mul: 1, range: 2.2, knock: 0.9 }, { mul: 1.2, range: 2.4, knock: 1.4 }, { mul: 1.6, range: 2.6, knock: 3.5, slow: { mult: 0.5, duration: 1200 } }] },
    passive: { type: "vanish", duration: 700, buff: { stat: "damage", mult: 1.4, duration: 900 } },
    m1: { type: "melee", range: 2.2, arc: 1.0, knock: 0.9, slow: { mult: 0.6, duration: 900 } },
    special1: { type: "dash", distance: 9, speed: 34, radius: 2.6, phase: true, afterimage: true },
    special2: { type: "area", radius: 5, duration: 3400, interval: 620, tickDamage: 0.22, slow: { mult: 0.45, duration: 1500 } },
    special3: { type: "melee", range: 4, arc: 0.9, hits: 2, hitDelay: 160, knock: 3, lifesteal: 0.25 },
    ultimate: { type: "nova", radius: 9, waves: 4, waveDelay: 200, buff: { stat: "speed", mult: 1.3, duration: 4000 } },
  },

  // ── BALANCED: pirómano, quema con cada impacto ─────────────────────────
  "cinder-roar": {
    archetype: "balanced",
    combo: { window: 620, steps: [{ mul: 1, range: 2.4, knock: 1.2 }, { mul: 1.25, range: 2.5, knock: 2 }, { mul: 1.7, range: 2.8, knock: 5, launch: true }] },
    passive: { type: "burn", dps: 26, duration: 2200 },
    m1: { type: "melee", range: 2.4, arc: 1.1, knock: 1.2 },
    special1: { type: "area", radius: 3, atForward: 4, duration: 1800, interval: 420, tickDamage: 0.3 },
    special2: { type: "projectile", speed: 16, range: 12, radius: 0.7, explodeRadius: 3 },
    special3: { type: "beam", range: 10, width: 1.7, knock: 4.5 },
    ultimate: { type: "nova", radius: 8.5, waves: 3, waveDelay: 220, knock: 3.5 },
  },

  // ── CONTROLLER: hielo que ralentiza y congela ──────────────────────────
  "frost-bite": {
    archetype: "control",
    combo: { window: 600, steps: [{ mul: 1, range: 2.3, knock: 1.2 }, { mul: 1.15, range: 2.4, knock: 1.8 }, { mul: 1.5, range: 2.6, knock: 3, slow: { mult: 0.35, duration: 1800 } }] },
    passive: { type: "chill", slow: { mult: 0.72, duration: 1400 } },
    m1: { type: "melee", range: 2.3, arc: 1.1, knock: 1.2, slow: { mult: 0.7, duration: 1100 } },
    special1: { type: "projectile", speed: 26, range: 22, radius: 0.45, slow: { mult: 0.5, duration: 1800 } },
    special2: { type: "wall", length: 6.5, height: 3.2, distance: 3, duration: 5000, heal: 60, slowAura: { mult: 0.6, radius: 4, duration: 900 } },
    special3: { type: "area", radius: 5.2, duration: 900, interval: 450, tickDamage: 0.55, slow: { mult: 0.4, duration: 2000 }, knock: 4 },
    ultimate: { type: "nova", radius: 9, waves: 3, waveDelay: 240, stun: 800 },
  },

  // ── TANK/CONTROLLER: cristal que atrae y aplasta ───────────────────────
  "quartz-golem": {
    archetype: "tank",
    combo: { window: 780, steps: [{ mul: 1, range: 2.8, knock: 2.2 }, { mul: 1.3, range: 3, knock: 3 }, { mul: 1.9, range: 3.2, knock: 6.5, launch: true }] },
    passive: { type: "armor", armor: 0.78 },
    m1: { type: "melee", range: 2.8, arc: 1.2, knock: 2.2 },
    special1: { type: "area", radius: 2.8, atForward: 3.2, duration: 700, interval: 400, tickDamage: 1, windup: 0.18, launch: true },
    special2: { type: "counter", window: 900, reflect: 0.8, heal: 80, buff: { stat: "defense", mult: 0.45, duration: 1200 } },
    special3: { type: "projectile", speed: 12, range: 18, radius: 1.4, arc: true, explodeRadius: 3.5 },
    ultimate: { type: "nova", radius: 10, waves: 2, waveDelay: 420, knock: 7, pull: 7 },
  },

  // ── RUSHER: acróbata de pulso, encadena dashes ─────────────────────────
  "pulse-dash": {
    archetype: "rush",
    combo: { window: 520, steps: [{ mul: 1, range: 2.2, knock: 1 }, { mul: 1.15, range: 2.3, knock: 1.5 }, { mul: 1.45, range: 2.5, knock: 3.4 }] },
    passive: { type: "dashReset", reduce: 450 },
    m1: { type: "melee", range: 2.2, arc: 1.0, knock: 1.0 },
    special1: { type: "dash", distance: 10, speed: 36, radius: 2.2 },
    special2: { type: "trap", radius: 2.4, distance: 3, duration: 8000, knock: 9, launch: true, stun: 500 },
    special3: { type: "dash", distance: 7, speed: 26, radius: 3.2, endNova: 6 },
    ultimate: { type: "projectile", count: 5, spread: 0.16, volleyDelay: 80, speed: 22, range: 16, radius: 0.5 },
  },

  // ── BALANCED: guadaña de largo alcance con robo de vida ────────────────
  "rust-reaper": {
    archetype: "balanced",
    combo: { window: 660, steps: [{ mul: 1, range: 2.7, knock: 1.5 }, { mul: 1.25, range: 2.9, knock: 2.4 }, { mul: 1.75, range: 3.1, knock: 5.5, launch: true }] },
    passive: { type: "lifesteal", pct: 0.12 },
    m1: { type: "melee", range: 2.7, arc: 1.2, knock: 1.5 },
    special1: { type: "projectile", speed: 17, range: 13, radius: 0.8, pierce: true, boomerang: true },
    special2: { type: "area", radius: 5, duration: 4000, interval: 640, tickDamage: 0.22, slow: { mult: 0.7, duration: 900 } },
    special3: { type: "melee", range: 4.2, arc: 2.9, hits: 2, hitDelay: 170, knock: 3.2, lifesteal: 0.3 },
    ultimate: { type: "nova", radius: 9, waves: 3, waveDelay: 200, knock: 4, lifesteal: 0.2 },
  },

  // ── TRICKSTER: ecos que repiten el daño ────────────────────────────────
  "echo-wraith": {
    archetype: "trick",
    combo: { window: 580, steps: [{ mul: 1, range: 2.2, knock: 1 }, { mul: 1.2, range: 2.3, knock: 1.6 }, { mul: 1.55, range: 2.6, knock: 3.6 }] },
    passive: { type: "echo", every: 3, pct: 0.4 },
    m1: { type: "melee", range: 2.2, arc: 1.1, knock: 1.0 },
    special1: { type: "projectile", speed: 22, range: 15, radius: 0.5, count: 2, volleyDelay: 240, homing: 3.2 },
    special2: { type: "beam", range: 12, width: 2.2, hits: 2, hitDelay: 180, knock: 3 },
    special3: { type: "melee", range: 3.2, arc: 1.5, hits: 2, hitDelay: 150, knock: 2, echoWave: true },
    ultimate: { type: "nova", radius: 8.5, waves: 4, waveDelay: 170, knock: 3 },
  },
};

export const DEFAULT_MOVE = { type: "melee", range: 2.2, arc: 1.2, knock: 1.4 };
export const DEFAULT_COMBO = { window: 620, steps: [{ mul: 1 }, { mul: 1.2 }, { mul: 1.5, knock: 3 }] };

export function getMoveConfig(characterId, category) {
  return MOVESETS[characterId]?.[category] || DEFAULT_MOVE;
}

export function getComboConfig(characterId) {
  return MOVESETS[characterId]?.combo || DEFAULT_COMBO;
}

export function getPassive(characterId) {
  return MOVESETS[characterId]?.passive || null;
}

export function getArchetype(characterId) {
  return MOVESETS[characterId]?.archetype || "balanced";
}