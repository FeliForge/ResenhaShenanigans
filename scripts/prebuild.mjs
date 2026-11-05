import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

function fromB64(s) {
  return Buffer.from(String(s).replace(/\s/g, ""), "base64").toString("utf8");
}

const parts = [];
for (let i = 0; i < 4; i++) {
  const p = path.join(dir, "gc_parts", `p${i}.b64`);
  if (!fs.existsSync(p)) {
    console.error("[prebuild] missing", p);
    process.exit(0);
  }
  parts.push(fromB64(fs.readFileSync(p, "utf8")));
}
const full = parts.join("");
if (!full.includes("buildCity") || !full.includes("export default") || full.length < 40000) {
  console.error("[prebuild] invalid assemble", full.length);
  process.exit(0);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, full);
console.log("[prebuild] OK assembled GameCanvas", full.length);
