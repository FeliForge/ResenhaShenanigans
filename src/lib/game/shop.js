// @ts-nocheck
import { getShopItem, getLootPool, GOOFY_BOX } from "@/data/shop";
import { REDEEM_CODES, normalizeCode } from "@/data/codes";

// Tienda local: monedas e inventario viven en este navegador.
// El precio se valida aquí, no en un servidor externo.

const WALLET_KEY = "resenha_wallet";
const INV_KEY = "resenha_inventory";
const CODES_KEY = "resenha_redeemed_codes";

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

function redeemedSet() {
  const list = readJson(CODES_KEY, []);
  return new Set(Array.isArray(list) ? list : []);
}

function markRedeemed(code) {
  const set = redeemedSet();
  set.add(code);
  writeJson(CODES_KEY, [...set]);
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
  if (candidates.length === 0) candidates = pool;

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
    [pick.kind]: pick.id,
  };
  writeJson(INV_KEY, updated);

  return {
    ...snapshot({ ...wallet, coins }, updated),
    reward: pick,
    duplicate: alreadyOwned,
  };
}

/** Canjear código secreto (una vez por navegador). */
export async function redeemCode(raw) {
  const code = normalizeCode(raw);
  if (!code) throw new Error("Código vacío");
  const def = REDEEM_CODES[code];
  if (!def) throw new Error("Código inválido");
  if (redeemedSet().has(code)) throw new Error("Código ya canjeado");

  const wallet = ensureWallet();
  const inventory = ensureInventory();

  if (def.type === "coins") {
    const amount = Math.max(0, Number(def.amount) || 0);
    const coins = (wallet.coins || 0) + amount;
    const total_earned = (wallet.total_earned || 0) + amount;
    writeJson(WALLET_KEY, { ...wallet, coins, total_earned });
    markRedeemed(code);
    return {
      ...snapshot({ ...wallet, coins, total_earned }, inventory),
      message: `+${amount} monedas`,
      kind: "coins",
      amount,
    };
  }

  if (def.type === "item") {
    const item = getShopItem(def.itemId);
    if (!item) throw new Error("Recompensa no encontrada");
    const owned = inventory.item_ids || [];
    const already = owned.includes(item.id);
    const item_ids = already ? owned : [...owned, item.id];
    const updated = {
      ...inventory,
      item_ids,
      [item.kind]: item.id,
    };
    writeJson(INV_KEY, updated);
    markRedeemed(code);
    return {
      ...snapshot(wallet, updated),
      message: item.name || item.id,
      kind: "item",
      reward: item,
      duplicate: already,
    };
  }

  throw new Error("Tipo de código desconocido");
}
