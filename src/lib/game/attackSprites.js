// @ts-nocheck
// Sprites de ataque cortos (presets + custom URL) para cada categoría de movimiento.

export const ATTACK_SPRITE_PRESETS = [
  { id: "slash", label: "Slash", desc: "Corte horizontal" },
  { id: "cross", label: "Cruz", desc: "Doble corte en X" },
  { id: "punch", label: "Impacto", desc: "Golpe concentrado" },
  { id: "arc", label: "Arco", desc: "Barrido curvo" },
  { id: "burst", label: "Ráfaga", desc: "Explosión radial" },
  { id: "bolt", label: "Rayo", desc: "Descarga lineal" },
  { id: "ring", label: "Anillo", desc: "Onda circular" },
  { id: "spike", label: "Púa", desc: "Estocada frontal" },
  { id: "wave", label: "Onda", desc: "Onda de choque" },
  { id: "star", label: "Estrella", desc: "Destello estelar" },
];

export const DEFAULT_ATTACK_SPRITES = {
  m1: "slash",
  special1: "punch",
  special2: "arc",
  special3: "bolt",
  ultimate: "burst",
};

/** Map UI labels M1–M4 + ULT */
export const MOVE_CAT_UI = [
  { id: "m1", short: "M1", label: "Ataque básico" },
  { id: "special1", short: "M2", label: "Especial 1" },
  { id: "special2", short: "M3", label: "Especial 2" },
  { id: "special3", short: "M4", label: "Especial 3" },
  { id: "ultimate", short: "ULT", label: "Ultimate" },
];

const canvasCache = new Map();

function drawPreset(id, color = "#ffffff") {
  const key = id + "|" + color;
  if (canvasCache.has(key)) return canvasCache.get(key);

  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = 64;
  const cy = 64;

  if (id === "slash") {
    const g = ctx.createLinearGradient(10, 90, 118, 30);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.35, color);
    g.addColorStop(0.7, "#ffffff");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(16, 96);
    ctx.quadraticCurveTo(64, 20, 112, 36);
    ctx.stroke();
  } else if (id === "cross") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(104, 104); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(104, 24); ctx.lineTo(24, 104); ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(28, 28); ctx.lineTo(100, 100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(100, 28); ctx.lineTo(28, 100); ctx.stroke();
  } else if (id === "punch") {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 50);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "arc") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 48, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 48, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  } else if (id === "burst") {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.strokeStyle = i % 2 ? "#ffffff" : color;
      ctx.lineWidth = i % 2 ? 4 : 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
      ctx.lineTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56);
      ctx.stroke();
    }
  } else if (id === "bolt") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(50, 12);
    ctx.lineTo(78, 12);
    ctx.lineTo(60, 56);
    ctx.lineTo(86, 56);
    ctx.lineTo(40, 116);
    ctx.lineTo(52, 68);
    ctx.lineTo(28, 68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.moveTo(56, 20);
    ctx.lineTo(70, 20);
    ctx.lineTo(58, 52);
    ctx.lineTo(72, 52);
    ctx.lineTo(48, 96);
    ctx.lineTo(56, 60);
    ctx.lineTo(40, 60);
    ctx.closePath();
    ctx.fill();
  } else if (id === "ring") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === "spike") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(20, 72);
    ctx.lineTo(100, 48);
    ctx.lineTo(100, 80);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(36, 66);
    ctx.lineTo(96, 54);
    ctx.lineTo(96, 62);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (id === "wave") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 1 - i * 0.28;
      ctx.beginPath();
      ctx.arc(30, cy, 28 + i * 22, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (id === "star") {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 52 : 22;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // fallback punch
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.4, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  canvasCache.set(key, c);
  return c;
}

export function resolveAttackSprite(move, category) {
  if (!move && !category) return { kind: "preset", id: "slash" };
  const src = move?.attackSprite || move?.fx || DEFAULT_ATTACK_SPRITES[category || move?.category] || "slash";
  if (typeof src === "string" && (src.startsWith("http") || src.startsWith("data:") || src.startsWith("/"))) {
    return { kind: "url", src };
  }
  return { kind: "preset", id: String(src || "slash") };
}

export function makeAttackSpriteCanvas(presetId, color) {
  try {
    return drawPreset(presetId || "slash", color || "#ffffff");
  } catch {
    return null;
  }
}
