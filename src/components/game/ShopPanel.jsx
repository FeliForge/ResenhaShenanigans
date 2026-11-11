// @ts-nocheck
import { useEffect, useState } from "react";
import { ArrowUp, Check, Coins, Dumbbell, Gift, Hand, Loader2, Music, RotateCw, Smile, X, Zap } from "lucide-react";
import { DASH_EFFECTS, EMOTES, GOOFY_BOX } from "@/data/shop";
import { useI18n } from "@/lib/i18n";
import { inputState } from "@/lib/game/input";

const ANIM_ICONS = { dance: Music, wave: Hand, spin: RotateCw, flex: Dumbbell, hop: ArrowUp };

export default function ShopPanel({ coins, owned, dash, emote, loading, busyId, onBuy, onEquip, onOpenGoofyBox, onClose }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("dash");
  const [lastReward, setLastReward] = useState(null);
  const tabs = [
    { id: "dash", label: t("shop.tab.dash"), icon: Zap },
    { id: "emote", label: t("shop.tab.emotes"), icon: Smile },
    { id: "box", label: t("shop.tab.box"), icon: Gift },
  ];
  const items = tab === "dash" ? DASH_EFFECTS.filter((i) => !i.lootOnly) : tab === "emote" ? EMOTES.filter((i) => !i.lootOnly) : [];
  const equipped = tab === "dash" ? dash : emote;
  const mine = owned || [];
  const lootOwned = [...DASH_EFFECTS, ...EMOTES].filter((i) => i.lootOnly && mine.includes(i.id));

  useEffect(() => {
    inputState.blocked = true;
    try { document.exitPointerLock?.(); } catch {}
    return () => { inputState.blocked = false; };
  }, []);

  async function handleOpenBox() {
    if (!onOpenGoofyBox || busyId === "goofy_box") return;
    try {
      const result = await onOpenGoofyBox();
      if (result?.reward) setLastReward(result);
    } catch {}
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151523] text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[#ff9620]" />
            <h2 className="font-heading text-base font-black uppercase tracking-wider">{t("shop.title")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full border border-amber-400/50 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Coins size={13} /> {coins ?? 0}
            </span>
            <button onClick={onClose} aria-label={t("shop.close")} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex gap-2 border-b border-white/10 px-4 py-2">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const active = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  active ? "bg-[#ff9620] text-[#0a0a14]" : "border border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                <Icon size={13} /> {tabItem.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/60">
              <Loader2 size={16} className="animate-spin" /> {t("shop.loading")}
            </div>
          )}

          {!loading && tab === "box" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-pink-400/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-orange-500/10 p-5 text-center">
                <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-orange-400 text-4xl shadow-lg">
                  🎁
                </div>
                <h3 className="text-lg font-black uppercase tracking-wide text-white">{t("shop.goofy.title")}</h3>
                <p className="mt-1 text-xs text-white/60">{t("shop.goofy.desc")}</p>
                <button
                  onClick={handleOpenBox}
                  disabled={busyId === "goofy_box" || (coins ?? 0) < GOOFY_BOX.price}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-black text-[#0a0a14] hover:brightness-110 disabled:opacity-50"
                >
                  {busyId === "goofy_box" ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                  {t("shop.goofy.open")} · {GOOFY_BOX.price}
                  <Coins size={14} />
                </button>
              </div>

              {lastReward?.reward && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{t("shop.goofy.got")}</p>
                  <p className="mt-1 text-base font-bold text-white">{t(`shop.item.${lastReward.reward.id}`)}</p>
                  {lastReward.duplicate && <p className="mt-1 text-[11px] text-white/50">{t("shop.goofy.dup")}</p>}
                </div>
              )}

              {lootOwned.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">{t("shop.goofy.owned")}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {lootOwned.map((item) => {
                      const isEquipped = (item.kind === "dash" ? dash : emote) === item.id;
                      const AnimIcon = item.kind === "emote" ? ANIM_ICONS[item.anim] || Smile : null;
                      return (
                        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f0f18] p-2.5">
                          <span
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg"
                            style={{
                              background: item.kind === "dash" ? `linear-gradient(135deg, ${item.a}, ${item.b})` : "#1a1a28",
                            }}
                          >
                            {item.kind === "dash" ? item.emoji : <AnimIcon size={16} className="text-pink-400" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{t(`shop.item.${item.id}`)}</p>
                            {isEquipped ? (
                              <span className="text-[10px] text-emerald-400">{t("shop.equipped")}</span>
                            ) : (
                              <button onClick={() => onEquip(item.id)} className="text-[10px] font-semibold text-[#ff9620] hover:underline">
                                {t("shop.equip")}
                              </button>
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

          {!loading && tab !== "box" && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const isOwned = mine.includes(item.id);
                const isEquipped = equipped === item.id;
                const busy = busyId === item.id;
                const AnimIcon = item.kind === "emote" ? ANIM_ICONS[item.anim] || Smile : null;
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f0f18] p-3">
                    <span
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-2xl"
                      style={{
                        background:
                          item.kind === "dash"
                            ? `linear-gradient(135deg, ${item.a}, ${item.b})`
                            : "radial-gradient(circle at 50% 40%, #2a2a3a, #0f0f18)",
                        boxShadow: item.kind === "dash" ? `0 0 18px -6px ${item.a}` : "none",
                      }}
                    >
                      {item.kind === "dash" ? item.emoji : <AnimIcon size={22} className="text-[#ff9620]" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{t(`shop.item.${item.id}`)}</h3>
                      <p className="text-[11px] text-white/50">
                        {item.kind === "dash" ? t("shop.dashDesc") : t(`shop.hint.${item.id}`)}
                      </p>

                      <div className="mt-1.5">
                        {isEquipped ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <Check size={13} /> {t("shop.equipped")}
                          </span>
                        ) : isOwned ? (
                          <button
                            onClick={() => onEquip(item.id)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg border border-[#ff9620]/50 px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#ff9620]/10 disabled:opacity-60"
                          >
                            {busy && <Loader2 size={12} className="animate-spin" />} {t("shop.equip")}
                          </button>
                        ) : (
                          <button
                            onClick={() => onBuy(item.id)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#ff9620] to-[#ff3b2f] px-2.5 py-1 text-xs font-bold text-[#0a0a14] hover:brightness-110 disabled:opacity-60"
                          >
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <Coins size={12} />} {item.price}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="border-t border-white/10 px-4 py-2 text-[11px] text-white/45">{t("shop.footer")}</p>
      </div>
    </div>
  );
}
