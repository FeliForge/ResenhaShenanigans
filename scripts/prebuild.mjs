import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const partsDir = path.join(dir, "prebuild_parts");

function loadCore() {
  const files = ["p0.b64", "p1.b64", "p2.b64", "p3.b64"];
  let buf = Buffer.alloc(0);
  for (const f of files) {
    const p = path.join(partsDir, f);
    if (!fs.existsSync(p)) return null;
    buf = Buffer.concat([buf, Buffer.from(fs.readFileSync(p, "utf8").trim(), "base64")]);
  }
  return buf.toString("utf8");
}

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

const coreSrc = loadCore();
if (!coreSrc) {
  console.warn("[prebuild] missing prebuild_parts — leaving stub");
  process.exit(0);
}
const tmpCore = path.join(dir, "_prebuild_core.mjs");
fs.writeFileSync(tmpCore, injectPlatforms(coreSrc));
await import(pathToFileURL(tmpCore).href);
