// @ts-nocheck
// Catalogo de la tienda. Los efectos de dash son dos colores y un emoji que
// se pinta en la estela; los emotes son movimientos del propio personaje.
// Items con lootOnly solo salen de la Goofy Box.

export const DASH_EFFECTS = [
  { id: "dash_frost", kind: "dash", name: "Escarcha", price: 90, a: "#22d3ee", b: "#4f46e5", emoji: "❄️" },
  { id: "dash_flame", kind: "dash", name: "Llamarada", price: 140, a: "#fb923c", b: "#dc2626", emoji: "🔥" },
  { id: "dash_toxic", kind: "dash", name: "Toxico", price: 200, a: "#a3e635", b: "#15803d", emoji: "☣️" },
  { id: "dash_void", kind: "dash", name: "Vacio", price: 260, a: "#a855f7", b: "#1e1b4b", emoji: "🌀" },
  { id: "dash_gold", kind: "dash", name: "Oro forjado", price: 340, a: "#fde047", b: "#b45309", emoji: "⚡" },
  { id: "dash_goofy", kind: "dash", name: "Goofy", price: 0, a: "#f472b6", b: "#c026d3", emoji: "🤪", lootOnly: true },
  { id: "dash_rainbow", kind: "dash", name: "Arcoiris", price: 0, a: "#22d3ee", b: "#f97316", emoji: "🌈", lootOnly: true },
  { id: "dash_glitch", kind: "dash", name: "Glitch", price: 0, a: "#a3e635", b: "#ec4899", emoji: "👾", lootOnly: true },
];

export const EMOTES = [
  { id: "emote_dance", kind: "emote", name: "Baile", price: 40, anim: "dance", hint: "Baila a ritmo" },
  { id: "emote_wave", kind: "emote", name: "Saludo", price: 70, anim: "wave", hint: "Saluda con el cuerpo" },
  { id: "emote_spin", kind: "emote", name: "Giro", price: 110, anim: "spin", hint: "Gira sobre si mismo" },
  { id: "emote_flex", kind: "emote", name: "Flexion", price: 150, anim: "flex", hint: "Presume de musculo" },
  { id: "emote_hop", kind: "emote", name: "Saltitos", price: 200, anim: "hop", hint: "Salta sin parar" },
  { id: "emote_goofy", kind: "emote", name: "Goofy", price: 0, anim: "goofy", hint: "Baile goofy exclusivo", lootOnly: true },
  { id: "emote_troll", kind: "emote", name: "Troll", price: 0, anim: "troll", hint: "Pose troll exclusiva", lootOnly: true },
  { id: "emote_moonwalk", kind: "emote", name: "Moonwalk", price: 0, anim: "moonwalk", hint: "Camina hacia atras", lootOnly: true },
  { id: "emote_robot", kind: "emote", name: "Robot", price: 0, anim: "robot", hint: "Movimiento robotico", lootOnly: true },
  { id: "emote_dizzy", kind: "emote", name: "Mareado", price: 0, anim: "dizzy", hint: "Gira mareado", lootOnly: true },
  { id: "emote_cheer", kind: "emote", name: "Porra", price: 0, anim: "cheer", hint: "Salta de alegria", lootOnly: true },
  { id: "emote_sneak", kind: "emote", name: "Furtivo", price: 0, anim: "sneak", hint: "Se agacha y se desliza", lootOnly: true },
  { id: "emote_explode", kind: "emote", name: "Explosion", price: 0, anim: "explode", hint: "Pulsa como bomba", lootOnly: true },
  { id: "emote_floss", kind: "emote", name: "Floss", price: 0, anim: "floss", hint: "Baile de lado a lado", lootOnly: true },
  { id: "emote_chicken", kind: "emote", name: "Pollo", price: 0, anim: "chicken", hint: "Aletea como gallina", lootOnly: true },
  { id: "emote_dab", kind: "emote", name: "Dab", price: 0, anim: "dab", hint: "Pose dab clasica", lootOnly: true },
  { id: "emote_panic", kind: "emote", name: "Panico", price: 0, anim: "panic", hint: "Tiembla de panico", lootOnly: true },
  { id: "emote_vibe", kind: "emote", name: "Vibe", price: 0, anim: "vibe", hint: "Se mece tranquilo", lootOnly: true },
  { id: "emote_yeet", kind: "emote", name: "Yeet", price: 0, anim: "yeet", hint: "Lanza el cuerpo hacia adelante", lootOnly: true },
];

export const COSMETICS = [
  { id: "cosmo_star", kind: "cosmetic", name: "Estrela Dourada", price: 80, emoji: "⭐", rarity: "common", glow: "#fbbf24", hint: "Badge brilhante acima da cabeca" },
  { id: "cosmo_heart", kind: "cosmetic", name: "Coracao Neon", price: 90, emoji: "💖", rarity: "common", glow: "#f472b6", hint: "Coracao neon flutuante" },
  { id: "cosmo_fire", kind: "cosmetic", name: "Chama Viva", price: 110, emoji: "🔥", rarity: "rare", glow: "#fb923c", hint: "Chama animada sobre o lutador" },
  { id: "cosmo_ghost", kind: "cosmetic", name: "Fantasma Suave", price: 120, emoji: "👻", rarity: "rare", glow: "#e2e8f0", hint: "Fantasminha companheiro" },
  { id: "cosmo_robot", kind: "cosmetic", name: "Chip Robo", price: 140, emoji: "🤖", rarity: "rare", glow: "#38bdf8", hint: "Icone robotico high-tech" },
  { id: "cosmo_skull", kind: "cosmetic", name: "Caveira Neon", price: 150, emoji: "💀", rarity: "epic", glow: "#a3e635", hint: "Caveira com brilho toxico" },
  { id: "cosmo_alien", kind: "cosmetic", name: "Visitante", price: 160, emoji: "👽", rarity: "epic", glow: "#4ade80", hint: "Badge alienigena misterioso" },
  { id: "cosmo_crown", kind: "cosmetic", name: "Coroa Real", price: 200, emoji: "👑", rarity: "legendary", glow: "#facc15", hint: "Coroa dourada de campeao" },
  { id: "cosmo_goofy", kind: "cosmetic", name: "Cara Goofy", price: 0, emoji: "🤪", rarity: "goofy", glow: "#e879f9", hint: "Face exclusiva da Goofy Box", lootOnly: true },
  { id: "cosmo_rainbow", kind: "cosmetic", name: "Aura Arco-iris", price: 0, emoji: "🌈", rarity: "goofy", glow: "#22d3ee", hint: "Aura colorida exclusiva", lootOnly: true },
  { id: "cosmo_devil", kind: "cosmetic", name: "Diabrete", price: 0, emoji: "😈", rarity: "goofy", glow: "#f87171", hint: "Travessura da Goofy Box", lootOnly: true },
  { id: "cosmo_angel", kind: "cosmetic", name: "Anjinho", price: 0, emoji: "😇", rarity: "goofy", glow: "#fde68a", hint: "Aura angelical exclusiva", lootOnly: true },
  { id: "cosmo_cool", kind: "cosmetic", name: "Oculos Cool", price: 0, emoji: "😎", rarity: "goofy", glow: "#60a5fa", hint: "Estilo cool da box", lootOnly: true },
  { id: "cosmo_party", kind: "cosmetic", name: "Festa Total", price: 0, emoji: "🥳", rarity: "goofy", glow: "#fb7185", hint: "Modo festa exclusivo", lootOnly: true },
];

export const SHOP_ITEMS = [...DASH_EFFECTS, ...EMOTES, ...COSMETICS];

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
