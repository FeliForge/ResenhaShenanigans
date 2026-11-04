// @ts-nocheck
// Defeat / respawn rules shared by the arena and the HUD.
import { getArchetype } from "@/data/movesets";

export const RESPAWN_DELAY_MS = 3000;
export const INVULN_MS = 2000;
export const RESPAWN_POINT = { x: 0, y: 1.6, z: 0 };

// Cada estilo cambia animación, partículas y tiempo de la secuencia.
export const DEFEAT_STYLES = {
  rush: { motion: "blitz", duration: 2600, particle: "streaks", tint: "#ffd166", shake: 0.5 },
  tank: { motion: "crash", duration: 3000, particle: "debris", tint: "#f97316", shake: 1.1 },
  range: { motion: "pierce", duration: 2700, particle: "sparks", tint: "#38bdf8", shake: 0.4 },
  trick: { motion: "dissolve", duration: 2900, particle: "smoke", tint: "#a855f7", shake: 0.3 },
  control: { motion: "freeze", duration: 2800, particle: "shards", tint: "#67e8f9", shake: 0.35 },
  balanced: { motion: "collapse", duration: 2700, particle: "embers", tint: "#fb7185", shake: 0.6 },
};

export function defeatStyleFor(characterId) {
  const archetype = getArchetype(characterId);
  return { archetype, style: DEFEAT_STYLES[archetype] ? archetype : "balanced", ...(DEFEAT_STYLES[archetype] || DEFEAT_STYLES.balanced) };
}