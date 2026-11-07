// @ts-nocheck
/**
 * Rich multiplayer identity + event payloads.
 * Used by MultiplayerManager / GameCanvas to sync cosmetics and combat feedback.
 */

import { CHARACTERS, getCharacter } from "@/data/characters";
import { DEFAULT_ATTACK_SPRITES } from "@/lib/game/attackSprites";

const MOVE_CATS = ["m1", "special1", "special2", "special3", "ultimate"];

/** Build the network loadout packet from local character + cosmetics. */
export function buildNetLoadout({
  character,
  playerName,
  billboardUrl,
  dashStyle,
  emote,
}) {
  if (!character) return null;
  const baseId =
    character.id === "custom"
      ? "custom"
      : character.id?.includes("-skin-")
        ? character.id.split("-skin-")[0]
        : getCharacter(character.id)
          ? character.id
          : "custom";

  const moveSources = {};
  const attackSprites = {};
  for (const cat of MOVE_CATS) {
    const move = character.moves?.[cat];
    if (!move) continue;
    // Prefer explicit source character id if present
    if (move.sourceId) moveSources[cat] = move.sourceId;
    else {
      const src = CHARACTERS.find((c) => c.moves?.[cat]?.id === move.id);
      if (src) moveSources[cat] = src.id;
    }
    const spr = move.attackSprite || DEFAULT_ATTACK_SPRITES[cat];
    if (spr) attackSprites[cat] = spr;
  }

  return {
    v: 2,
    baseId,
    charId: character.id,
    name: String(playerName || character.displayName || "Luchador").slice(0, 24),
    colors: [
      character.colors?.primary || "#00e5ff",
      character.colors?.secondary || "#d500f9",
      character.colors?.accent || "#ffea00",
    ],
    customImage: character.customImage || "",
    billboard: billboardUrl || "",
    moveSources,
    attackSprites,
    dash: dashStyle
      ? { a: dashStyle.a, b: dashStyle.b, emoji: dashStyle.emoji }
      : null,
    emote: emote ? { id: emote.id || emote.anim, anim: emote.anim || "wave" } : null,
  };
}

/** Normalize an incoming loadout (supports v1 flat and v2 rich). */
export function normalizeNetLoadout(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    v: raw.v || 1,
    baseId: raw.baseId || raw.base_id || "",
    charId: raw.charId || raw.character_id || raw.baseId || "",
    name: String(raw.name || raw.display_name || "Jugador").slice(0, 24),
    colors: Array.isArray(raw.colors)
      ? raw.colors
      : raw.colors
        ? [raw.colors.primary, raw.colors.secondary, raw.colors.accent]
        : [],
    customImage: raw.customImage || raw.custom_image || "",
    billboard: raw.billboard || raw.billboard_url || "",
    moveSources: raw.moveSources || raw.move_sources || {},
    attackSprites: raw.attackSprites || raw.attack_sprites || {},
    dash: raw.dash || null,
    emote: raw.emote || null,
  };
}

/** Combat / social event kinds. */
export const MP_EVENT = {
  HIT: "hit",
  ULTIMATE: "ultimate",
  DEATH: "death",
  RESPAWN: "respawn",
  EMOTE: "emote",
  CHAT: "chat",
  DASH: "dash",
  VFX: "vfx",
  HELLO: "hello",
};

export function makeHitEvent({
  kind = "hit",
  x,
  y,
  z,
  color,
  damage,
  slow = 0,
  stun = 0,
  category = "m1",
  attackSprite = null,
  dirX = 0,
  dirZ = 1,
}) {
  return {
    kind: kind === "ultimate" ? MP_EVENT.ULTIMATE : MP_EVENT.HIT,
    x,
    y,
    z,
    color,
    damage,
    slow,
    stun,
    category,
    attackSprite,
    dirX,
    dirZ,
  };
}

export function makeChatEvent({ text, x, y, z }) {
  return {
    kind: MP_EVENT.CHAT,
    text: String(text || "").slice(0, 48),
    x,
    y,
    z,
  };
}

export function makeEmoteEvent({ anim, x, y, z, color }) {
  return {
    kind: MP_EVENT.EMOTE,
    anim: anim || "wave",
    x,
    y,
    z,
    color,
  };
}

export function makeVfxEvent({ vfxKind, x, y, z, color, scale = 1 }) {
  return {
    kind: MP_EVENT.VFX,
    vfxKind: vfxKind || "impact",
    x,
    y,
    z,
    color,
    scale,
  };
}
