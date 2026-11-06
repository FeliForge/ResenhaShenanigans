// @ts-nocheck
// Rebinding de controles + persistencia en localStorage.

export const ACTIONS = [
  { id: "up", label: "Mover adelante" },
  { id: "down", label: "Mover atrás" },
  { id: "left", label: "Mover izquierda" },
  { id: "right", label: "Mover derecha" },
  { id: "jump", label: "Saltar" },
  { id: "dash", label: "Dash" },
  { id: "m1", label: "Ataque básico (M1)" },
  { id: "special1", label: "Especial 1" },
  { id: "special2", label: "Especial 2" },
  { id: "special3", label: "Especial 3" },
  { id: "ultimate", label: "Ultimate" },
  { id: "quickchat", label: "Quick Chat" },
];

// W y S invertidos por defecto. Dash en Shift. M1 = clic izquierdo.
export const DEFAULT_BINDS = {
  up: "KeyS", down: "KeyW", left: "KeyA", right: "KeyD",
  jump: "Space", dash: "ShiftLeft",
  m1: "Mouse0", special1: "Digit2", special2: "Digit3",
  special3: "Digit4", ultimate: "Digit5", quickchat: "KeyT",
};

// Cuando un panel (ajustes/tienda) está abierto, el juego ignora el input.
export const inputState = { blocked: false };

const KEY = "cb_bindsv3";

export function loadBinds() {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULT_BINDS };
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_BINDS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_BINDS };
}

export function saveBinds(binds) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(binds));
  } catch {}
}

export function codeToLabel(code) {
  if (!code) return "—";
  if (code === "Space") return "Espacio";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Mouse0") return "Clic";
  if (code === "Mouse1") return "Clic der.";
  if (code === "Mouse2") return "Clic medio";
  if (code.startsWith("Mouse")) return "Mouse" + code.slice(5);
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code.slice(5);
  return code;
}
