// @ts-nocheck
// Códigos secretos de canje (una vez por navegador).
// type: "item" | "coins"

export const REDEEM_CODES = {
  "GOOFY-ROBOT": { type: "item", itemId: "emote_robot" },
  "GOOFY-DIZZY": { type: "item", itemId: "emote_dizzy" },
  "GOOFY-CHEER": { type: "item", itemId: "emote_cheer" },
  "GOOFY-SNEAK": { type: "item", itemId: "emote_sneak" },
  "GOOFY-BOOM": { type: "item", itemId: "emote_explode" },
  "GOOFY-FLOSS": { type: "item", itemId: "emote_floss" },
  "GOOFY-CHICKEN": { type: "item", itemId: "emote_chicken" },
  "GOOFY-DAB": { type: "item", itemId: "emote_dab" },
  "GOOFY-PANIC": { type: "item", itemId: "emote_panic" },
  "GOOFY-VIBE": { type: "item", itemId: "emote_vibe" },
  "GOOFY-YEET": { type: "item", itemId: "emote_yeet" },
  "COINS-80": { type: "coins", amount: 80 },
};

export function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}
