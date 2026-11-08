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
    !text.includes("PLACEHOLDER - will replace")
  );
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function applyPatches(text) {
  // Spawn high
  if (!text.includes("player.position.set(0, 14, 0)")) {
    text = text.replace("player.position.set(0, 1.6, 0)", "player.position.set(0, 14, 0)");
    text = text.replace("onGround: true, meter: 0", "onGround: false, meter: 0");
  }

  // Platforms for hollow buildings
  if (!text.includes("__HOLLOW_BUILDING_PLATFORMS_V1__")) {
    if (text.includes("colliders: city.colliders,") && !text.includes("platforms: city.platforms")) {
      text = text.replace(
        "colliders: city.colliders,",
        "colliders: city.colliders,\n      platforms: city.platforms || [], // __HOLLOW_BUILDING_PLATFORMS_V1__"
      );
    }
    const landRe = /if \(game\.player\.position\.y <= 1\.6\) \{[\s\S]*?game\.onGround = true;\s*\}/;
    const newLand = `// __HOLLOW_BUILDING_PLATFORMS_V1__
      {
        const px = game.player.position.x, pz = game.player.position.z;
        let floorY = 1.6;
        const plats = city.platforms || [];
        for (let i = 0; i < plats.length; i++) {
          const p = plats[i];
          const dx = Math.abs(px - p.x), dz = Math.abs(pz - p.z);
          if (dx < p.w * 0.5 && dz < p.d * 0.5) {
            const surface = (p.y || 0) + 1.6;
            if (surface > floorY && game.player.position.y >= surface - 1.15) floorY = surface;
          }
        }
        if (game.player.position.y <= floorY) {
          game.player.position.y = floorY;
          if (!game.wasGround) { audio.playLand(); vfx.addDust(game.player.position.clone()); game.landSquash = 1; }
          game.velocity.y = 0; game.onGround = true;
        } else {
          game.onGround = false;
        }
      }`;
    if (landRe.test(text)) text = text.replace(landRe, newLand);
  }

  // getHeading
  if (!text.includes("getHeading")) {
    text = text.replace(
      /setDashStyle: \(s\) => apiRef\.current\?\.setDashStyle\(s\),\n  \}\)\);/,
      `setDashStyle: (s) => apiRef.current?.setDashStyle(s),\n    getHeading: () => apiRef.current?.getHeading?.() ?? 0,\n  }));`
    );
    text = text.replace(
      /setDashStyle: \(s\) => vfx\.setDashStyle\(s\) \};/,
      `setDashStyle: (s) => vfx.setDashStyle(s), getHeading: () => { const deg = ((-camState.yaw * 180 / Math.PI) % 360 + 360) % 360; return deg; } };`
    );
  }

  // Fixed billboards
  if (!text.includes("Fixed city posters are permanent") && text.includes("function applyBillboard(slot, url)")) {
    text = text.replace(
      /function applyBillboard\(slot, url\) \{[\s\S]*?\n    \}\n\n    let sendMyLoadout = null;\n    function setMyBillboard\(url\) \{[\s\S]*?\n    \}/,
      `function applyBillboard(slot, url) {\n      // Fixed city posters are permanent; ignore player custom overwrites.\n      return;\n    }\n\n    let sendMyLoadout = null;\n    function setMyBillboard(url) {\n      sendMyLoadout?.();\n    }`
    );
  }

  return text;
}

async function main() {
  try {
    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      if (isGood(cur) && cur.includes("__HOLLOW_BUILDING_PLATFORMS_V1__") && cur.includes("getHeading")) {
        console.log("[prebuild] GameCanvas already complete", cur.length);
        return;
      }
      if (isGood(cur)) {
        const patched = applyPatches(cur);
        fs.writeFileSync(out, patched);
        console.log("[prebuild] patched existing GameCanvas", patched.length);
        return;
      }
    }
    for (const url of URLS) {
      try {
        console.log("[prebuild] fetching", url.slice(0, 70));
        let text = await fetchText(url);
        if (isGood(text)) {
          text = applyPatches(text);
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, text);
          console.log("[prebuild] OK fetched+patched GameCanvas", text.length);
          return;
        }
        console.warn("[prebuild] bad payload", text?.length);
      } catch (e) {
        console.warn("[prebuild] fetch fail", e?.message || e);
      }
    }
    console.warn("[prebuild] FAILED — leaving stub");
  } catch (e) {
    console.error("[prebuild] unexpected", e?.message || e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[prebuild] error", e);
    process.exit(0);
  });
