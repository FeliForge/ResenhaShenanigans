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
  if (text.includes("setCrossOrigin")) return text;

  const oldApply = `    function applyBillboard(slot, url) {
      const board = city.billboards[slot];
      if (!board || !url || billboardsApplied.get(slot) === url) return;
      billboardsApplied.set(slot, url);
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        board.mat.map?.dispose();
        board.mat.map = tex;
        board.mat.needsUpdate = true;
      });
    }

    let sendMyLoadout = null;
    function setMyBillboard(url) {
      const slot = mp?.mySeat ? (mp.mySeat - 1) % city.billboards.length : 0;
      applyBillboard(slot, url);
      sendMyLoadout?.();
    }`;

  const newApply = `    function applyBillboard(slot, url) {
      const board = city.billboards[slot];
      if (!board || !url || billboardsApplied.get(slot) === url) return;
      billboardsApplied.set(slot, url);
      const loader = new THREE.TextureLoader();
      if (!String(url).startsWith("data:")) loader.setCrossOrigin("anonymous");
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          tex.needsUpdate = true;
          const old = board.mat.map;
          board.mat.map = tex;
          board.mat.needsUpdate = true;
          if (old && old !== tex) old.dispose();
        },
        undefined,
        () => { billboardsApplied.delete(slot); }
      );
    }

    let sendMyLoadout = null;
    function setMyBillboard(url) {
      if (!url) return;
      if (!mp?.mySeat) {
        for (let i = 0; i < city.billboards.length; i++) applyBillboard(i, url);
      } else {
        const slot = (mp.mySeat - 1) % city.billboards.length;
        applyBillboard(slot, url);
      }
      sendMyLoadout?.();
    }`;

  if (text.includes(oldApply)) text = text.replace(oldApply, newApply);
  else console.warn("[prebuild] billboard patch pattern not found");
  return text;
}

function patchCompass(text) {
  if (text.includes("getHeading")) return text;

  const oldHandle = `  useImperativeHandle(ref, () => ({
    triggerMove: (cat) => apiRef.current?.triggerMove(cat),
    triggerDash: () => apiRef.current?.triggerDash(),
    triggerJump: () => apiRef.current?.triggerJump(),
    setMobileMove: (x, y) => apiRef.current?.setMobileMove(x, y),
    showQuickChat: (p) => apiRef.current?.showQuickChat(p),
    setMyBillboard: (url) => apiRef.current?.setMyBillboard(url),
    showEmote: () => apiRef.current?.showEmote(),
    setDashStyle: (s) => apiRef.current?.setDashStyle(s),
  }));`;

  const newHandle = `  useImperativeHandle(ref, () => ({
    triggerMove: (cat) => apiRef.current?.triggerMove(cat),
    triggerDash: () => apiRef.current?.triggerDash(),
    triggerJump: () => apiRef.current?.triggerJump(),
    setMobileMove: (x, y) => apiRef.current?.setMobileMove(x, y),
    showQuickChat: (p) => apiRef.current?.showQuickChat(p),
    setMyBillboard: (url) => apiRef.current?.setMyBillboard(url),
    showEmote: () => apiRef.current?.showEmote(),
    setDashStyle: (s) => apiRef.current?.setDashStyle(s),
    getHeading: () => apiRef.current?.getHeading?.() ?? 0,
  }));`;

  if (text.includes(oldHandle)) text = text.replace(oldHandle, newHandle);
  else console.warn("[prebuild] compass handle patch not found");

  const oldApi = `apiRef.current = { triggerMove: doMove, triggerDash: doDash, triggerJump, setMobileMove, showQuickChat: doQuickChat, setMyBillboard, showEmote: doEmote, setDashStyle: (s) => vfx.setDashStyle(s) };`;
  const newApi = `apiRef.current = { triggerMove: doMove, triggerDash: doDash, triggerJump, setMobileMove, showQuickChat: doQuickChat, setMyBillboard, showEmote: doEmote, setDashStyle: (s) => vfx.setDashStyle(s), getHeading: () => { const deg = ((-camState.yaw * 180 / Math.PI) % 360 + 360) % 360; return deg; } };`;
  if (text.includes(oldApi)) text = text.replace(oldApi, newApi);
  else console.warn("[prebuild] compass apiRef patch not found");

  const oldStats = `        onStatsRef.current?.({
          health: game.health, meter: game.meter, cooldowns,
          hits: game.hits, meterPeak: game.meterPeak, counters: game.counters,
          kills: game.kills, deaths: game.deaths, dead: game.dead,
          combo: game.comboShown || 0,
          invuln: Math.max(0, game.invulnUntil - now),
          respawnIn: game.dead ? Math.max(0, Math.ceil((game.respawnAt - now) / 1000)) : 0,
        });`;
  const newStats = `        onStatsRef.current?.({
          health: game.health, meter: game.meter, cooldowns,
          hits: game.hits, meterPeak: game.meterPeak, counters: game.counters,
          kills: game.kills, deaths: game.deaths, dead: game.dead,
          combo: game.comboShown || 0,
          invuln: Math.max(0, game.invulnUntil - now),
          respawnIn: game.dead ? Math.max(0, Math.ceil((game.respawnAt - now) / 1000)) : 0,
          heading: ((-camState.yaw * 180 / Math.PI) % 360 + 360) % 360,
        });`;
  if (text.includes(oldStats)) text = text.replace(oldStats, newStats);
  else console.warn("[prebuild] compass stats patch not found");

  return text;
}

function patchAll(text) {
  return patchCompass(patchBillboards(text));
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function main() {
  try {
    if (fs.existsSync(out)) {
      const cur = fs.readFileSync(out, "utf8");
      if (isGood(cur) && cur.includes("setCrossOrigin") && cur.includes("getHeading")) {
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

    try {
      const parts = [];
      let ok = true;
      for (let i = 0; i < 8; i++) {
        const p = path.join(dir, "gc_parts", `s${i}.txt`);
        if (!fs.existsSync(p)) { ok = false; break; }
        parts.push(fs.readFileSync(p, "utf8"));
      }
      if (ok) {
        let full = parts.join("");
        if (isGood(full)) {
          full = patchAll(full);
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, full);
          console.log("[prebuild] assembled from s0-s7", full.length);
          return;
        }
      }
    } catch (e) {
      console.warn("[prebuild] offline parts failed", e?.message || e);
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

main().then(() => process.exit(0)).catch((e) => {
  console.error("[prebuild] error", e);
  process.exit(0); // NEVER fail the build
});
