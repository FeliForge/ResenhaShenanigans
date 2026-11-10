import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");

function isGood(text) {
  return (
    typeof text === "string" &&
    text.length > 40000 &&
    text.includes("buildCity") &&
    text.includes("export default") &&
    text.includes("__MP_POINTER_LOCK__") &&
    text.includes("__ATTACK_POSE_V1__") &&
    !text.includes("__CONTINUE__")
  );
}

function loadBaked() {
  try {
    let b64 = "";
    const names = ["a0","a1","a2","a3","b0","b1","b2","b3"];
    for (const n of names) {
      const p = path.join(dir, "gc_chunks", n + ".b64");
      if (!fs.existsSync(p)) return null;
      b64 += fs.readFileSync(p, "utf8").trim();
    }
    const gz = Buffer.from(b64, "base64");
    const text = gunzipSync(gz).toString("utf8");
    return isGood(text) ? text : null;
  } catch (e) {
    console.warn("[prebuild] baked decode fail", e?.message || e);
    return null;
  }
}

function limitZoom(text) {
  // Reduce max orbit distance (was ~26)
  text = text.replace(
    /camState\.dist = THREE\.MathUtils\.clamp\(camState\.dist \+ delta \* 0\.012, 1\.65, 26\)/g,
    "camState.dist = THREE.MathUtils.clamp(camState.dist + delta * 0.012, 1.65, 12) // MAX_ZOOM_OUT"
  );
  text = text.replace(
    /camState\.dist = THREE\.MathUtils\.clamp\(camState\.dist \+ delta \* [^,]+,\s*[^,]+,\s*26\)/g,
    "camState.dist = THREE.MathUtils.clamp(camState.dist + delta * 0.012, 1.65, 12)"
  );
  return text;
}


// Engancha el pipeline de shaders / perfil gráfico (src/lib/game/gfxProfile.js + postfx.js)
// en el GameCanvas completo. Todo o nada: si algún anclaje no coincide, se deja el
// GameCanvas tal cual (el juego sigue funcionando, solo sin shaders).
const GFX_MARK = "__GFX_POSTFX_V1__";
const GFX_STEPS = [
  ["import", 'import * as THREE from "three";',
    'import * as THREE from "three";\nimport { getGfxProfile } from "@/lib/game/gfxProfile";\nimport { createPostFx } from "@/lib/game/postfx";'],
  ["renderer", "const renderer = new THREE.WebGLRenderer({ antialias: true });",
    "const __gp = getGfxProfile();\n    const renderer = new THREE.WebGLRenderer(__gp.rendererOptions);"],
  ["pixelRatio", "renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));",
    "renderer.setPixelRatio(__gp.pixelRatio);"],
  ["shadowType", "renderer.shadowMap.type = THREE.PCFSoftShadowMap;",
    "renderer.shadowMap.type = __gp.shadowType === \"soft\" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;"],
  ["shadowSize", "dir.shadow.mapSize.set(2048, 2048);",
    "dir.shadow.mapSize.set(__gp.tier.shadowMap, __gp.tier.shadowMap);"],
  ["create", "scene.add(dir);",
    "scene.add(dir);\n    const gfx = createPostFx({ renderer, scene, camera, mount, dir, profile: __gp });"],
  ["resize", "camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);",
    "camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); gfx.setSize(w, h);"],
  ["render", "renderer.render(scene, camera);",
    "gfx.render(dt, elapsed, nightFactor);"],
  ["dispose", "renderer.dispose();",
    "gfx.dispose();\n      renderer.dispose();"],
];

function applyGfx(text) {
  if (text.includes(GFX_MARK)) return text;
  let out = text;
  for (const [name, find, rep] of GFX_STEPS) {
    const first = out.indexOf(find);
    if (first < 0 || out.indexOf(find, first + find.length) >= 0) {
      console.warn("[prebuild] gfx patch skipped: anchor '" + name + "' not unique/found");
      return text;
    }
    out = out.slice(0, first) + rep + out.slice(first + find.length);
  }
  return out + "\n// " + GFX_MARK + "\n";
}

async function main() {
  try {
    let text = null;
    let source = "";
    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      if (isGood(cur)) { text = cur; source = "existing"; }
    }
    if (!text) {
      text = loadBaked();
      source = "baked";
    }
    if (!text) {
      console.warn("[prebuild] no baked GameCanvas — leaving stub");
      return;
    }
    const before = text;
    if (!text.includes("MAX_ZOOM_OUT")) text = limitZoom(text);
    text = applyGfx(text);
    if (source === "baked" || text !== before) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, text);
    }
    console.log("[prebuild] GameCanvas ready (" + source + ")", text.length, text.includes(GFX_MARK) ? "+gfx" : "no-gfx");
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
