import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");

function concatTxt(prefix, max = 30) {
  let src = "";
  for (let i = 0; i < max; i++) {
    const p = path.join(dir, `${prefix}${i}.txt`);
    if (!fs.existsSync(p)) break;
    src += fs.readFileSync(p, "utf8");
  }
  return src;
}

function concatHex(prefix, max = 30) {
  let hx = "";
  for (let i = 0; i < max; i++) {
    const p = path.join(dir, `${prefix}${i}.hex`);
    if (!fs.existsSync(p)) break;
    hx += fs.readFileSync(p, "utf8").trim();
  }
  return hx;
}

// --- GameApp: prefer hex chunks, else fetch known-good commit ---
{
  let ga = "";
  const hx = concatHex("gah");
  if (hx.length > 1000) {
    try { ga = Buffer.from(hx, "hex").toString("utf8"); } catch {}
  }
  if (!ga || ga.length < 5000) ga = concatTxt("ga");

  if (!ga || ga.length < 5000 || !ga.includes("export default function GameApp")) {
    const GOOD = "https://raw.githubusercontent.com/FeliForge/ResenhaShenanigans/95d297a36528559eb00bdf9db065d5ee6a52f903/src/components/game/GameApp.jsx";
    try {
      const res = await fetch(GOOD);
      if (res.ok) {
        ga = await res.text();
        console.log("[prebuild] GameApp fetched from good commit", ga.length);
      }
    } catch (e) {
      console.log("[prebuild] GameApp fetch failed", e?.message || e);
    }
  }

  if (ga && ga.length > 5000 && ga.includes("export default function GameApp")) {
    if (!ga.includes("skillsTargetFix")) {
      ga = ga.replace(
        'import { useEffect, useRef, useState } from "react";',
        'import { useEffect, useRef, useState } from "react";\nimport "@/lib/game/skillsTargetFix";'
      );
    }
    const out = path.join(root, "src/components/game/GameApp.jsx");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, ga);
    console.log("[prebuild] GameApp wrote", ga.length);
  } else {
    console.log("[prebuild] GameApp skip", ga?.length || 0);
  }
}

// --- GameCanvas ---
function fromText() {
  const src = concatTxt("t");
  return src.length > 10000 ? src : null;
}
function fromHex() {
  const hx = concatHex("h");
  if (!hx || hx.length < 100) return null;
  try { return gunzipSync(Buffer.from(hx, "hex")).toString("utf8"); }
  catch { return null; }
}
function fromGzipB64() {
  let b64 = "";
  for (let i = 0; i < 4; i++) {
    const p = path.join(dir, `z${i}.b64`);
    if (!fs.existsSync(p)) return null;
    b64 += fs.readFileSync(p, "utf8").trim();
  }
  if (!b64) return null;
  try { return gunzipSync(Buffer.from(b64, "base64")).toString("utf8"); }
  catch { return null; }
}

const gc = fromText() || fromHex() || fromGzipB64() || "";
if (gc && gc.length >= 10000 && gc.includes("buildCity") && gc.includes("export default GameCanvas")) {
  const out = path.join(root, "src/components/game/GameCanvas.jsx");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, gc);
  console.log("[prebuild] GameCanvas", gc.length);
} else {
  console.log("[prebuild] GameCanvas skip/incomplete", gc?.length || 0);
}
