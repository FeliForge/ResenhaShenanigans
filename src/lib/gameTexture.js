// @ts-nocheck
import * as THREE from "three";

function shade(hex, amt) {
  const c = String(hex || "#888888").replace("#", "");
  let r = parseInt(c.slice(0, 2), 16) || 128, g = parseInt(c.slice(2, 4), 16) || 128, b = parseInt(c.slice(4, 6), 16) || 128;
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function poly(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}

export function makeCharacterTexture(character) {
  const w = 256, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const colors = character?.colors || {};
  const primary = colors.primary || "#00e5ff";
  const secondary = colors.secondary || "#6a7a8a";
  const accent = colors.accent || "#ffcc00";
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.ellipse(w / 2, h - 22, 72, 16, 0, 0, Math.PI * 2); ctx.fill();
  const legGrad = ctx.createLinearGradient(0, 330, 0, 472);
  legGrad.addColorStop(0, secondary); legGrad.addColorStop(1, shade(secondary, -30));
  ctx.fillStyle = legGrad;
  poly(ctx, [[104, 330], [120, 330], [128, 472], [104, 474]]);
  poly(ctx, [[136, 330], [152, 330], [152, 474], [128, 472]]);
  ctx.fillStyle = accent;
  poly(ctx, [[100, 460], [132, 460], [128, 484], [104, 484]]);
  poly(ctx, [[128, 460], [156, 460], [152, 484], [128, 484]]);
  const bodyGrad = ctx.createLinearGradient(0, 230, 0, 340);
  bodyGrad.addColorStop(0, shade(primary, 25)); bodyGrad.addColorStop(1, shade(primary, -20));
  ctx.fillStyle = bodyGrad;
  poly(ctx, [[96, 230], [160, 230], [172, 342], [84, 342]]);
  ctx.fillStyle = accent; ctx.fillRect(86, 322, 84, 14);
  ctx.fillStyle = secondary;
  poly(ctx, [[96, 240], [112, 240], [70, 302], [54, 296]]);
  poly(ctx, [[160, 240], [176, 240], [210, 302], [196, 314]]);
  ctx.fillStyle = accent;
  poly(ctx, [[52, 286], [76, 290], [72, 314], [50, 308]]);
  poly(ctx, [[194, 296], [216, 304], [210, 328], [188, 320]]);
  const headGrad = ctx.createLinearGradient(0, 150, 0, 226);
  headGrad.addColorStop(0, shade(primary, 30)); headGrad.addColorStop(1, primary);
  ctx.fillStyle = headGrad;
  poly(ctx, [[128, 150], [160, 168], [160, 210], [128, 226], [96, 210], [96, 168]]);
  ctx.fillStyle = accent;
  poly(ctx, [[104, 178], [152, 178], [148, 198], [108, 198]]);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  poly(ctx, [[110, 182], [124, 182], [122, 190], [110, 190]]);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function makeBubbleTexture(text) {
  const w = 256, h = 80;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.beginPath();
  const r = 18, x = 6, y = 6, rw = w - 12, rh = h - 18;
  ctx.moveTo(x + r, y); ctx.arcTo(x + rw, y, x + rw, y + rh, r); ctx.arcTo(x + rw, y + rh, x, y + rh, r);
  ctx.arcTo(x, y + rh, x, y, r); ctx.arcTo(x, y, x + rw, y, r); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w / 2 - 12, h - 18); ctx.lineTo(w / 2 + 12, h - 18); ctx.lineTo(w / 2, h - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.font = "bold 30px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(text || "").slice(0, 18), w / 2, (h - 18) / 2 + 4);
  return new THREE.CanvasTexture(canvas);
}

export function makeShadowTexture() {
  const s = 128;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

export function makeGroundTexture() {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#33363f"; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(60, 60);
  return tex;
}

export function makeCityGroundTexture() {
  const s = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  const scale = s / 800;
  const to = (world) => (world + 400) * scale;
  ctx.fillStyle = "#1e2128"; ctx.fillRect(0, 0, s, s);
  const blockHalf = 22 * scale;
  for (let bx = -7; bx <= 7; bx++) {
    for (let bz = -7; bz <= 7; bz++) {
      const x = to(bx * 56 + 28), y = to(bz * 56 + 28);
      ctx.fillStyle = "#52565f";
      ctx.fillRect(x - blockHalf, y - blockHalf, blockHalf * 2, blockHalf * 2);
    }
  }
  const roadW = 12 * scale;
  ctx.fillStyle = "#181b21";
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.fillRect(wx - roadW / 2, 0, roadW, s);
    ctx.fillRect(0, wx - roadW / 2, s, roadW);
  }
  ctx.strokeStyle = "#e8c84a"; ctx.lineWidth = 1.5; ctx.setLineDash([8, 8]);
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx); ctx.lineTo(s, wx); ctx.stroke();
  }
  ctx.setLineDash([]);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export function makeBuildingTextures() {
  const s = 256;
  const base = document.createElement("canvas");
  base.width = s; base.height = s;
  const bx = base.getContext("2d");
  bx.fillStyle = "#6a7380"; bx.fillRect(0, 0, s, s);
  bx.fillStyle = "#1a1e28";
  for (let y = 8; y < s; y += 28) for (let x = 8; x < s; x += 20) if (Math.random() > 0.15) bx.fillRect(x, y, 12, 16);
  const emi = document.createElement("canvas");
  emi.width = s; emi.height = s;
  const ex = emi.getContext("2d");
  ex.fillStyle = "#000"; ex.fillRect(0, 0, s, s);
  for (let y = 8; y < s; y += 28) for (let x = 8; x < s; x += 20) {
    if (Math.random() > 0.55) { ex.fillStyle = Math.random() > 0.5 ? "#ffe9a0" : "#a0d4ff"; ex.fillRect(x, y, 12, 16); }
  }
  const map = new THREE.CanvasTexture(base);
  const emissive = new THREE.CanvasTexture(emi);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  return { map, emissive };
}
