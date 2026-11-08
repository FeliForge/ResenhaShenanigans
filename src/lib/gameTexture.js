// @ts-nocheck
import * as THREE from "three";

// Texturas procedurales (canvas) para el render low-poly.

// Personaje: sprite low-poly con sombreado y detalles.
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

  // sombra de suelo
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 22, 72, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // piernas con degradado
  const legGrad = ctx.createLinearGradient(0, 330, 0, 472);
  legGrad.addColorStop(0, secondary);
  legGrad.addColorStop(1, shade(secondary, -30));
  ctx.fillStyle = legGrad;
  poly(ctx, [[104, 330], [120, 330], [128, 472], [104, 474]]);
  poly(ctx, [[136, 330], [152, 330], [152, 474], [128, 472]]);

  // botas
  ctx.fillStyle = accent;
  poly(ctx, [[100, 460], [132, 460], [128, 484], [104, 484]]);
  poly(ctx, [[128, 460], [156, 460], [152, 484], [128, 484]]);

  // torso con degradado
  const bodyGrad = ctx.createLinearGradient(0, 230, 0, 340);
  bodyGrad.addColorStop(0, shade(primary, 25));
  bodyGrad.addColorStop(1, shade(primary, -20));
  ctx.fillStyle = bodyGrad;
  poly(ctx, [[96, 230], [160, 230], [172, 342], [84, 342]]);

  // cinturón
  ctx.fillStyle = accent;
  ctx.fillRect(86, 322, 84, 14);

  // brazos
  ctx.fillStyle = secondary;
  poly(ctx, [[96, 240], [112, 240], [70, 302], [54, 296]]);
  poly(ctx, [[160, 240], [176, 240], [210, 302], [196, 314]]);
  // guantes
  ctx.fillStyle = accent;
  poly(ctx, [[52, 286], [76, 290], [72, 314], [50, 308]]);
  poly(ctx, [[194, 296], [216, 304], [210, 328], [188, 320]]);

  // cabeza
  const headGrad = ctx.createLinearGradient(0, 150, 0, 226);
  headGrad.addColorStop(0, shade(primary, 30));
  headGrad.addColorStop(1, primary);
  ctx.fillStyle = headGrad;
  poly(ctx, [[128, 150], [160, 168], [160, 210], [128, 226], [96, 210], [96, 168]]);

  // visor brillante
  ctx.fillStyle = accent;
  poly(ctx, [[104, 178], [152, 178], [148, 198], [108, 198]]);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  poly(ctx, [[110, 182], [124, 182], [122, 190], [110, 190]]);

  // contorno
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(128, 150); ctx.lineTo(160, 168); ctx.lineTo(160, 210);
  ctx.lineTo(128, 226); ctx.lineTo(96, 210); ctx.lineTo(96, 168);
  ctx.closePath(); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

