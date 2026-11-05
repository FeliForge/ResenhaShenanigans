import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

const URLS = [
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@d599d4df62234634671d27e47d355f86f310c64b/src/components/game/GameCanvas.jsx",
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/d599d4df62234634671d27e47d355f86f310c64b/src/components/game/GameCanvas.jsx",
];

function isGood(text) {
  return (
    typeof text === "string" &&
    text.length > 40000 &&
    text.includes("buildCity") &&
    text.includes("export default") &&
    !text.includes("__CONTINUE__") &&
    !text.includes("PLACEHOLDER")
  );
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function main() {
  // Already good?
  if (fs.existsSync(out)) {
    const cur = fs.readFileSync(out, "utf8");
    if (isGood(cur)) {
      console.log("[prebuild] GameCanvas already complete", cur.length);
      return;
    }
  }

  // Try offline text parts s0-s7 if present
  try {
    const parts = [];
    let ok = true;
    for (let i = 0; i < 8; i++) {
      const p = path.join(dir, "gc_parts", `s${i}.txt`);
      if (!fs.existsSync(p)) { ok = false; break; }
      parts.push(fs.readFileSync(p, "utf8"));
    }
    if (ok) {
      const full = parts.join("");
      if (isGood(full)) {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, full);
        console.log("[prebuild] assembled from s0-s7", full.length);
        return;
      }
    }
  } catch (e) {
    console.warn("[prebuild] offline parts failed", e?.message || e);
  }

  // Network fetch from known-good commit
  for (const url of URLS) {
    try {
      console.log("[prebuild] fetching", url.slice(0, 70));
      const text = await fetchText(url);
      if (isGood(text)) {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, text);
        console.log("[prebuild] OK fetched GameCanvas", text.length);
        return;
      }
      console.warn("[prebuild] bad payload from", url.slice(0, 50), text?.length);
    } catch (e) {
      console.warn("[prebuild] fetch fail", e?.message || e);
    }
  }

  console.warn("[prebuild] FAILED — leaving stub in place");
}

main().catch((e) => {
  console.error("[prebuild] error", e);
  process.exit(0); // never fail the build
});
