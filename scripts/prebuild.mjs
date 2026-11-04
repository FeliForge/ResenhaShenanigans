import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const parts = [0,1,2].map((i) =>
  fs.readFileSync(path.join(root, `src/components/game/_gc_part${i}.txt`), "utf8")
);
const out = path.join(root, "src/components/game/GameCanvas.jsx");
fs.writeFileSync(out, parts.join(""));
console.log("[prebuild] GameCanvas assembled", parts.reduce((a, p) => a + p.length, 0), "bytes");
