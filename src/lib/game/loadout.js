// @ts-nocheck
import { CHARACTERS, getCharacter } from "@/data/characters";
import { DEFAULT_ATTACK_SPRITES } from "@/lib/game/attackSprites";

// Loadout = personaje equipado (skin, colores, PNG propio) + billboard + sprites.
// Se guarda solo en este navegador.

const STORAGE_KEY = "resenha_loadout";
const MOVE_CATS = ["m1", "special1", "special2", "special3", "ultimate"];

const CUSTOM_BASE = {
  id: "custom",
  name: "Custom",
  displayName: "Personalizado",
  bio: "",
  colors: { primary: "#00e5ff", secondary: "#d500f9", accent: "#ffea00" },
  stats: { health: 1000, speed: 7.5, jumpForce: 11, weight: 1.0 },
  moves: CHARACTERS[0].moves,
};

export function baseIdOf(character) {
  if (!character) return "";
  if (character.id === "custom") return "custom";
  if (character.id.includes("-skin-")) return character.id.split("-skin-")[0];
  return getCharacter(character.id) ? character.id : "";
}

export function toLoadout(character, billboardUrl) {
  const baseId = baseIdOf(character);
  const payload = {
    character_id: character.id,
    base_id: baseId,
    display_name: String(character.displayName || "Luchador").slice(0, 24),
    colors: character.colors,
    custom_image: character.customImage || "",
  };
  if (baseId === "custom" || character.id?.includes("-skin-")) {
    const sources = {};
    const attackSprites = {};
    for (const cat of MOVE_CATS) {
      const moveId = character.moves?.[cat]?.id;
      const src = CHARACTERS.find((c) => c.moves?.[cat]?.id === moveId);
      if (src) sources[cat] = src.id;
      const spr = character.moves?.[cat]?.attackSprite;
      if (spr) attackSprites[cat] = spr;
    }
    payload.move_sources = sources;
    if (Object.keys(attackSprites).length) payload.attack_sprites = attackSprites;
  }
  if (billboardUrl !== undefined) payload.billboard_url = billboardUrl || "";
  return payload;
}

export function characterFromLoadout(lo) {
  if (!lo?.base_id) return null;
  const base = lo.base_id === "custom" ? CUSTOM_BASE : getCharacter(lo.base_id);
  if (!base) return null;
  let moves = { ...base.moves };
  if (lo.move_sources) {
    moves = {};
    for (const cat of MOVE_CATS) {
      const src = getCharacter(lo.move_sources[cat]);
      moves[cat] = { ...(src?.moves?.[cat] || CHARACTERS[0].moves[cat]) };
    }
  } else {
    moves = {};
    for (const cat of MOVE_CATS) moves[cat] = { ...base.moves[cat] };
  }
  // Attach attack sprites from loadout or defaults
  for (const cat of MOVE_CATS) {
    const spr = lo.attack_sprites?.[cat] || moves[cat]?.attackSprite || DEFAULT_ATTACK_SPRITES[cat];
    if (spr) moves[cat] = { ...moves[cat], attackSprite: spr };
  }
  return {
    ...base,
    id: lo.character_id || base.id,
    displayName: lo.display_name || base.displayName,
    colors: { ...base.colors, ...(lo.colors || {}) },
    customImage: lo.custom_image || null,
    moves,
  };
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadMyLoadout() {
  return read();
}

export async function saveMyLoadout(payload) {
  try {
    const prev = read() || {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...payload }));
  } catch {
    /* cuota llena: el juego sigue */
  }
}
