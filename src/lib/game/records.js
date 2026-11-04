// @ts-nocheck
const KEY = "resenha_matches";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function countMatches() {
  return read().length;
}

export function recordMatch(entry) {
  const list = read();
  list.push({ ...entry, at: Date.now() });
  const trimmed = list.slice(-80);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota */
  }
  return trimmed.length;
}
