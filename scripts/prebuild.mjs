import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const chunksDir = path.join(root, "src/components/game/gcchunks");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

function fromGzip() {
  let b64 = "";
  for (let i = 0; i < 4; i++) {
    const p = path.join(dir, `z${i}.b64`);
    if (!fs.existsSync(p)) return null;
    b64 += fs.readFileSync(p, "utf8").trim();
  }
  if (!b64) return null;
  return gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
}

function fromChunks() {
  if (!fs.existsSync(chunksDir)) return null;
  const files = fs.readdirSync(chunksDir).filter((f) => /^c\d+\.txt$/.test(f)).sort((a, b) => {
    return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
  });
  if (files.length < 7) {
    console.log("[prebuild] incomplete chunks", files.length, "- skipping");
    return null;
  }
  let src = "";
  for (const f of files) src += fs.readFileSync(path.join(chunksDir, f), "utf8");
  return src;
}

let src = fromGzip() || fromChunks() || "";
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
