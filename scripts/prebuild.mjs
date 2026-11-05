import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const partsDir = path.join(root, "scripts", "gc_parts_txt");
const dest = path.join(root, "src", "components", "game", "GameCanvas.jsx");
try {
  if (fs.existsSync(partsDir)) {
    const files = fs.readdirSync(partsDir).filter(f => f.endsWith(".txt")).sort();
    if (files.length) {
      const content = files.map(f => fs.readFileSync(path.join(partsDir, f), "utf8")).join("");
      if (content.length > 10000 && content.includes("export default GameCanvas")) {
        fs.writeFileSync(dest, content);
        console.log("[prebuild] restored GameCanvas from offline parts", content.length);
        process.exit(0);
      }
    }
  }
  console.log("[prebuild] no offline parts, keeping existing GameCanvas");
} catch (e) {
  console.warn("[prebuild]", e.message);
}
