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

function patchBillboards(text) {
  if (text.includes("Fixed city posters are permanent")) return text;
  if (text.includes("function applyBillboard(slot, url)")) {
    text = text.replace(
      /function applyBillboard\(slot, url\) \{[\s\S]*?\n    \}\n\n    let sendMyLoadout = null;\n    function setMyBillboard\(url\) \{[\s\S]*?\n    \}/,
      `function applyBillboard(slot, url) {\n      // Fixed city posters are permanent; ignore player custom overwrites.\n      return;\n    }\n\n    let sendMyLoadout = null;\n    function setMyBillboard(url) {\n      sendMyLoadout?.();\n    }`
    );
  }
  return text;
}

function patchCompass(text) {
  if (text.includes("getHeading")) return text;
  text = text.replace(
    /setDashStyle: \(s\) => apiRef\.current\?\.setDashStyle\(s\),\n  \}\)\);/,
    `setDashStyle: (s) => apiRef.current?.setDashStyle(s),\n    getHeading: () => apiRef.current?.getHeading?.() ?? 0,\n  }));`
  );
  text = text.replace(
    /setDashStyle: \(s\) => vfx\.setDashStyle\(s\) \};/,
    `setDashStyle: (s) => vfx.setDashStyle(s), getHeading: () => { const deg = ((-camState.yaw * 180 / Math.PI) % 360 + 360) % 360; return deg; } };`
  );
  return text;
}

function patchSpawn(text) {
  if (text.includes("player.position.set(0, 14, 0)")) return text;
  text = text.replace("player.position.set(0, 1.6, 0)", "player.position.set(0, 14, 0)");
  text = text.replace("onGround: true, meter: 0", "onGround: false, meter: 0");
  return text;
}

function patchHub(text) {
  if (text.includes("buildHub")) return text;
  if (text.includes('import { buildShop } from "@/lib/game/buildShop";')) {
    text = text.replace(
      'import { buildShop } from "@/lib/game/buildShop";',
      'import { buildShop } from "@/lib/game/buildShop";\nimport { buildHub } from "@/lib/game/buildHub";'
    );
  }
  if (text.includes("const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);")) {
    text = text.replace(
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);",
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);\n    const hub = buildHub(scene);\n    city.colliders.push(...hub.colliders);"
    );
  }
  return text;
}

function patchCameraControls(text) {
  if (text.includes("requestPointerLock") && text.includes("1.45")) return text;
  text = text.replace(
    /camState\.pitch = THREE\.MathUtils\.clamp\(camState\.pitch \+ dy \* 0\.004, 0\.15, 1\.2\)/g,
    "camState.pitch = THREE.MathUtils.clamp(camState.pitch + dy * 0.004, -0.15, 1.45)"
  );
  return text;
}

function patchAttackSprites(text) {
  if (text.includes("vfx.addAttackSprite")) return text;
  const soft = `skills.cast({ ...move, damage: dmg }, { config: cfg, origin, dir, color: character.colors.accent });`;
  if (text.includes(soft)) {
    text = text.replace(
      soft,
      soft + `\n\n      try { vfx.addAttackSprite(origin, dir, { ...move, category }, character.colors.accent); } catch {}`
    );
  } else {
    console.warn("[prebuild] attack sprite patch pattern not found");
  }
  return text;
}

/** Darker purple-cyan Shibuya night sky / fog. */
function patchShibuyaNight(text) {
  if (text.includes("0x1a1028") && text.includes("Shibuya night")) return text;
  text = text.replace(
    /const SKY_NIGHT = new THREE\.Color\(0x2a3a5a\);/,
    "const SKY_NIGHT = new THREE.Color(0x1a1028); // Shibuya night"
  );
  text = text.replace(
    /const FOG_NIGHT = new THREE\.Color\(0x3a4a66\);/,
    "const FOG_NIGHT = new THREE.Color(0x2a1840);"
  );
  text = text.replace(
    /const SUN_NIGHT = new THREE\.Color\(0x9aaad0\);/,
    "const SUN_NIGHT = new THREE.Color(0x8890c8);"
  );
  // Slightly denser night fog for atmosphere
  text = text.replace(
    /scene\.fog\.density = 0\.0026 \+ 0\.0014 \* nightFactor;/,
    "scene.fog.density = 0.0028 + 0.0022 * nightFactor;"
  );
  // Longer nights feel (cycle stretch a bit toward night)
  text = text.replace(
    /const cycle = \(elapsed \/ 140\) % 1;/,
    "const cycle = (elapsed / 160) % 1;"
  );
  return text;
}

function patchAll(text) {
  return patchShibuyaNight(
    patchAttackSprites(
      patchCameraControls(patchHub(patchSpawn(patchCompass(patchBillboards(text)))))
    )
  );
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function assembleBillboards() {
  const dataDir = path.join(root, "scripts", "bb_data");
  const outDir = path.join(root, "public", "billboards");
  const ids = ["goofyboxy", "vitalsmash", "tangomayhem", "tomatosmash"];
  if (!fs.existsSync(dataDir)) {
    console.warn("[prebuild] no scripts/bb_data — skip billboard assemble");
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    const b64Path = path.join(dataDir, id + ".b64");
    if (!fs.existsSync(b64Path)) {
      console.warn("[prebuild] missing b64 for", id);
      continue;
    }
    const b64 = fs.readFileSync(b64Path, "utf8").trim();
    const buf = Buffer.from(b64, "base64");
    fs.writeFileSync(path.join(outDir, id + ".jpg"), buf);
    console.log("[prebuild] billboard", id, buf.length, "bytes");
  }
}

async function main() {
  try {
    assembleBillboards();

    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      if (
        isGood(cur) &&
        cur.includes("getHeading") &&
        cur.includes("player.position.set(0, 14, 0)") &&
        cur.includes("buildHub") &&
        cur.includes("requestPointerLock") &&
        cur.includes("Fixed city posters are permanent") &&
        cur.includes("vfx.addAttackSprite") &&
        cur.includes("0x1a1028")
      ) {
        console.log("[prebuild] GameCanvas already complete+patched", cur.length);
        return;
      }
      if (isGood(cur)) {
        const patched = patchAll(cur);
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
          text = patchAll(text);
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, text);
          console.log("[prebuild] OK fetched+patched GameCanvas", text.length);
          return;
        }
        console.warn("[prebuild] bad payload from", url.slice(0, 50), text?.length);
      } catch (e) {
        console.warn("[prebuild] fetch fail", e?.message || e);
      }
    }

    console.warn("[prebuild] FAILED — leaving valid stub in place (build still works)");
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
