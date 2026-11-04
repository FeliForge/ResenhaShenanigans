// @ts-nocheck
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PT } from "./pt";
import { EN } from "./en";
import { localChar, localMove } from "@/data/characters-i18n";

const DICTS = { pt: PT, en: EN };
const STORAGE_KEY = "resenha_lang";
export const LANGS = ["pt", "en"];

const I18nContext = createContext({ lang: "pt", setLang: () => {}, t: (k) => k });

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "pt" || raw === "en") return raw;
  } catch { /* sin acceso a storage */ }
  return null;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("pt");

  useEffect(() => {
    const stored = readStored();
    if (stored) setLangState(stored);
  }, []);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* preferencia solo en memoria */ }
  }, []);

  const t = useCallback((key, vars) => {
    const dict = DICTS[lang] || PT;
    let str = dict[key] ?? EN[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        str = str.split(`{${name}}`).join(String(value));
      }
    }
    return str;
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t,
    character: (c) => localChar(lang, c),
    move: (characterId, category, move) => localMove(lang, characterId, category, move),
    shopName: (item) => t(`shop.item.${item.id}`) || item.name,
  }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}