import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");
function fromText() {
  let src = "";
  for (let i = 0; i < 30; i++) {
    const p = path.join(dir, `t${i}.txt`);
    if (!fs.existsSync(p)) break;
    src += fs.readFileSync(p, "utf8");
  }
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
let src = fromText() || fromHex() || "";
if (src) console.log("[prebuild] source length", src.length);
if (!src || src.length < 10000 || !src.includes("buildCity") || !src.includes("export default GameCanvas")) {
  console.error("[prebuild] FATAL incomplete", src?.length);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, src);
console.log("[prebuild] wrote", out, src.length);
