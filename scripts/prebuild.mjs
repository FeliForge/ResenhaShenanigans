import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const out = path.join(root, "src/components/game/GameCanvas.jsx");
const bakedDir = path.join(dir, "gc_baked");

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

function assembleBaked() {
  if (!fs.existsSync(bakedDir)) return null;
  const files = fs.readdirSync(bakedDir).filter((f) => f.endsWith(".b64")).sort();
  if (files.length < 3) return null;
  let buf = Buffer.alloc(0);
  for (const f of files) {
    const raw = fs.readFileSync(path.join(bakedDir, f), "utf8").trim();
    buf = Buffer.concat([buf, Buffer.from(raw, "base64")]);
  }
  const text = buf.toString("utf8");
  return isGood(text) ? text : null;
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
    const baked = assembleBaked();
    if (baked) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, baked);
      console.log("[prebuild] OK assembled baked GameCanvas", baked.length);
      return;
    }
    console.warn("[prebuild] no baked GameCanvas found — leaving stub");
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