/** Pose de golpe: brazo derecho extendido hacia adelante. */
export function makeCharacterAttackTexture(character) {
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
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 22, 72, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // piernas: postura de embestida (más abierta)
  const legGrad = ctx.createLinearGradient(0, 330, 0, 472);
  legGrad.addColorStop(0, secondary);
  legGrad.addColorStop(1, shade(secondary, -30));
  ctx.fillStyle = legGrad;
  poly(ctx, [[90, 332], [108, 330], [118, 474], [92, 476]]);
  poly(ctx, [[148, 330], [168, 334], [172, 476], [146, 474]]);

  ctx.fillStyle = accent;
  poly(ctx, [[88, 462], [122, 460], [118, 486], [90, 486]]);
  poly(ctx, [[144, 462], [176, 464], [172, 488], [144, 486]]);

  // torso inclinado hacia el golpe
  const bodyGrad = ctx.createLinearGradient(0, 230, 0, 340);
  bodyGrad.addColorStop(0, shade(primary, 25));
  bodyGrad.addColorStop(1, shade(primary, -20));
  ctx.fillStyle = bodyGrad;
  poly(ctx, [[100, 228], [168, 220], [176, 340], [88, 348]]);

  ctx.fillStyle = accent;
  ctx.fillRect(90, 324, 84, 14);

  // brazo izquierdo retraído
  ctx.fillStyle = secondary;
  poly(ctx, [[100, 236], [116, 240], [72, 280], [56, 272]]);
  ctx.fillStyle = accent;
  poly(ctx, [[50, 264], [76, 270], [70, 294], [48, 286]]);

  // brazo derecho extendido (golpe)
  ctx.fillStyle = secondary;
  poly(ctx, [[160, 230], [178, 226], [236, 248], [228, 268]]);
  ctx.fillStyle = accent;
  poly(ctx, [[224, 240], [248, 246], [246, 272], [220, 264]]);
  // destello en el puño
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(238, 254, 10, 0, Math.PI * 2);
  ctx.fill();

  // cabeza inclinada
  const headGrad = ctx.createLinearGradient(0, 145, 0, 220);
  headGrad.addColorStop(0, shade(primary, 30));
  headGrad.addColorStop(1, primary);
  ctx.fillStyle = headGrad;
  poly(ctx, [[134, 145], [168, 160], [166, 204], [132, 220], [100, 206], [102, 162]]);

  ctx.fillStyle = accent;
  poly(ctx, [[110, 172], [158, 168], [154, 190], [112, 192]]);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  poly(ctx, [[116, 176], [130, 174], [128, 184], [116, 184]]);

  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(134, 145); ctx.lineTo(168, 160); ctx.lineTo(166, 204);
  ctx.lineTo(132, 220); ctx.lineTo(100, 206); ctx.lineTo(102, 162);
  ctx.closePath(); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Burbuja de Quick Chat.
export function makeBubbleTexture(text) {
  const w = 256, h = 80;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, 6, 6, w - 12, h - 18, 18); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w / 2 - 12, h - 18); ctx.lineTo(w / 2 + 12, h - 18);
  ctx.lineTo(w / 2, h - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 30px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(text || "").slice(0, 18), w / 2, (h - 18) / 2 + 4);
  return new THREE.CanvasTexture(canvas);
}

export function makeShadowTexture() {
  const s = 128;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(0,0,0,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

export function makeGroundTexture() {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  // asfalto base
  ctx.fillStyle = "#2a2e36";
  ctx.fillRect(0, 0, s, s);
  // grano
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    const a = 0.04 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
  }
  // líneas de carril
  ctx.strokeStyle = "rgba(232,200,74,0.55)";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s);
  ctx.stroke();
  ctx.setLineDash([]);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  tex.anisotropy = 4;
  return tex;
}

