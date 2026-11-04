// @ts-nocheck
import {
  QUEST_POOL,
  QUEST_COUNT,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  REPORT_CAPS,
} from "@/data/quests";

// Misiones diarias y monedas, guardadas en este navegador.
// El progreso solo sube por deltas acotados, igual que antes en el servidor.

const SET_KEY = "resenha_quests";
const WALLET_KEY = "resenha_wallet";

const utcDay = () => new Date().toISOString().slice(0, 10);

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

function buildQuests() {
  const pool = [...QUEST_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUEST_COUNT).map((def, i) => {
    const difficulty = DIFFICULTY_KEYS[Math.floor(Math.random() * DIFFICULTY_KEYS.length)];
    const target = def[difficulty];
    return {
      id: `${def.id}-${i}`,
      metric: def.metric,
      icon: def.icon,
      title: def.title,
      description: def.description.replace("{n}", target),
      target,
      progress: 0,
      reward: DIFFICULTIES[difficulty].reward,
      difficulty,
      claimed: false,
    };
  });
}

function ensureDay() {
  const day = utcDay();
  const set = readJson(SET_KEY, null);
  if (set?.day === day && Array.isArray(set.quests)) return set;
  const next = { day, quests: buildQuests() };
  writeJson(SET_KEY, next);
  return next;
}

function ensureWallet() {
  const wallet = readJson(WALLET_KEY, null);
  if (wallet && typeof wallet.coins === "number") return wallet;
  const next = { coins: 0, total_earned: 0 };
  writeJson(WALLET_KEY, next);
  return next;
}

export async function loadQuests() {
  try {
    const set = ensureDay();
    const wallet = ensureWallet();
    return { day: set.day, quests: set.quests || [], coins: wallet.coins || 0 };
  } catch {
    return null;
  }
}

export async function sendProgress(deltas) {
  try {
    const set = ensureDay();
    const quests = (set.quests || []).map((q) => ({ ...q }));
    let changed = false;
    for (const q of quests) {
      if (q.claimed) continue;
      const raw = deltas?.[q.metric];
      if (!raw || raw <= 0) continue;
      const inc = Math.min(raw, REPORT_CAPS[q.metric] ?? 100);
      const next = Math.min(q.target, (q.progress || 0) + inc);
      if (next !== (q.progress || 0)) {
        q.progress = next;
        changed = true;
      }
    }
    if (changed) writeJson(SET_KEY, { ...set, quests });
    return { quests };
  } catch {
    return null;
  }
}

export async function claimReward(questId) {
  const set = ensureDay();
  const quests = (set.quests || []).map((q) => ({ ...q }));
  const quest = quests.find((q) => q.id === questId);
  if (!quest) throw new Error("Misión no encontrada");
  if (quest.claimed) throw new Error("Recompensa ya reclamada");
  if ((quest.progress || 0) < quest.target) throw new Error("Misión sin completar");
  quest.claimed = true;
  writeJson(SET_KEY, { ...set, quests });
  const wallet = ensureWallet();
  const coins = (wallet.coins || 0) + quest.reward;
  writeJson(WALLET_KEY, {
    coins,
    total_earned: (wallet.total_earned || 0) + quest.reward,
  });
  return { quests, coins };
}
