import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

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
  return gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
}

let src = fromHex() || fromGzipB64() || "";
if (src) console.log("[prebuild] source length", src.length);

if (!src || src.length < 10000) {
  console.error("[prebuild] FATAL: GameCanvas source missing or too small", src?.length || 0);
  process.exit(1);
}
if (!src.includes("buildCity") || !src.includes("export default GameCanvas")) {
  console.error("[prebuild] FATAL: GameCanvas source incomplete");
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, src);
console.log("[prebuild] wrote", out, src.length);
