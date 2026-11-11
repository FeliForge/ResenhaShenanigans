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

const EMOTE_MARK = "__GOOFY_EMOTES_V3__";
const LOCAL_EMOTE_FIND = `        } else if (anim === "hop") {
          const p = Math.abs(Math.sin(et * 8));
          sprite.position.y = bob + p * 1.2;
          sprite.scale.set(sx * (1 - p * 0.1), sy * (1 + p * 0.1), 1);
        }
      }`;
const LOCAL_EMOTE_REP = `        } else if (anim === "hop") {
          const p = Math.abs(Math.sin(et * 8));
          sprite.position.y = bob + p * 1.2;
          sprite.scale.set(sx * (1 - p * 0.1), sy * (1 + p * 0.1), 1);
        } else if (anim === "goofy") {
          sprite.position.y = bob + Math.abs(Math.sin(et * 11)) * 0.55;
          sprite.rotation.z = Math.sin(et * 14) * 0.45;
          sprite.scale.set(sx * (1 + Math.sin(et * 22) * 0.18), sy * (1 - Math.abs(Math.sin(et * 11)) * 0.12), 1);
        } else if (anim === "troll") {
          const p = Math.abs(Math.sin(et * 5));
          sprite.scale.set(sx * (1 + p * 0.45), sy * (0.85 + p * 0.35), 1);
          sprite.rotation.z = Math.sin(et * 3) * 0.15;
          sprite.position.y = bob + p * 0.35;
        } else if (anim === "moonwalk") {
          sprite.position.x += Math.sin(et * 2.2) * 0.35;
          sprite.position.y = bob + Math.abs(Math.sin(et * 4)) * 0.08;
          sprite.rotation.z = -0.18 + Math.sin(et * 6) * 0.05;
          sprite.rotation.y = ang - et * Math.PI * 0.9;
          sprite.scale.set(sx * 0.95, sy * 1.05, 1);
        } else if (anim === "robot") {
          const step = Math.floor(et * 6) % 2;
          sprite.rotation.z = step ? 0.12 : -0.12;
          sprite.position.y = bob + (step ? 0.08 : 0);
          sprite.scale.set(sx * 1.05, sy * 0.95, 1);
        } else if (anim === "dizzy") {
          sprite.rotation.y = ang + et * Math.PI * 4;
          sprite.rotation.z = Math.sin(et * 10) * 0.35;
          sprite.position.y = bob + Math.abs(Math.sin(et * 7)) * 0.15;
        } else if (anim === "cheer") {
          const p = Math.abs(Math.sin(et * 7));
          sprite.position.y = bob + p * 0.9;
          sprite.scale.set(sx * (1 + p * 0.15), sy * (1 + p * 0.2), 1);
          sprite.rotation.z = Math.sin(et * 14) * 0.1;
        } else if (anim === "sneak") {
          sprite.position.y = bob - 0.45 + Math.abs(Math.sin(et * 5)) * 0.1;
          sprite.scale.set(sx * 1.1, sy * 0.7, 1);
          sprite.position.x += Math.sin(et * 3) * 0.25;
        } else if (anim === "explode") {
          const p = Math.abs(Math.sin(et * 9));
          sprite.scale.set(sx * (1 + p * 0.55), sy * (1 + p * 0.55), 1);
          sprite.rotation.z = Math.sin(et * 20) * 0.2;
          sprite.position.y = bob + p * 0.2;
        } else if (anim === "floss") {
          sprite.position.x += Math.sin(et * 10) * 0.4;
          sprite.rotation.z = Math.sin(et * 10) * 0.35;
          sprite.scale.set(sx * (1 + Math.abs(Math.sin(et * 10)) * 0.08), sy, 1);
          sprite.position.y = bob + Math.abs(Math.sin(et * 5)) * 0.12;
        } else if (anim === "chicken") {
          const p = Math.abs(Math.sin(et * 12));
          sprite.position.y = bob + p * 0.7;
          sprite.scale.set(sx * (1 + p * 0.25), sy * (1 - p * 0.15), 1);
          sprite.rotation.z = Math.sin(et * 12) * 0.25;
        } else if (anim === "dab") {
          sprite.rotation.z = -0.55;
          sprite.rotation.y = ang + 0.4;
          sprite.position.y = bob + 0.15;
          sprite.scale.set(sx * 1.05, sy * 0.95, 1);
        } else if (anim === "panic") {
          sprite.position.x += Math.sin(et * 28) * 0.22;
          sprite.rotation.z = Math.sin(et * 30) * 0.28;
          sprite.position.y = bob + Math.abs(Math.sin(et * 18)) * 0.18;
          sprite.scale.set(sx * (1 + Math.sin(et * 20) * 0.06), sy * (1 - Math.abs(Math.sin(et * 20)) * 0.05), 1);
        } else if (anim === "vibe") {
          sprite.position.y = bob + Math.sin(et * 3) * 0.2;
          sprite.rotation.z = Math.sin(et * 2.2) * 0.18;
          sprite.scale.set(sx * (1 + Math.sin(et * 2.5) * 0.06), sy * (1 + Math.sin(et * 2.5 + 1) * 0.04), 1);
        } else if (anim === "yeet") {
          const p = Math.min(1, et * 2.2);
          sprite.position.y = bob + p * 1.4;
          sprite.position.x += Math.sin(et * 4) * 0.15;
          sprite.rotation.z = -0.3 + p * 0.5;
          sprite.scale.set(sx * (1 - p * 0.1), sy * (1 + p * 0.2), 1);
        }
      }`;

