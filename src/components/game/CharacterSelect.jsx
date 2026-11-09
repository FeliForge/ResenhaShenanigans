// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Check,
  Wrench,
  Shield,
  Zap,
  Heart,
  Gauge,
  Mountain,
  Sparkles,
  Star,
} from "lucide-react";
import { CHARACTERS } from "@/data/characters";
import CharacterWorkshop from "@/components/game/CharacterWorkshop";
import { getArchetype, getPassive } from "@/data/movesets";
import { useI18n } from "@/lib/i18n";

const ARCH_STYLES = {
  rush: { ring: "from-cyan-400 to-fuchsia-500", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40" },
  tank: { ring: "from-amber-500 to-orange-700", badge: "bg-amber-500/20 text-amber-200 border-amber-400/40" },
  range: { ring: "from-yellow-300 to-sky-500", badge: "bg-sky-500/20 text-sky-200 border-sky-400/40" },
  trick: { ring: "from-violet-400 to-slate-600", badge: "bg-violet-500/20 text-violet-200 border-violet-400/40" },
  control: { ring: "from-sky-200 to-blue-600", badge: "bg-blue-500/20 text-blue-200 border-blue-400/40" },
  balanced: { ring: "from-rose-400 to-red-600", badge: "bg-rose-500/20 text-rose-200 border-rose-400/40" },
};

const CAT_SHORT = {
  m1: "M1",
  special1: "M2",
  special2: "M3",
  special3: "M4",
  ultimate: "ULT",
};

export default function CharacterSelect({ onConfirm, onBack }) {
  const { t, character: localChar, move: localMove } = useI18n();
  const [selectedId, setSelectedId] = useState(CHARACTERS[0].id);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const selected = CHARACTERS.find((c) => c.id === selectedId) || CHARACTERS[0];
  const info = localChar(selected) || selected;
  const archetype = getArchetype(selected.id);
  const passive = getPassive(selected.id);
  const archStyle = ARCH_STYLES[archetype] || ARCH_STYLES.balanced;

  const filtered = useMemo(() => {
    if (filter === "all") return CHARACTERS;
    return CHARACTERS.filter((c) => getArchetype(c.id) === filter);
  }, [filter]);

  const filters = [
    { id: "all", label: t("select.filter.all") || "Todos" },
    { id: "rush", label: "Rush" },
    { id: "tank", label: "Tank" },
    { id: "range", label: "Range" },
    { id: "trick", label: "Trick" },
    { id: "control", label: "Control" },
    { id: "balanced", label: "Balanced" },
  ];

  const passiveText =
    !passive
      ? ""
      : typeof passive === "string"
        ? passive
        : t(`passive.${passive.type}`) || String(passive.type || "");

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#06080f] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 20% 10%, ${selected.colors.primary}33, transparent 55%),
                       radial-gradient(ellipse 60% 40% at 80% 80%, ${selected.colors.secondary}22, transparent 50%)`,
        }}
      />

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-white/10 bg-black/40 px-3 py-2.5 backdrop-blur-md sm:px-5">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-lg font-bold tracking-tight">{t("select.title")}</h1>
          <p className="truncate text-xs text-white/45">{info.name || selected.name}</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                filter === f.id
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowWorkshop(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
        >
          <Wrench size={14} /> <span className="hidden sm:inline">Workshop</span>
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:flex-row sm:gap-4 sm:p-5">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto sm:max-w-[42%]">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  filter === f.id
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/10 bg-white/5 text-white/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const active = c.id === selectedId;
              const localized = localChar(c) || c;
              const arch = getArchetype(c.id);
              const style = ARCH_STYLES[arch] || ARCH_STYLES.balanced;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    if (isTouch) onConfirm(c);
                  }}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition ${
                    active
                      ? "border-white/40 bg-white/10 shadow-lg shadow-black/40 ring-1 ring-white/20"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  <div
                    className="relative h-16 w-full"
                    style={{
                      background: `linear-gradient(135deg, ${c.colors.primary}, ${c.colors.secondary})`,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        background: `radial-gradient(circle at 30% 20%, ${c.colors.accent}, transparent 55%)`,
                      }}
                    />
                    <span className={`absolute left-1.5 top-1.5 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${style.badge}`}>
                      {arch}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2">
                    <span className="truncate text-xs font-bold">{localized.name || c.name}</span>
                    <Star size={14} className="ml-auto shrink-0 text-amber-300 opacity-70 group-hover:opacity-100" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/35 backdrop-blur-md">
          <div
            className="relative flex shrink-0 flex-col items-center gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-end sm:gap-5 sm:p-5"
            style={{
              background: `linear-gradient(160deg, ${selected.colors.primary}55 0%, transparent 70%),
                           linear-gradient(to bottom, ${selected.colors.secondary}22, transparent)`,
            }}
          >
            <div
              className="relative h-28 w-28 shrink-0 rounded-2xl sm:h-36 sm:w-36"
              style={{
                backgroundImage: `linear-gradient(160deg, ${selected.colors.primary}, ${selected.colors.secondary})`,
                boxShadow: `0 12px 40px ${selected.colors.primary}55, inset 0 0 0 3px ${selected.colors.accent}`,
              }}
            >
              <div
                className="absolute inset-2 rounded-xl opacity-50"
                style={{
                  background: `linear-gradient(160deg, ${selected.colors.primary}, ${selected.colors.secondary})`,
                  boxShadow: `inset 0 0 0 3px ${selected.colors.accent}88`,
                }}
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className={`mb-1 inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${archStyle.badge}`}>
                {archetype}
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{info.name || selected.name}</h2>
              <p className="mt-1 text-sm text-white/55">{info.tagline || selected.tagline || ""}</p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat icon={<Heart size={14} className="text-rose-400" />} label={t("select.stats.health")} value={selected.stats.health} />
              <Stat icon={<Gauge size={14} className="text-cyan-400" />} label={t("select.stats.speed")} value={selected.stats.speed} />
              <Stat icon={<Zap size={14} className="text-amber-300" />} label={t("select.stats.jump")} value={selected.stats.jumpForce} />
              <Stat icon={<Mountain size={14} className="text-stone-300" />} label={t("select.stats.weight")} value={selected.stats.weight} />
            </div>

            {passiveText && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <p className="text-sm text-white/80">
                  <span className="font-bold uppercase tracking-wider text-emerald-300">{t("select.passive")}: </span>
                  {passiveText}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">{t("select.moves")}</h3>
              <div className="mt-2 space-y-2">
                {Object.entries(selected.moves || {}).map(([category, base]) => {
                  const m = localMove(selected.id, category, base) || base || {};
                  const name = typeof m.name === "string" ? m.name : (base?.name || category);
                  const desc = typeof m.desc === "string" ? m.desc : (base?.desc || "");
                  const damage = typeof m.damage === "number" ? m.damage : (base?.damage ?? "?");
                  return (
                    <div key={category} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-white/70">
                          {CAT_SHORT[category] || category}
                        </span>
                        <span className="text-sm font-semibold">{name}</span>
                        <span className="ml-auto text-[11px] text-white/40">
                          {t("select.dmg", { n: damage })}
                        </span>
                      </div>
                      {desc ? <p className="mt-1 text-xs leading-relaxed text-white/45">{desc}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => onConfirm(selected)}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white to-white/90 px-4 py-3.5 text-base font-bold text-black shadow-lg shadow-white/10 transition hover:opacity-95 active:scale-[0.98]"
            >
              <Check size={18} /> {t("select.confirm")}
            </button>
          </div>
        </div>
      </div>

      {showWorkshop && (
        <CharacterWorkshop
          onConfirm={(c) => {
            setShowWorkshop(false);
            onConfirm(c);
          }}
          onCancel={() => setShowWorkshop(false)}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-white/50">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
