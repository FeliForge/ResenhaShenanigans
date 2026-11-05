import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const SHA = "d599d4df6223";

const FILES = [
  {
    rel: "src/components/game/GameCanvas.jsx",
    urls: [
      `https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@${SHA}/src/components/game/GameCanvas.jsx`,
      `https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/${SHA}/src/components/game/GameCanvas.jsx`,
    ],
    test: (t) => t.includes("buildCity") && t.includes("export default") && t.length > 20000 && !t.includes("__CONTINUE__"),
  },
  {
    rel: "src/components/game/GameApp.jsx",
    urls: [
      `https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@${SHA}/src/components/game/GameApp.jsx`,
      `https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/${SHA}/src/components/game/GameApp.jsx`,
    ],
    test: (t) => t.includes("export default function GameApp") && t.length > 8000 && !t.includes("PLACEHOLDER"),
  },
  {
    rel: "src/lib/gameTexture.js",
    urls: [
      `https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@${SHA}/src/lib/gameTexture.js`,
      `https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/${SHA}/src/lib/gameTexture.js`,
    ],
    test: (t) => t.includes("makeCharacterTexture") && t.includes("makeBuildingTextures") && t.length > 8000 && !t.includes("return null"),
  },
  {
    rel: "src/components/game/StartMenu.jsx",
    urls: [
      `https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@${SHA}/src/components/game/StartMenu.jsx`,
      `https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/${SHA}/src/components/game/StartMenu.jsx`,
    ],
    test: (t) => t.includes("export default function StartMenu") && t.length > 5000,
  },
];

async function fetchText(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 1000) {
        console.log("[prebuild] fetched", text.length, url.slice(0, 70));
        return text;
      }
    } catch (e) {
      console.warn("[prebuild] fetch fail", e?.message || e);
    }
  }
  return null;
}

async function ensureFile(entry) {
  const out = path.join(root, entry.rel);
  let cur = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  if (entry.test(cur)) {
    console.log("[prebuild] OK keep", entry.rel, cur.length);
    return true;
  }
  const text = await fetchText(entry.urls);
  if (text && entry.test(text)) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log("[prebuild] restored", entry.rel, text.length);
    return true;
  }
  console.error("[prebuild] FAIL", entry.rel);
  return false;
}

async function main() {
  let ok = true;
  for (const entry of FILES) {
    const r = await ensureFile(entry);
    if (!r) ok = false;
  }
  if (!ok) {
    console.error("[prebuild] FATAL: could not restore one or more core files");
    process.exit(1);
  }
  console.log("[prebuild] OK — core game files restored from", SHA);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
