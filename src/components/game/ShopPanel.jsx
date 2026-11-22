// @ts-nocheck
import { useEffect, useState } from "react";
import { ArrowUp, Check, Coins, Dumbbell, Gift, Hand, KeyRound, Loader2, Music, RotateCw, Smile, Sparkles, X, Zap, Bird, Wind } from "lucide-react";
import { DASH_EFFECTS, EMOTES, COSMETICS, GOOFY_BOX, getLootPool } from "@/data/shop";
import { useI18n } from "@/lib/i18n";
import { inputState } from "@/lib/game/input";

const CODES_UNLOCK_KEY = "resenha_codes_unlocked";
function readCodesUnlocked() {
  try { return localStorage.getItem(CODES_UNLOCK_KEY) === "1"; } catch { return false; }
}

const ANIM_ICONS = {
  dance: Music, wave: Hand, spin: RotateCw, flex: Dumbbell, hop: ArrowUp, goofy: Smile, troll: Smile,
  moonwalk: RotateCw, robot: Zap, dizzy: RotateCw, cheer: ArrowUp, sneak: Hand, explode: Sparkles,
  floss: Music, chicken: Bird, dab: Hand, panic: Wind, vibe: Smile, yeet: ArrowUp,
};

function itemGlyph(item) {
  if (!item) return "🎁";
  if (item.emoji) return item.emoji;
  if (item.kind === "emote") return "🎭";
  return "✨";
}

function itemLabel(t, item) {
  if (!item) return "";
  const key = `shop.item.${item.id}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return item.name || item.id;
}

function itemHint(t, item) {
  if (!item) return "";
  const key = `shop.hint.${item.id}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return item.hint || "";
}

const RARITY_STYLE = {
  common: { border: "border-white/15", badge: "bg-white/10 text-white/70" },
  rare: { border: "border-sky-400/40", badge: "bg-sky-500/20 text-sky-200" },
  epic: { border: "border-violet-400/45", badge: "bg-violet-500/25 text-violet-200" },
  legendary: { border: "border-amber-400/50", badge: "bg-amber-500/25 text-amber-200" },
  goofy: { border: "border-pink-400/45", badge: "bg-pink-500/25 text-pink-200" },
};

