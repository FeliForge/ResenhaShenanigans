import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const URLS = [
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df6223/src/components/game/GameCanvas.jsx",
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df6223/src/components/game/GameCanvas.jsx",
];

async function fetchText(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("buildCity") && text.includes("export default") && text.length > 20000) {
        console.log("[prebuild] OK fetched", text.length, "from", url.slice(0, 60));
        return text;
      }
    } catch (e) {
      console.warn("[prebuild] fetch fail", e?.message || e);
    }
  }
  return null;
}

async function main() {
  const out = path.join(root, "src/components/game/GameCanvas.jsx");
  let cur = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  const good =
    cur.includes("buildCity") &&
    cur.includes("export default") &&
    cur.length > 20000 &&
    !cur.includes("__CONTINUE__");
  if (good) {
    console.log("[prebuild] GameCanvas already complete", cur.length);
    return;
  }
  const text = await fetchText(URLS);
  if (text) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log("[prebuild] restored GameCanvas", text.length);
  } else {
    console.error("[prebuild] FATAL: could not restore GameCanvas");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
