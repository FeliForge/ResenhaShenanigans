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

function patchSpawn(text) {
  if (text.includes("player.position.set(0, 14, 0)")) return text;
  if (text.includes("player.position.set(0, 1.6, 0)")) {
    text = text.replace("player.position.set(0, 1.6, 0)", "player.position.set(0, 14, 0)");
  } else {
    console.warn("[prebuild] spawn init pattern not found");
  }
  if (text.includes("onGround: true, meter: 0")) {
    text = text.replace("onGround: true, meter: 0", "onGround: false, meter: 0");
  }
  if (text.includes("game.player.position.set(RESPAWN_POINT.x, RESPAWN_POINT.y, RESPAWN_POINT.z);\n      game.velocity.set(0, 0, 0);")) {
    text = text.replace(
      "game.player.position.set(RESPAWN_POINT.x, RESPAWN_POINT.y, RESPAWN_POINT.z);\n      game.velocity.set(0, 0, 0);",
      "game.player.position.set(RESPAWN_POINT.x, RESPAWN_POINT.y, RESPAWN_POINT.z);\n      game.velocity.set(0, 0, 0);\n      game.onGround = false;"
    );
  }
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

  if (text.includes("onNearShop, onRequestShop, onDefeat, onRespawn, onFeed")) {
    text = text.replace(
      "onNearShop, onRequestShop, onDefeat, onRespawn, onFeed",
      "onNearShop, onRequestShop, onNearHub, onRequestHub, onDefeat, onRespawn, onFeed"
    );
  }

  if (text.includes("const onRequestShopRef = useRef(onRequestShop);\n  onRequestShopRef.current = onRequestShop;")) {
    text = text.replace(
      "const onRequestShopRef = useRef(onRequestShop);\n  onRequestShopRef.current = onRequestShop;",
      "const onRequestShopRef = useRef(onRequestShop);\n  onRequestShopRef.current = onRequestShop;\n  const onNearHubRef = useRef(onNearHub);\n  onNearHubRef.current = onNearHub;\n  const onRequestHubRef = useRef(onRequestHub);\n  onRequestHubRef.current = onRequestHub;"
    );
  }

  if (text.includes("const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);")) {
    text = text.replace(
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);",
      "const shop = buildShop(scene);\n    city.colliders.push(...shop.colliders);\n    const hub = buildHub(scene);\n    city.colliders.push(...hub.colliders);"
    );
  }

  if (text.includes('if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }')) {
    text = text.replace(
      'if (e.code === "KeyE" && game.nearShop) { onRequestShopRef.current?.(); return; }',
      'if (e.code === "KeyE") {\n        if (game.nearHub) { onRequestHubRef.current?.(game.nearHub); return; }\n        if (game.nearShop) { onRequestShopRef.current?.(); return; }\n      }'
    );
  }

  const oldNear = `      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;
      if (nearShop !== game.nearShop) {
        game.nearShop = nearShop;
        onNearShopRef.current?.(nearShop);
      }`;
  const newNear = `      const nearShop = game.player.position.distanceTo(shop.position) < shop.radius;
      if (nearShop !== game.nearShop) {
        game.nearShop = nearShop;
        onNearShopRef.current?.(nearShop);
      }
      let hubKind = null;
      for (const z of hub.zones) {
        if (game.player.position.distanceTo(z.position) < z.radius) { hubKind = z.kind; break; }
      }
      if (hubKind !== game.nearHub) {
        game.nearHub = hubKind;
        onNearHubRef.current?.(hubKind);
      }`;
  if (text.includes(oldNear)) text = text.replace(oldNear, newNear);
  else console.warn("[prebuild] nearShop block not found for hub patch");

  if (text.includes("shop.setNight(nightFactor);") && !text.includes("hub.setNight")) {
    text = text.replace("shop.setNight(nightFactor);", "shop.setNight(nightFactor);\n      hub.setNight(nightFactor);");
  }
  if (text.includes("shop.update(now);") && !text.includes("hub.update")) {
    text = text.replace("shop.update(now);", "shop.update(now);\n      hub.update(now);");
  }
  if (text.includes("shop.dispose();") && !text.includes("hub.dispose")) {
    text = text.replace("shop.dispose();", "shop.dispose();\n      hub.dispose();");
  }

  return text;
}

function patchAll(text) {
  return patchHub(patchSpawn(patchCompass(patchBillboards(text))));
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/** Assemble billboard JPEGs from scripts/bb_data/*.b64 into public/billboards/ */
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
      if (isGood(cur) && cur.includes("setCrossOrigin") && cur.includes("getHeading") && cur.includes("player.position.set(0, 14, 0)") && cur.includes("buildHub")) {
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
  process.exit(0);
});
