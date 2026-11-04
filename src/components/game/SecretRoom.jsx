// @ts-nocheck
import { useState } from "react";
import { Download, KeyRound, Loader2, Lock, Unlock, X } from "lucide-react";
import { buildSourceZip, sourceFileList } from "@/lib/game/backup";
import { useI18n } from "@/lib/i18n";

const PASSWORD = "f3l1f0rg3_12#$";

export default function SecretRoom({ onClose }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const total = sourceFileList().length;

  function unlock(e) {
    e.preventDefault();
    if (value === PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  async function download() {
    setBusy(true);
    setDone(0);
    try {
      const { blob, count } = await buildSourceZip((loaded) => setDone(loaded));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resenha-shenanigans-backup.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDone(count);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#ff9620]/35 bg-[#0f0f18] p-5 text-white shadow-[0_30px_90px_-20px_rgba(255,150,31,0.35)]">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {unlocked ? <Unlock size={18} className="text-emerald-400" /> : <Lock size={18} className="text-[#ff9620]" />}
            <h2 className="font-heading text-base font-black uppercase tracking-[0.2em]">{t("secret.title")}</h2>
          </div>
          <button onClick={onClose} aria-label={t("secret.close")} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {!unlocked && (
          <form onSubmit={unlock} className="flex flex-col gap-3">
            <p className="text-xs text-white/50">{t("secret.subtitle")}</p>
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2">
              <KeyRound size={15} className="shrink-0 text-[#ff9620]" />
              <input
                type="password"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(false); }}
                placeholder={t("secret.password")}
                autoFocus
                className="w-full bg-transparent text-sm tracking-wide text-white outline-none placeholder:text-white/30"
              />
            </div>
            {error && <p className="text-xs font-semibold text-red-400">{t("secret.wrong")}</p>}
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-[#ff9620] to-[#ff3b2f] px-4 py-2 text-sm font-bold text-[#0a0a14] hover:brightness-110"
            >
              {t("secret.enter")}
            </button>
          </form>
        )}

        {unlocked && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("secret.unlocked")}</p>
            <p className="text-xs text-white/50">{t("secret.note")}</p>
            <button
              onClick={download}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff9620] to-[#ff3b2f] px-4 py-2.5 text-sm font-bold text-[#0a0a14] hover:brightness-110 disabled:opacity-70"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {busy ? t("secret.building") : t("secret.download")}
            </button>
            <p className="text-center text-[11px] text-white/40">
              {done > 0 ? t("secret.ready", { n: done }) : t("secret.files", { n: total })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}