export default function ShopPanel({
  coins, owned, dash, emote, cosmetic, loading, busyId,
  onBuy, onEquip, onOpenGoofyBox, onRedeemCode, onClose,
  initialTab, codesUnlocked: codesUnlockedProp,
}) {
  const { t } = useI18n();
  const [codesUnlocked, setCodesUnlocked] = useState(() => codesUnlockedProp || readCodesUnlocked());
  const [tab, setTab] = useState(() => {
    if (initialTab === "codes" && (codesUnlockedProp || readCodesUnlocked())) return "codes";
    return initialTab && initialTab !== "codes" ? initialTab : "dash";
  });
  const [lastReward, setLastReward] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeMsg, setCodeMsg] = useState(null);
  const [codeErr, setCodeErr] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState([]);
  const [spinIndex, setSpinIndex] = useState(0);

  useEffect(() => { if (codesUnlockedProp) setCodesUnlocked(true); }, [codesUnlockedProp]);
  useEffect(() => { if (initialTab === "codes" && codesUnlocked) setTab("codes"); }, [initialTab, codesUnlocked]);
  useEffect(() => {
    inputState.blocked = true;
    try { document.exitPointerLock?.(); } catch {}
    return () => { inputState.blocked = false; };
  }, []);

  const tabs = [
    { id: "dash", label: t("shop.tab.dash") || "Dash", icon: Zap },
    { id: "emote", label: t("shop.tab.emotes") || "Emotes", icon: Smile },
    { id: "cosmetic", label: t("shop.tab.cosmetics") || "Cosméticos", icon: Sparkles },
    { id: "box", label: t("shop.tab.box") || "Goofy Box", icon: Gift },
    ...(codesUnlocked ? [{ id: "codes", label: t("shop.tab.codes") || "Códigos", icon: KeyRound }] : []),
  ];
  const mine = owned || [];
  const items =
    tab === "dash" ? DASH_EFFECTS.filter((i) => !i.lootOnly || mine.includes(i.id))
    : tab === "emote" ? EMOTES.filter((i) => !i.lootOnly || mine.includes(i.id))
    : tab === "cosmetic" ? COSMETICS.filter((i) => !i.lootOnly || mine.includes(i.id))
    : [];
  const equipped = tab === "dash" ? dash : tab === "emote" ? emote : tab === "cosmetic" ? cosmetic : "";
  const lootOwned = [...DASH_EFFECTS, ...EMOTES, ...COSMETICS].filter((i) => i.lootOnly && mine.includes(i.id));
  const previewStrip = spinItems.length ? spinItems : getLootPool().slice(0, 14);

  async function handleOpenBox() {
    if (!onOpenGoofyBox || busyId === "goofy_box" || spinning) return;
    try {
      const pool = getLootPool();
      if (!pool.length) return;
      const strip = [];
      for (let i = 0; i < 28; i++) strip.push(pool[Math.floor(Math.random() * pool.length)]);
      setSpinItems(strip);
      setSpinIndex(0);
      setSpinning(true);
      setLastReward(null);
      const result = await onOpenGoofyBox();
      if (result?.reward) {
        strip[strip.length - 1] = result.reward;
        setSpinItems([...strip]);
      }
      let i = 0;
      const total = 24 + Math.floor(Math.random() * 3);
      const tick = () => {
        i += 1;
        setSpinIndex(Math.min(i, strip.length - 1));
        if (i < total) setTimeout(tick, 35 + i * i * 1.6);
        else {
          setSpinning(false);
          if (result?.reward) setLastReward(result);
        }
      };
      setTimeout(tick, 40);
    } catch {
      setSpinning(false);
    }
  }

  async function handleRedeem(e) {
    e?.preventDefault?.();
    if (!onRedeemCode || busyId === "redeem_code") return;
    setCodeMsg(null); setCodeErr(null);
    try {
      const result = await onRedeemCode(codeInput);
      if (result?.message) setCodeMsg(result.message);
      setCodeInput("");
    } catch (err) {
      setCodeErr(err?.message || "Error");
    }
  }

  function equippedIdFor(item) {
    if (item.kind === "dash") return dash;
    if (item.kind === "emote") return emote;
    if (item.kind === "cosmetic") return cosmetic;
    return "";
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151523] text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[#ff9620]" />
            <h2 className="font-heading text-base font-black uppercase tracking-wider">{t("shop.title") || "Loja"}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full border border-amber-400/50 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Coins size={13} /> {coins ?? 0}
            </span>
            <button onClick={onClose} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-2">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const active = tab === tabItem.id;
            return (
              <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${active ? "bg-[#ff9620] text-[#0a0a14]" : "border border-white/10 text-white/70 hover:bg-white/5"}`}>
                <Icon size={13} /> {tabItem.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/60">
              <Loader2 size={16} className="animate-spin" /> {t("shop.loading") || "…"}
            </div>
          )}

          {!loading && tab === "codes" && codesUnlocked && (
            <form onSubmit={handleRedeem} className="mx-auto max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#0f0f18] p-4">
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="CODIGO"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm uppercase tracking-widest outline-none focus:border-[#ff9620]" />
              <button type="submit" disabled={busyId === "redeem_code" || !codeInput.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff9620] px-3 py-2 text-sm font-black uppercase text-[#0a0a14] disabled:opacity-50">
                {busyId === "redeem_code" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                Canjear
              </button>
              {codeMsg && <p className="text-center text-xs text-emerald-300">{codeMsg}</p>}
              {codeErr && <p className="text-center text-xs text-rose-300">{codeErr}</p>}
            </form>
          )}

          {!loading && tab === "box" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-orange-500/10 p-5 text-center">
                <div className="relative mx-auto mb-4 h-24 w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a14]">
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-pink-400 shadow-[0_0_12px_#f472b6]" />
                  <div className="flex h-full items-center gap-2 px-2"
                    style={{ transform: `translateX(calc(50% - ${spinIndex * 4.5}rem - 2rem))`, transition: spinning ? "transform 80ms linear" : "transform 200ms ease-out" }}>
                    {previewStrip.map((item, idx) => (
                      <div key={`${idx}-${item?.id || "x"}`}
                        className={"grid h-16 w-16 shrink-0 place-items-center rounded-xl border text-2xl " + (idx === spinIndex ? "scale-110 border-pink-400 bg-pink-500/25" : "border-white/10 bg-white/5")}
                        style={item?.kind === "dash" ? { background: `linear-gradient(135deg, ${item.a}66, ${item.b}66)` } : item?.glow ? { boxShadow: `0 0 14px ${item.glow}55` } : undefined}>
                        {itemGlyph(item)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-orange-400 text-2xl">🎁</div>
                <h3 className="text-lg font-black uppercase tracking-wide">{t("shop.goofy.title") || "Goofy Box"}</h3>
                <p className="mt-1 text-xs text-white/60">{t("shop.goofy.desc") || "Dash, emote ou cosmético único"}</p>
                <button onClick={handleOpenBox} disabled={busyId === "goofy_box" || spinning || (coins ?? 0) < GOOFY_BOX.price}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-black uppercase text-white disabled:opacity-50">
                  {busyId === "goofy_box" || spinning ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                  {spinning ? (t("shop.goofy.spinning") || "Girando…") : (t("shop.goofy.open") || "Abrir")} · {GOOFY_BOX.price}
                  <Coins size={14} />
                </button>
              </div>
              {lastReward?.reward && !spinning && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{t("shop.goofy.got") || "Você ganhou"}</p>
                  <div className="mt-2 text-3xl">{itemGlyph(lastReward.reward)}</div>
                  <p className="mt-1 text-base font-bold">{itemLabel(t, lastReward.reward)}</p>
                  {lastReward.duplicate && <p className="mt-1 text-[11px] text-white/50">{t("shop.goofy.dup")}</p>}
                </div>
              )}
              {lootOwned.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">{t("shop.goofy.owned") || "Seus drops"}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {lootOwned.map((item) => {
                      const isEquipped = equippedIdFor(item) === item.id;
                      const AnimIcon = item.kind === "emote" ? ANIM_ICONS[item.anim] || Smile : null;
                      return (
                        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f0f18] p-2.5">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg"
                            style={{ background: item.kind === "dash" ? `linear-gradient(135deg, ${item.a}, ${item.b})` : "#1a1a28", boxShadow: item.glow ? `0 0 12px ${item.glow}44` : undefined }}>
                            {item.kind === "dash" || item.kind === "cosmetic" ? item.emoji : AnimIcon ? <AnimIcon size={16} className="text-pink-400" /> : "🎭"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{itemLabel(t, item)}</p>
                            {isEquipped ? (
                              <span className="text-[10px] text-emerald-400">{t("shop.equipped") || "Equipado"}</span>
                            ) : (
                              <button onClick={() => onEquip(item.id)} className="text-[10px] font-semibold text-[#ff9620] hover:underline">{t("shop.equip") || "Equipar"}</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && tab !== "box" && tab !== "codes" && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const isOwned = mine.includes(item.id);
                const isEquipped = equipped === item.id;
                const busy = busyId === item.id;
                const AnimIcon = item.kind === "emote" ? ANIM_ICONS[item.anim] || Smile : null;
                const rarity = RARITY_STYLE[item.rarity] || RARITY_STYLE.common;
                return (
                  <div key={item.id}
                    className={"flex items-center gap-3 rounded-xl border p-3 " + (item.kind === "cosmetic" ? rarity.border + " bg-[#0f0f18]" : item.lootOnly ? "border-pink-400/30 bg-[#1a1220]" : "border-white/10 bg-[#0f0f18]")}>
                    <span className={"grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl " + (item.kind === "cosmetic" ? "bg-black/40 ring-1 ring-white/10" : item.lootOnly ? "bg-pink-500/20" : "bg-white/5")}
                      style={item.kind === "dash" ? { background: `linear-gradient(135deg, ${item.a}, ${item.b})` } : item.kind === "cosmetic" && item.glow ? { boxShadow: `0 0 18px ${item.glow}66, inset 0 0 12px ${item.glow}22` } : undefined}>
                      {item.kind === "dash" || item.kind === "cosmetic" ? (item.emoji || "✨") : AnimIcon ? <AnimIcon size={22} className={item.lootOnly ? "text-pink-400" : "text-[#ff9620]"} /> : "🎭"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold">{itemLabel(t, item)}</p>
                        {item.kind === "cosmetic" && item.rarity && (
                          <span className={"shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider " + rarity.badge}>
                            {t(`shop.rarity.${item.rarity}`) || item.rarity}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-white/45">
                        {itemHint(t, item) || item.kind}
                        {item.lootOnly && <span className="ml-1 text-pink-300">· Goofy</span>}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {isEquipped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><Check size={13} /> {t("shop.equipped") || "Equipado"}</span>
                        ) : isOwned ? (
                          <button onClick={() => onEquip(item.id)} disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#ff9620]/50 px-2 py-0.5 text-[11px] font-bold text-[#ff9620] hover:bg-[#ff9620]/10">
                            {busy && <Loader2 size={12} className="animate-spin" />} {t("shop.equip") || "Equipar"}
                          </button>
                        ) : item.lootOnly ? (
                          <span className="text-[11px] text-white/40">{t("shop.goofy.only") || "Só na Goofy Box"}</span>
                        ) : (
                          <button onClick={() => onBuy(item.id)} disabled={busy || (coins ?? 0) < item.price}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#ff9620] px-2 py-0.5 text-[11px] font-black text-[#0a0a14] disabled:opacity-40">
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <Coins size={12} />}
                            {item.price}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-white/40">{t("shop.empty") || "Nada por aquí"}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
