// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, Check, Wrench, Shield } from "lucide-react";
import { CHARACTERS } from "@/data/characters";
import CharacterWorkshop from "@/components/game/CharacterWorkshop";
import { getArchetype, getPassive } from "@/data/movesets";
import { useI18n } from "@/lib/i18n";

export default function CharacterSelect({ onConfirm, onBack }) {
  const { t, character: localChar, move: localMove } = useI18n();
  const [selectedId, setSelectedId] = useState(CHARACTERS[0].id);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const selected = CHARACTERS.find((c) => c.id === selectedId);
  const info = localChar(selected) || selected;
  const archetype = getArchetype(selected.id);
  const passive = getPassive(selected.id);

  return (
    <div className="absolute inset-0 flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft size={18} /> {t("common.back")}
        </button>
        <h1 className="font-heading text-lg font-bold tracking-tight">{t("select.title")}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Lista */}
        <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:w-1/2 lg:grid-cols-2">
          <button
            onClick={() => setShowWorkshop(true)}
            className="col-span-full flex items-center gap-3 rounded-lg border border-dashed border-primary p-2 text-left transition hover:bg-accent/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold">Character Workshop</span>
              <span className="block text-xs text-muted-foreground">
                Appearance · Moveset · Ultimate
              </span>
            </span>
          </button>
          {CHARACTERS.map((c) => {
            const active = c.id === selectedId;
            const localized = localChar(c) || c;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${
                  active ? "border-primary bg-accent" : "border-border hover:bg-accent/60"
                }`}
              >
                <span
                  className="h-10 w-10 shrink-0 rounded-md"
                  style={{
                    background: `linear-gradient(135deg, ${c.colors.primary}, ${c.colors.secondary})`,
                    boxShadow: `inset 0 0 0 2px ${c.colors.accent}`,
                  }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{localized.displayName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t(`arch.${getArchetype(c.id)}`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div className="flex flex-col gap-4 overflow-y-auto border-t border-border p-4 lg:w-1/2 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-4">
            <div
              className="h-20 w-16 rounded-md"
              style={{
                background: `linear-gradient(160deg, ${selected.colors.primary}, ${selected.colors.secondary})`,
                boxShadow: `inset 0 0 0 3px ${selected.colors.accent}`,
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl font-bold">{info.displayName}</h2>
                <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {t(`arch.${archetype}`)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{info.bio}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={t("select.stats.health")} value={selected.stats.health} />
            <Stat label={t("select.stats.speed")} value={selected.stats.speed} />
            <Stat label={t("select.stats.jump")} value={selected.stats.jumpForce} />
            <Stat label={t("select.stats.weight")} value={selected.stats.weight} />
          </div>

          {passive && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
              <Shield size={14} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold uppercase tracking-wider">{t("select.passive")}: </span>
                {t(`passive.${passive.type}`) || ""}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{t("select.moves")}</h3>
            {Object.entries(selected.moves).map(([category, base]) => {
              const m = localMove(selected.id, category, base);
              return (
                <div key={m.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {category === "ultimate" ? "ULT" : category.toUpperCase()} ·{" "}
                      {t("select.dmg", { n: m.damage })}
                    </span>
                  </div>
                  {m.desc && <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onConfirm(selected)}
            className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            <Check size={18} /> {t("select.confirm")}
          </button>
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

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-lg font-bold">{value}</div>
    </div>
  );
}
