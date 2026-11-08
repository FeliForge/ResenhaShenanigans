import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

const CORE_URLS = [
  "https://cdn.jsdelivr.net/gh/FeliForge/ResenhaShenanigans@f9b84a526703062066b0f949db6e504b48f61321/scripts/prebuild.mjs",
  "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/f9b84a526703062066b0f949db6e504b48f61321/scripts/prebuild.mjs",
];

function injectPlatforms(text) {
  if (text.includes("function patchPlatforms")) return text;
  const patchFn = `
function patchPlatforms(text) {
  if (text.includes("__HOLLOW_BUILDING_PLATFORMS_V1__")) return text;
  if (!text.includes("platforms: city.platforms")) {
    text = text.replace(
      "colliders: city.colliders,",
      "colliders: city.colliders,\n      platforms: city.platforms || [], // __HOLLOW_BUILDING_PLATFORMS_V1__"
    );
  }
  const oldLand = \`if (game.player.position.y <= 1.6) {
        game.player.position.y = 1.6;
        if (!game.wasGround) { audio.playLand(); vfx.addDust(game.player.position.clone()); game.landSquash = 1; }
        game.velocity.y = 0; game.onGround = true;
      }\`;
  const newLand = \`// __HOLLOW_BUILDING_PLATFORMS_V1__
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
      }\`;
  if (text.includes(oldLand)) text = text.replace(oldLand, newLand);
  else {
    const alt = /if \\(game\\.player\\.position\\.y <= 1\\.6\\) \\{[\\s\\S]*?game\\.onGround = true;\\s*\\}/;
    if (alt.test(text)) text = text.replace(alt, newLand.trim());
  }
  return text;
}
`;
  let t = text.replace("function patchAll(text) {", patchFn + "\nfunction patchAll(text) {");
  t = t.replace("return patchEmoteKey(", "return patchPlatforms(\n  patchEmoteKey(");
  t = t.replace(
    'cur.includes("__EMOTE_KEY_F__") &&',
    'cur.includes("__EMOTE_KEY_F__") &&\n        cur.includes("__HOLLOW_BUILDING_PLATFORMS_V1__") &&'
  );
  t = t.replace(
    "patchBillboards(text)))))))\n            )\n          )\n        )\n      )\n    )\n  );",
    "patchBillboards(text)))))))\n            )\n          )\n        )\n      )\n    )\n  )\n);"
  );
  return t;
}

async function main() {
  let core = null;
  for (const url of CORE_URLS) {
    try {
      console.log("[prebuild] loading core from", url.slice(0, 72));
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      core = await res.text();
      if (core && core.includes("function patchAll") && core.length > 15000) break;
      core = null;
    } catch (e) {
      console.warn("[prebuild] core fetch fail", e?.message || e);
    }
  }
  if (!core) {
    console.error("[prebuild] could not load core prebuild");
    process.exit(0);
  }
  const patched = injectPlatforms(core);
  const tmp = path.join(dir, "_prebuild_core.mjs");
  fs.writeFileSync(tmp, patched);
  await import(pathToFileURL(tmp).href);
}

main().catch((e) => {
  console.error("[prebuild] error", e);
  process.exit(0);
});