export function makeCityGroundTexture() {
  const s = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  const scale = s / 800;
  const to = (world) => (world + 400) * scale;
  // fondo (acera / tierra)
  ctx.fillStyle = "#1e2128";
  ctx.fillRect(0, 0, s, s);
  // manzanas (bloques de edificios / plaza)
  const blockHalf = 22 * scale;
  for (let bx = -7; bx <= 7; bx++) {
    for (let bz = -7; bz <= 7; bz++) {
      const x = to(bx * 56 + 28), y = to(bz * 56 + 28);
      // acera
      ctx.fillStyle = "#3a3e48";
      ctx.fillRect(x - blockHalf - 4, y - blockHalf - 4, blockHalf * 2 + 8, blockHalf * 2 + 8);
      // plaza / patio interior
      ctx.fillStyle = "#2c3038";
      ctx.fillRect(x - blockHalf, y - blockHalf, blockHalf * 2, blockHalf * 2);
      // detalles de losa
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x - blockHalf, y + i * (blockHalf / 2.5));
        ctx.lineTo(x + blockHalf, y + i * (blockHalf / 2.5));
        ctx.stroke();
      }
    }
  }
  // calles
  const roadW = 12 * scale;
  ctx.fillStyle = "#181b21";
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.fillRect(wx - roadW / 2, 0, roadW, s);
    ctx.fillRect(0, wx - roadW / 2, s, roadW);
  }
  // líneas amarillas discontinuas
  ctx.strokeStyle = "#e8c84a";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  for (let r = -8; r <= 7; r++) {
    const wx = to(r * 56);
    ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx); ctx.lineTo(s, wx); ctx.stroke();
  }
  ctx.setLineDash([]);
  // cruces peatonales en intersecciones
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let bx = -7; bx <= 7; bx++) {
    for (let bz = -7; bz <= 7; bz++) {
      const x = to(bx * 56), y = to(bz * 56);
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(x - roadW / 2 + 2, y + i * 3 - 1, roadW - 4, 2);
        ctx.fillRect(x + i * 3 - 1, y - roadW / 2 + 2, 2, roadW - 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Fachada de edificio con ventanas (map + emissiveMap para ventanas iluminadas).
export function makeBuildingTextures() {
  const s = 512;
  const base = document.createElement("canvas"); base.width = s; base.height = s;
  const emi = document.createElement("canvas"); emi.width = s; emi.height = s;
  const bc = base.getContext("2d");
  const ec = emi.getContext("2d");
  ec.fillStyle = "#000"; ec.fillRect(0, 0, s, s);

  // Deep concrete gradient with subtle vertical weathering.
  const wall = bc.createLinearGradient(0, 0, s, 0);
  wall.addColorStop(0, "#242c38");
  wall.addColorStop(0.48, "#424957");
  wall.addColorStop(1, "#202936");
  bc.fillStyle = wall;
  bc.fillRect(0, 0, s, s);

  const cols = 7, rows = 9, pad = 6;
  const cw = s / cols, ch = s / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + pad, y = r * ch + pad;
      const w = cw - pad * 2, h = ch - pad * 2;
      const lit = Math.random() > 0.43;

      // Recessed metal frame and deep inner shadow.
      bc.fillStyle = "#101720";
      bc.fillRect(x - 4, y - 4, w + 8, h + 9);
      bc.fillStyle = "#697887";
      bc.fillRect(x - 2, y - 2, w + 4, 2);
      bc.fillRect(x - 2, y - 2, 2, h + 4);

      const glass = bc.createLinearGradient(x, y, x + w, y + h);
      if (lit) {
        glass.addColorStop(0, "#e3bc7c");
        glass.addColorStop(0.48, "#718c9e");
        glass.addColorStop(1, "#344b62");
      } else {
        glass.addColorStop(0, "#40566c");
        glass.addColorStop(0.55, "#1e2c3c");
        glass.addColorStop(1, "#111c2a");
      }
      bc.fillStyle = glass;
      bc.fillRect(x, y, w, h);

      // Reflections, mullions and projecting concrete sills.
      bc.fillStyle = "rgba(220,245,255,0.18)";
      bc.fillRect(x + 4, y + 3, Math.max(3, w * 0.12), h - 7);
      bc.fillStyle = "#101923";
      bc.fillRect(x + w * 0.5 - 1, y, 2, h);
      bc.fillRect(x, y + h * 0.56, w, 2);
      bc.fillStyle = "#8a9aa7";
      bc.fillRect(x - 3, y + h + 1, w + 6, 3);

      if (lit) {
        const glow = ec.createLinearGradient(x, y, x + w, y + h);
        glow.addColorStop(0, "#ffe3a0");
        glow.addColorStop(1, Math.random() > 0.5 ? "#8fdfff" : "#ffc477");
        ec.fillStyle = glow;
        ec.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
    }
  }

  // Strong floor slabs, vertical pilasters and a clean roof/base cornice.
  bc.fillStyle = "rgba(8,13,22,0.78)";
  for (let r = 0; r <= rows; r++) bc.fillRect(0, r * ch - 2, s, 5);
  bc.fillStyle = "rgba(160,184,205,0.24)";
  for (let c = 0; c <= cols; c++) bc.fillRect(c * cw - 2, 0, 4, s);
  bc.fillStyle = "#111923";
  bc.fillRect(0, 0, s, 10);
  bc.fillRect(0, s - 10, s, 10);
  bc.fillStyle = "rgba(120,156,180,0.34)";
  bc.fillRect(0, 12, s, 3);
  bc.fillRect(0, s - 15, s, 3);

  const map = new THREE.CanvasTexture(base);
  const emissive = new THREE.CanvasTexture(emi);
  map.colorSpace = THREE.SRGBColorSpace;
  emissive.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  emissive.anisotropy = 8;
  return { map, emissive };
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shade(hex, amt) {
  const c = String(hex || "#888888").replace("#", "");
  let r = parseInt(c.substr(0, 2), 16) || 128, g = parseInt(c.substr(2, 2), 16) || 128, b = parseInt(c.substr(4, 2), 16) || 128;
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
