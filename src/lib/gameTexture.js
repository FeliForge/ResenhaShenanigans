// @ts-nocheck
import * as THREE from "three";

function shade(hex, amt) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function makeCharacterTexture(character) {
  const w = 256, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const { primary, secondary, accent } = character.colors || { primary: "#00e5ff", secondary: "#888", accent: "#ff0" };
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
  ctx.fillStyle = shade(primary, -10);
  poly(ctx, [[88, 200], [100, 230], [84, 250]]);
  poly(ctx, [[168, 200], [156, 230], [172, 250]]);
  ctx.fillStyle = shade(secondary, 10);
  ctx.beginPath(); ctx.arc(128, 160, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(108, 130, 40, 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBubbleTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(4, 4, 248, 56, 10); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(String(text || "").slice(0, 24), 128, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 10, 64, 64, 60);
  g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#3a3d45"; x.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  return tex;
}

export function makeCityGroundTexture() {
  const s = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  const scale = s / 800;
  const to = (world) => (world + 400) * scale;

  const base = ctx.createLinearGradient(0, 0, s, s);
  base.addColorStop(0, "#23262e");
  base.addColorStop(0.5, "#1e2128");
  base.addColorStop(1, "#252830");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 1200; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 1.2, 1.2);
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let i = 0; i < 900; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);

  const blockHalf = 22 * scale;
  for (let bx = -7; bx <= 7; bx++) {
    for (let bz = -7; bz <= 7; bz++) {
      const x = to(bx * 56 + 28);
      const y = to(bz * 56 + 28);
      const g = ctx.createLinearGradient(x - blockHalf, y - blockHalf, x + blockHalf, y + blockHalf);
      g.addColorStop(0, "#5c6068");
      g.addColorStop(1, "#4a4e56");
      ctx.fillStyle = g;
      ctx.fillRect(x - blockHalf, y - blockHalf, blockHalf * 2, blockHalf * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 0.7;
      const tile = 4.5 * scale;
      for (let t = -blockHalf; t < blockHalf; t += tile) {
        ctx.beginPath(); ctx.moveTo(x - blockHalf, y + t); ctx.lineTo(x + blockHalf, y + t); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + t, y - blockHalf); ctx.lineTo(x + t, y + blockHalf); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(200,200,210,0.25)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - blockHalf, y - blockHalf, blockHalf * 2, blockHalf * 2);
    }
  }

  const roadW = 12 * scale;
  ctx.fillStyle = "#181b21";
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.fillRect(wx - roadW / 2, 0, roadW, s);
    ctx.fillRect(0, wx - roadW / 2, s, roadW);
  }

  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.fillRect(wx - roadW / 2 + 2, 0, 2, s);
    ctx.fillRect(wx + roadW / 2 - 4, 0, 2, s);
    ctx.fillRect(0, wx - roadW / 2 + 2, s, 2);
    ctx.fillRect(0, wx + roadW / 2 - 4, s, 2);
  }

  ctx.strokeStyle = "rgba(235,235,240,0.55)";
  ctx.lineWidth = 1.6;
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.beginPath(); ctx.moveTo(wx - roadW / 2 + 1, 0); ctx.lineTo(wx - roadW / 2 + 1, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx + roadW / 2 - 1, 0); ctx.lineTo(wx + roadW / 2 - 1, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx - roadW / 2 + 1); ctx.lineTo(s, wx - roadW / 2 + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx + roadW / 2 - 1); ctx.lineTo(s, wx + roadW / 2 - 1); ctx.stroke();
  }

  ctx.strokeStyle = "#e8c84a";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([10 * scale, 8 * scale]);
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.beginPath(); ctx.moveTo(wx - 1.2, 0); ctx.lineTo(wx - 1.2, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx + 1.2, 0); ctx.lineTo(wx + 1.2, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx - 1.2); ctx.lineTo(s, wx - 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx + 1.2); ctx.lineTo(s, wx + 1.2); ctx.stroke();
  }
  ctx.setLineDash([]);

  for (let rx = -8; rx <= 7; rx++) {
    for (let rz = -8; rz <= 7; rz++) {
      const cx = to(rx * 56);
      const cz = to(rz * 56);
      ctx.fillStyle = "rgba(230,230,235,0.85)";
      for (let k = -4; k <= 4; k++) {
        const stripe = 2.2 * scale;
        const gap = 3.4 * scale;
        ctx.fillRect(cx + k * gap - stripe / 2, cz - roadW / 2 - 5 * scale, stripe, 5 * scale);
        ctx.fillRect(cx + k * gap - stripe / 2, cz + roadW / 2, stripe, 5 * scale);
        ctx.fillRect(cx - roadW / 2 - 5 * scale, cz + k * gap - stripe / 2, 5 * scale, stripe);
        ctx.fillRect(cx + roadW / 2, cz + k * gap - stripe / 2, 5 * scale, stripe);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - roadW / 2, cz - roadW / 2, roadW, roadW);
    }
  }

  const pc = to(0);
  const pr = 32 * scale;
  const plaza = ctx.createRadialGradient(pc, pc, 0, pc, pc, pr);
  plaza.addColorStop(0, "rgba(70,78,90,0.55)");
  plaza.addColorStop(1, "rgba(40,44,52,0)");
  ctx.fillStyle = plaza;
  ctx.beginPath(); ctx.arc(pc, pc, pr, 0, Math.PI * 2); ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeBuildingTextures() {
  const s = 256;
  const base = document.createElement("canvas");
  base.width = s; base.height = s;
  const bx = base.getContext("2d");
  bx.fillStyle = "#6a7380"; bx.fillRect(0, 0, s, s);
  bx.fillStyle = "#1a1e28";
  for (let y = 8; y < s; y += 28) {
    for (let x = 8; x < s; x += 20) {
      if (Math.random() > 0.15) bx.fillRect(x, y, 12, 16);
    }
  }
  const emi = document.createElement("canvas");
  emi.width = s; emi.height = s;
  const ex = emi.getContext("2d");
  ex.fillStyle = "#000"; ex.fillRect(0, 0, s, s);
  for (let y = 8; y < s; y += 28) {
    for (let x = 8; x < s; x += 20) {
      if (Math.random() > 0.55) {
        ex.fillStyle = Math.random() > 0.5 ? "#ffe9a0" : "#a0d4ff";
        ex.fillRect(x, y, 12, 16);
      }
    }
  }
  const map = new THREE.CanvasTexture(base);
  const emissive = new THREE.CanvasTexture(emi);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  return { map, emissive };
}
