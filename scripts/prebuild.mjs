import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

function concatParts(prefix, max = 30) {
  let src = "";
  for (let i = 0; i < max; i++) {
    const p = path.join(dir, `${prefix}${i}.txt`);
    if (!fs.existsSync(p)) break;
    src += fs.readFileSync(p, "utf8");
  }
  return src;
}

const ga = concatParts("ga");
if (ga.length > 5000 && ga.includes("export default function GameApp")) {
  const out = path.join(root, "src/components/game/GameApp.jsx");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, ga);
  console.log("[prebuild] GameApp", ga.length);
} else {
  console.log("[prebuild] GameApp skip", ga.length);
}

function fromText() {
  const src = concatParts("t");
  return src.length > 10000 ? src : null;
}
function fromHex() {
  let hx = "";
  for (let i = 0; i < 20; i++) {
    const p = path.join(dir, `h${i}.hex`);
    if (!fs.existsSync(p)) break;
    hx += fs.readFileSync(p, "utf8").trim();
  }
  if (!hx || hx.length < 100) return null;
  return gunzipSync(Buffer.from(hx, "hex")).toString("utf8");
}
function fromGzipB64() {
  let b64 = "";
  for (let i = 0; i < 4; i++) {
    const p = path.join(dir, `z${i}.b64`);
    if (!fs.existsSync(p)) return null;
    b64 += fs.readFileSync(p, "utf8").trim();
  }
  if (!b64) return null;
  try {
    return gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
  } catch {
    return null;
  }
}

const gc = fromText() || fromHex() || fromGzipB64() || "";
if (gc && gc.length >= 10000 && gc.includes("buildCity") && gc.includes("export default GameCanvas")) {
  const out = path.join(root, "src/components/game/GameCanvas.jsx");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, gc);
  console.log("[prebuild] GameCanvas", gc.length);
} else {
  console.log("[prebuild] GameCanvas skip/incomplete", gc?.length || 0);
}