const REMOTE_EMOTE_FIND = `          if (r.emoteUntil > now) {
            const et = (now - r.emoteStart) / 1000;
            if (r.emoteAnim === "spin") r.sprite.rotation.y = r.sprite.rotation.y + et * Math.PI * 3;
            else if (r.emoteAnim === "hop") r.sprite.position.y += Math.abs(Math.sin(et * 8)) * 1.1;
            else {
              r.sprite.position.y += Math.abs(Math.sin(et * 9)) * 0.3;
              r.sprite.rotation.z = Math.sin(et * 9) * 0.2;
            }
          }`;
const REMOTE_EMOTE_REP = `          if (r.emoteUntil > now) {
            const et = (now - r.emoteStart) / 1000;
            if (r.emoteAnim === "spin") r.sprite.rotation.y = r.sprite.rotation.y + et * Math.PI * 3;
            else if (r.emoteAnim === "hop") r.sprite.position.y += Math.abs(Math.sin(et * 8)) * 1.1;
            else if (r.emoteAnim === "goofy") {
              r.sprite.position.y += Math.abs(Math.sin(et * 11)) * 0.5;
              r.sprite.rotation.z = Math.sin(et * 14) * 0.4;
            } else if (r.emoteAnim === "troll") {
              const p = Math.abs(Math.sin(et * 5));
              r.sprite.scale.set(1 + p * 0.4, 0.9 + p * 0.3, 1);
              r.sprite.position.y += p * 0.3;
            } else if (r.emoteAnim === "moonwalk") {
              r.sprite.position.x += Math.sin(et * 2.2) * 0.3;
              r.sprite.rotation.y += -et * Math.PI * 0.9;
              r.sprite.rotation.z = -0.15;
            } else if (r.emoteAnim === "robot") {
              const step = Math.floor(et * 6) % 2;
              r.sprite.rotation.z = step ? 0.12 : -0.12;
            } else if (r.emoteAnim === "dizzy") {
              r.sprite.rotation.y += et * Math.PI * 4;
              r.sprite.rotation.z = Math.sin(et * 10) * 0.3;
            } else if (r.emoteAnim === "cheer") {
              r.sprite.position.y += Math.abs(Math.sin(et * 7)) * 0.85;
            } else if (r.emoteAnim === "sneak") {
              r.sprite.position.y -= 0.4;
              r.sprite.scale.set(1.1, 0.7, 1);
              r.sprite.position.x += Math.sin(et * 3) * 0.2;
            } else if (r.emoteAnim === "explode") {
              const p = Math.abs(Math.sin(et * 9));
              r.sprite.scale.set(1 + p * 0.5, 1 + p * 0.5, 1);
            } else if (r.emoteAnim === "floss") {
              r.sprite.position.x += Math.sin(et * 10) * 0.35;
              r.sprite.rotation.z = Math.sin(et * 10) * 0.3;
            } else if (r.emoteAnim === "chicken") {
              r.sprite.position.y += Math.abs(Math.sin(et * 12)) * 0.65;
              r.sprite.rotation.z = Math.sin(et * 12) * 0.22;
            } else if (r.emoteAnim === "dab") {
              r.sprite.rotation.z = -0.5;
              r.sprite.position.y += 0.12;
            } else if (r.emoteAnim === "panic") {
              r.sprite.position.x += Math.sin(et * 28) * 0.2;
              r.sprite.rotation.z = Math.sin(et * 30) * 0.25;
            } else if (r.emoteAnim === "vibe") {
              r.sprite.position.y += Math.sin(et * 3) * 0.18;
              r.sprite.rotation.z = Math.sin(et * 2.2) * 0.15;
            } else if (r.emoteAnim === "yeet") {
              const p = Math.min(1, et * 2.2);
              r.sprite.position.y += p * 1.3;
              r.sprite.rotation.z = -0.25 + p * 0.45;
            } else {
              r.sprite.position.y += Math.abs(Math.sin(et * 9)) * 0.3;
              r.sprite.rotation.z = Math.sin(et * 9) * 0.2;
            }
          }`;

function applyUniqueEmotes(text) {
  // Strip older marks so V3 can re-apply on fresh bake
  text = text.replace(/\n\/\/ __GOOFY_EMOTES_V1__\n?/g, "");
  text = text.replace(/\n\/\/ __GOOFY_EMOTES_V2__\n?/g, "");
  if (text.includes(EMOTE_MARK)) return text;
  if (!text.includes(LOCAL_EMOTE_FIND) || !text.includes(REMOTE_EMOTE_FIND)) {
    console.warn("[prebuild] unique emote patch skipped: anchors not found");
    return text;
  }
  let out = text.replace(LOCAL_EMOTE_FIND, LOCAL_EMOTE_REP);
  out = out.replace(REMOTE_EMOTE_FIND, REMOTE_EMOTE_REP);
  return out + "\n// " + EMOTE_MARK + "\n";
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
    text = applyUniqueEmotes(text);
    if (source === "baked" || text !== before) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, text);
    }
    console.log("[prebuild] GameCanvas ready (" + source + ")", text.length, text.includes(GFX_MARK) ? "+gfx" : "no-gfx", text.includes(EMOTE_MARK) ? "+emotes" : "no-emotes");
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
