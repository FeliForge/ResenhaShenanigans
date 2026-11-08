import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");
const baked = path.join(dir, "GameCanvas.jsx.gz.b64");

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
  if (!fs.existsSync(baked)) return null;
  try {
    const b64 = fs.readFileSync(baked, "utf8").trim();
    const gz = Buffer.from(b64, "base64");
    const text = gunzipSync(gz).toString("utf8");
    return isGood(text) ? text : null;
  } catch (e) {
    console.warn("[prebuild] baked decode fail", e?.message || e);
    return null;
  }
}

async function main() {
  try {
    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      if (isGood(cur)) {
        console.log("[prebuild] GameCanvas already complete", cur.length);
        return;
      }
    }
    const text = loadBaked();
    if (text) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, text);
      console.log("[prebuild] OK decoded baked GameCanvas", text.length);
      return;
    }
    console.warn("[prebuild] no baked GameCanvas — leaving stub");
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
