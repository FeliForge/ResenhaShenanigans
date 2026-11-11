// @ts-nocheck
import { getShopItem, getLootPool, GOOFY_BOX } from "@/data/shop";

// Tienda local: monedas e inventario viven en este navegador.
// El precio se valida aquí, no en un servidor externo.

const WALLET_KEY = "resenha_wallet";
const INV_KEY = "resenha_inventory";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureWallet() {
  const wallet = readJson(WALLET_KEY, null);
  if (wallet && typeof wallet.coins === "number") return wallet;
  const next = { coins: 0, total_earned: 0 };
  writeJson(WALLET_KEY, next);
  return next;
}

function ensureInventory() {
  const inventory = readJson(INV_KEY, null);
  if (inventory && Array.isArray(inventory.item_ids)) return inventory;
  const next = { item_ids: [], dash: "", emote: "" };
  writeJson(INV_KEY, next);
  return next;
}

function snapshot(wallet, inventory) {
  return {
    coins: wallet.coins || 0,
    owned: inventory.item_ids || [],
    dash: inventory.dash || "",
    emote: inventory.emote || "",
  };
}

export async function loadShop() {
  try {
    return snapshot(ensureWallet(), ensureInventory());
  } catch {
    return null;
  }
}

export async function buyItem(itemId) {
  const item = getShopItem(itemId);
  if (!item) throw new Error("Artículo no encontrado");
  if (item.lootOnly) throw new Error("Solo disponible en la Goofy Box");
  const wallet = ensureWallet();
  const inventory = ensureInventory();
  if ((inventory.item_ids || []).includes(item.id)) throw new Error("Ya tienes este artículo");
  if ((wallet.coins || 0) < item.price) throw new Error("Monedas insuficientes");
  const coins = (wallet.coins || 0) - item.price;
  writeJson(WALLET_KEY, { ...wallet, coins });
  const updated = {
    ...inventory,
    item_ids: [...(inventory.item_ids || []), item.id],
    [item.kind]: item.id,
  };
  writeJson(INV_KEY, updated);
  return snapshot({ ...wallet, coins }, updated);
}

export async function equipItem(itemId) {
  const item = getShopItem(itemId);
  if (!item) throw new Error("Artículo no encontrado");
  const wallet = ensureWallet();
  const inventory = ensureInventory();
  if (!(inventory.item_ids || []).includes(item.id)) throw new Error("No tienes este artículo");
  const updated = { ...inventory, [item.kind]: item.id };
  writeJson(INV_KEY, updated);
  return snapshot(wallet, updated);
}

/** Open a Goofy Box: pay fixed price, receive one random unowned loot item (or any loot if all owned). */
export async function openGoofyBox() {
  const wallet = ensureWallet();
  const inventory = ensureInventory();
  const price = GOOFY_BOX.price;
  if ((wallet.coins || 0) < price) throw new Error("Monedas insuficientes");

  const pool = getLootPool();
  const owned = new Set(inventory.item_ids || []);
  let candidates = pool.filter((item) => !owned.has(item.id));
  if (candidates.length === 0) candidates = pool; // already have all → still give a random one (no duplicate add)

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const coins = (wallet.coins || 0) - price;
  writeJson(WALLET_KEY, { ...wallet, coins });

  const alreadyOwned = owned.has(pick.id);
  const item_ids = alreadyOwned
    ? inventory.item_ids
    : [...(inventory.item_ids || []), pick.id];

  const updated = {
    ...inventory,
    item_ids,
    [pick.kind]: pick.id, // auto-equip the new drop
  };
  writeJson(INV_KEY, updated);

  return {
    ...snapshot({ ...wallet, coins }, updated),
    reward: pick,
    duplicate: alreadyOwned,
  };
}
