import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

const parts = [];
for (let i = 0; i < 8; i++) {
  const p = path.join(dir, "gc_parts", `s${i}.txt`);
  if (!fs.existsSync(p)) {
    console.error("[prebuild] missing", p);
    process.exit(0);
  }
  parts.push(fs.readFileSync(p, "utf8"));
}
const full = parts.join("");
if (!full.includes("buildCity") || !full.includes("export default") || full.length < 40000) {
  console.error("[prebuild] invalid assemble", full.length);
  process.exit(0);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, full);
console.log("[prebuild] OK assembled GameCanvas", full.length);
