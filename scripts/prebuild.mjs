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
  const a = path.join(dir, "GameCanvas.a.b64");
  const b = path.join(dir, "GameCanvas.b.b64");
  const single = path.join(dir, "GameCanvas.jsx.gz.b64");
  try {
    let b64 = "";
    if (fs.existsSync(a) && fs.existsSync(b)) {
      b64 = fs.readFileSync(a, "utf8").trim() + fs.readFileSync(b, "utf8").trim();
    } else if (fs.existsSync(single)) {
      b64 = fs.readFileSync(single, "utf8").trim();
    } else return null;
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
