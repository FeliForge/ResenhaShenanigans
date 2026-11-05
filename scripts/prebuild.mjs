import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

function fromB64(s) {
  return Buffer.from(s.replace(/\s/g, ""), "base64").toString("utf8");
}

async function main() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const p = path.join(dir, "gc_parts", `p${i}.b64`);
    if (!fs.existsSync(p)) {
      console.warn("[prebuild] missing", p);
      parts.push("");
      continue;
    }
    parts.push(fromB64(fs.readFileSync(p, "utf8")));
  }
  const full = parts.join("");
  if (full.includes("buildCity") && full.includes("export default") && full.length > 40000) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, full);
    console.log("[prebuild] assembled GameCanvas from b64 parts", full.length);
    return;
  }
  const URLS = [
    "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df62234634671d27e47d355f86f310c64b/src/components/game/GameCanvas.jsx",
    "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df62234634671d27e47d355f86f310c64b/src/components/game/GameCanvas.jsx",
  ];
  for (const url of URLS) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("buildCity") && text.length > 20000) {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, text);
        console.log("[prebuild] fetched", text.length);
        return;
      }
    } catch (e) {
      console.warn("[prebuild] fetch fail", e?.message || e);
    }
  }
  console.warn("[prebuild] FAILED — stub remains, length joined=", full.length);
}
main().catch(e => { console.error(e); process.exit(0); });
