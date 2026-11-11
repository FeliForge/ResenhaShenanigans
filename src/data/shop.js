// @ts-nocheck
// Catálogo de la tienda. Los efectos de dash son dos colores y un emoji que
// se pinta en la estela; los emotes son movimientos del propio personaje.
// Items con lootOnly solo salen de la Goofy Box.

export const DASH_EFFECTS = [
  { id: "dash_frost", kind: "dash", name: "Escarcha", price: 90, a: "#22d3ee", b: "#4f46e5", emoji: "❄️" },
  { id: "dash_flame", kind: "dash", name: "Llamarada", price: 140, a: "#fb923c", b: "#dc2626", emoji: "🔥" },
  { id: "dash_toxic", kind: "dash", name: "Tóxico", price: 200, a: "#a3e635", b: "#15803d", emoji: "☣️" },
  { id: "dash_void", kind: "dash", name: "Vacío", price: 260, a: "#a855f7", b: "#1e1b4b", emoji: "🌀" },
  { id: "dash_gold", kind: "dash", name: "Oro forjado", price: 340, a: "#fde047", b: "#b45309", emoji: "⚡" },
  // Unique / Goofy Box exclusives
  { id: "dash_goofy", kind: "dash", name: "Goofy", price: 0, a: "#f472b6", b: "#c026d3", emoji: "🤪", lootOnly: true },
  { id: "dash_rainbow", kind: "dash", name: "Arcoíris", price: 0, a: "#22d3ee", b: "#f97316", emoji: "🌈", lootOnly: true },
  { id: "dash_glitch", kind: "dash", name: "Glitch", price: 0, a: "#a3e635", b: "#ec4899", emoji: "👾", lootOnly: true },
];

export const EMOTES = [
  { id: "emote_dance", kind: "emote", name: "Baile", price: 40, anim: "dance", hint: "Baila a ritmo" },
  { id: "emote_wave", kind: "emote", name: "Saludo", price: 70, anim: "wave", hint: "Saluda con el cuerpo" },
  { id: "emote_spin", kind: "emote", name: "Giro", price: 110, anim: "spin", hint: "Gira sobre sí mismo" },
  { id: "emote_flex", kind: "emote", name: "Flexión", price: 150, anim: "flex", hint: "Presume de músculo" },
  { id: "emote_hop", kind: "emote", name: "Saltitos", price: 200, anim: "hop", hint: "Salta sin parar" },
  // Unique / Goofy Box exclusives
  { id: "emote_goofy", kind: "emote", name: "Goofy", price: 0, anim: "dance", hint: "Baile goofy exclusivo", lootOnly: true },
  { id: "emote_troll", kind: "emote", name: "Troll", price: 0, anim: "flex", hint: "Pose troll exclusiva", lootOnly: true },
  { id: "emote_moonwalk", kind: "emote", name: "Moonwalk", price: 0, anim: "spin", hint: "Camina hacia atrás", lootOnly: true },
];

export const SHOP_ITEMS = [...DASH_EFFECTS, ...EMOTES];

export const GOOFY_BOX = {
  id: "goofy_box",
  price: 60,
  name: "Goofy Box",
};

export function getShopItem(id) {
  if (!id) return null;
  return SHOP_ITEMS.find((item) => item.id === id) || null;
}

export function getLootPool() {
  return SHOP_ITEMS.filter((item) => item.lootOnly);
}
