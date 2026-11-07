// @ts-nocheck
import { useMemo, useState } from "react";
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
    { id: "all", label: "Todos" },
    { id: "rush", label: t("arch.rush") },
    { id: "tank", label: t("arch.tank") },
    { id: "range", label: t("arch.range") },
    { id: "trick", label: t("arch.trick") },
    { id: "control", label: t("arch.control") },
    { id: "balanced", label: t("arch.balanced") },
  ];

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#0a0b12] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 20% 10%, ${selected.colors.primary}33, transparent 55%),
                       radial-gradient(ellipse 60% 40% at 80% 80%, ${selected.colors.secondary}22, transparent 50%)`,
        }}
      />

      <header className="relative z-10 flex items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={18} /> {t("common.back")}
        </button>
        <div className="flex flex-1 items-center gap-2">
          <Sparkles size={16} className="text-amber-300" />
          <h1 className="font-heading text-lg font-bold tracking-tight">{t("select.title")}</h1>
        </div>
        <span className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:inline">
          {CHARACTERS.length} luchadores
        </span>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-col border-b border-white/10 lg:w-[46%] lg:border-b-0 lg:border-r">
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5 scrollbar-none">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  filter === f.id
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0">
            <button
              onClick={() => setShowWorkshop(true)}
              className="group mb-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-amber-400/50 bg-gradient-to-r from-amber-500/10 to-fuchsia-500/10 p-3 text-left transition hover:border-amber-300 hover:from-amber-500/20 hover:to-fuchsia-500/20"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-fuchsia-500 text-black shadow-lg shadow-amber-500/20">
                <Wrench size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">Character Workshop</span>
                <span className="block text-xs text-white/55">
                  Apariencia · Moveset · Sprites de ataque · Ultimate
                </span>
              </span>
              <Star size={16} className="ml-auto shrink-0 text-amber-300 opacity-70 group-hover:opacity-100" />
            </button>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => {
                const active = c.id === selectedId;
                const localized = localChar(c) || c;
                const arch = getArchetype(c.id);
                const style = ARCH_STYLES[arch] || ARCH_STYLES.balanced;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
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
                      {active && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5">
                      <span className="truncate text-sm font-semibold leading-tight">{localized.displayName}</span>
                      <span
                        className={`w-fit rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                      >
                        {t(`arch.${arch}`)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div
            className="relative flex items-end gap-5 px-5 pb-5 pt-8"
            style={{
              background: `linear-gradient(160deg, ${selected.colors.primary}55 0%, transparent 70%),
                           linear-gradient(to bottom, ${selected.colors.secondary}22, transparent)`,
            }}
          >
            <div
              className={`relative h-28 w-24 shrink-0 rounded-2xl bg-gradient-to-br p-[3px] shadow-2xl ${archStyle.ring}`}
              style={{
                backgroundImage: `linear-gradient(160deg, ${selected.colors.primary}, ${selected.colors.secondary})`,
                boxShadow: `0 12px 40px ${selected.colors.primary}55, inset 0 0 0 3px ${selected.colors.accent}`,
              }}
            >
              <div
                className="h-full w-full rounded-[13px]"
                style={{
                  background: `linear-gradient(160deg, ${selected.colors.primary}, ${selected.colors.secondary})`,
                  boxShadow: `inset 0 0 0 3px ${selected.colors.accent}88`,
                }}
              />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{info.displayName}</h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${archStyle.badge}`}>
                  {t(`arch.${archetype}`)}
                </span>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-white/65">{info.bio}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-5 pb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat icon={<Heart size={14} className="text-rose-400" />} label={t("select.stats.health")} value={selected.stats.health} />
              <Stat icon={<Gauge size={14} className="text-cyan-400" />} label={t("select.stats.speed")} value={selected.stats.speed} />
              <Stat icon={<Zap size={14} className="text-amber-300" />} label={t("select.stats.jump")} value={selected.stats.jumpForce} />
              <Stat icon={<Mountain size={14} className="text-stone-300" />} label={t("select.stats.weight")} value={selected.stats.weight} />
            </div>

            {passive && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
                <Shield size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                <span>
                  <span className="font-bold uppercase tracking-wider text-emerald-300">{t("select.passive")}: </span>
                  {t(`passive.${passive.type}`) || ""}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">{t("select.moves")}</h3>
              <div className="grid gap-2">
                {Object.entries(selected.moves).map(([category, base]) => {
                  const m = localMove(selected.id, category, base);
                  const isUlt = category === "ultimate";
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border px-3.5 py-2.5 transition ${
                        isUlt
                          ? "border-amber-400/35 bg-gradient-to-r from-amber-500/15 to-fuchsia-500/10"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-wide ${
                              isUlt ? "bg-amber-400 text-black" : "bg-white/10 text-white/70"
                            }`}
                          >
                            {CAT_SHORT[category] || category}
                          </span>
                          <span className="text-sm font-semibold">{m.name}</span>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-white/45">
                          {t("select.dmg", { n: m.damage })}
                        </span>
                      </div>
                      {m.desc && <p className="mt-1 text-xs leading-relaxed text-white/45">{m.desc}</p>}
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
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
        {icon}
        {label}
      </div>
      <div className="font-heading text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
