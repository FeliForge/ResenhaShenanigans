// @ts-nocheck
import * as THREE from "three";

// Texturas procedurales (canvas) para el render low-poly.

// Personaje: sprite low-poly con sombreado y detalles.
export function makeCharacterTexture(character) {
  const w = 256, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const { primary, secondary, accent } = character.colors;
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
  ctx.fillText(text, w / 2, (h - 18) / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// Sombra blob suave bajo personajes.
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

// Asfalto con ruido.
export function makeGroundTexture() {
  const s = 512;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#33363f";
  ctx.fillRect(0, 0, s, s);
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // grietas sutiles
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    let x = Math.random() * s, y = Math.random() * s;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60, 60);
  return tex;
}

// Asfalto urbano con grilla de calles, marcas viales y pasos de cebra.
export function makeCityGroundTexture() {
  const s = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext("2d");
  const scale = s / 800;
  // base asfalto con ruido
  ctx.fillStyle = "#2b2e36";
  ctx.fillRect(0, 0, s, s);
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // banquetas (bloques más claros entre calles) con juntas de baldosas
  ctx.fillStyle = "#52565f";
  for (let bx = -7; bx <= 7; bx++) {
    for (let bz = -7; bz <= 7; bz++) {
      const x = (bx * 56 + 28 + 400) * scale;
      const y = (bz * 56 + 28 + 400) * scale;
      const half = 23 * scale;
      ctx.fillRect(x - half, y - half, half * 2, half * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - half, y - half, half * 2, half * 2);
      ctx.beginPath();
      ctx.moveTo(x - half, y); ctx.lineTo(x + half, y);
      ctx.moveTo(x, y - half); ctx.lineTo(x, y + half);
      ctx.stroke();
    }
  }
  // calles (más oscuras) entre banquetas
  const roadW = 10 * scale;
  ctx.fillStyle = "#1c1f25";
  for (let r = -8; r <= 7; r++) {
    const wx = (r * 56 + 400) * scale;
    ctx.fillRect(wx - roadW / 2, 0, roadW, s);
    ctx.fillRect(0, wx - roadW / 2, s, roadW);
  }
  // marcas centrales amarillas discontinuas
  ctx.strokeStyle = "#f2cf3f";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 7]);
  for (let r = -8; r <= 7; r++) {
    const wx = (r * 56 + 400) * scale;
    ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx); ctx.lineTo(s, wx); ctx.stroke();
  }
  ctx.setLineDash([]);
  // líneas de borde blancas (sólidas) a lo largo de las calles
  ctx.strokeStyle = "rgba(225,225,225,0.45)";
  ctx.lineWidth = 1.1;
  for (let r = -8; r <= 7; r++) {
    const wx = (r * 56 + 400) * scale;
    ctx.beginPath(); ctx.moveTo(wx - roadW / 2, 0); ctx.lineTo(wx - roadW / 2, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx + roadW / 2, 0); ctx.lineTo(wx + roadW / 2, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx - roadW / 2); ctx.lineTo(s, wx - roadW / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wx + roadW / 2); ctx.lineTo(s, wx + roadW / 2); ctx.stroke();
  }
  // pasos de cebra en intersecciones
  ctx.fillStyle = "#d6d6d6";
  for (let rx = -8; rx <= 7; rx++) {
    for (let rz = -8; rz <= 7; rz++) {
      const cx = (rx * 56 + 400) * scale;
      const cz = (rz * 56 + 400) * scale;
      for (let k = -3; k <= 3; k++) {
        ctx.fillRect(cx + k * 3 - 1, cz - roadW / 2 - 3.5, 2, 3.5);
        ctx.fillRect(cx + k * 3 - 1, cz + roadW / 2, 2, 3.5);
        ctx.fillRect(cx - roadW / 2 - 3.5, cz + k * 3 - 1, 3.5, 2);
        ctx.fillRect(cx + roadW / 2, cz + k * 3 - 1, 3.5, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Fachada de edificio con ventanas (map + emissiveMap para ventanas iluminadas).
export function makeBuildingTextures() {
  const s = 256;
  const base = document.createElement("canvas"); base.width = s; base.height = s;
  const emi = document.createElement("canvas"); emi.width = s; emi.height = s;
  const bc = base.getContext("2d");
  const ec = emi.getContext("2d");
  ec.fillStyle = "#000"; ec.fillRect(0, 0, s, s);
  // muro base
  bc.fillStyle = "#3a3e48";
  bc.fillRect(0, 0, s, s);
  const cols = 6, rows = 7, pad = 5;
  const cw = s / cols, ch = s / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + pad, y = r * ch + pad, w = cw - pad * 2, h = ch - pad * 2;
      // marco de ventana
      bc.fillStyle = "#15171c";
      bc.fillRect(x - 2, y - 2, w + 4, h + 4);
      // vidrio
      const lit = Math.random() > 0.42;
      bc.fillStyle = lit ? "#4a5266" : "#232830";
      bc.fillRect(x, y, w, h);
      // travesaños (mullion cruzado)
      bc.strokeStyle = "#15171c";
      bc.lineWidth = 1.4;
      bc.beginPath();
      bc.moveTo(x + w / 2, y); bc.lineTo(x + w / 2, y + h);
      bc.moveTo(x, y + h / 2); bc.lineTo(x + w, y + h / 2);
      bc.stroke();
      if (lit) {
        ec.fillStyle = Math.random() > 0.5 ? "#ffd98a" : "#aee6ff";
        ec.fillRect(x, y, w, h);
      }
    }
  }
  // líneas de piso
  bc.fillStyle = "rgba(0,0,0,0.28)";
  for (let r = 0; r <= rows; r++) bc.fillRect(0, r * ch - 1, s, 2);
  const map = new THREE.CanvasTexture(base);
  const emissive = new THREE.CanvasTexture(emi);
  map.colorSpace = THREE.SRGBColorSpace;
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
  const c = hex.replace("#", "");
  let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}