// @ts-nocheck
// Catálogo de la tienda. Los efectos de dash son dos colores y un emoji que
// se pinta en la estela; los emotes son movimientos del propio personaje.

export const DASH_EFFECTS = [
  { id: "dash_frost", kind: "dash", name: "Escarcha", price: 90, a: "#22d3ee", b: "#4f46e5", emoji: "❄️" },
  { id: "dash_flame", kind: "dash", name: "Llamarada", price: 140, a: "#fb923c", b: "#dc2626", emoji: "🔥" },
  { id: "dash_toxic", kind: "dash", name: "Tóxico", price: 200, a: "#a3e635", b: "#15803d", emoji: "☣️" },
  { id: "dash_void", kind: "dash", name: "Vacío", price: 260, a: "#a855f7", b: "#1e1b4b", emoji: "🌀" },
  { id: "dash_gold", kind: "dash", name: "Oro forjado", price: 340, a: "#fde047", b: "#b45309", emoji: "⚡" },
];

export const EMOTES = [
  { id: "emote_dance", kind: "emote", name: "Baile", price: 40, anim: "dance", hint: "Baila a ritmo" },
  { id: "emote_wave", kind: "emote", name: "Saludo", price: 70, anim: "wave", hint: "Saluda con el cuerpo" },
  { id: "emote_spin", kind: "emote", name: "Giro", price: 110, anim: "spin", hint: "Gira sobre sí mismo" },
  { id: "emote_flex", kind: "emote", name: "Flexión", price: 150, anim: "flex", hint: "Presume de músculo" },
  { id: "emote_hop", kind: "emote", name: "Saltitos", price: 200, anim: "hop", hint: "Salta sin parar" },
];

export const SHOP_ITEMS = [...DASH_EFFECTS, ...EMOTES];

export function getShopItem(id) {
  if (!id) return null;
  return SHOP_ITEMS.find((item) => item.id === id) || null;
}